"use client"

import { useEffect, useState, useMemo } from "react"
import Card from "@/src/app/components/Card"
import Table from "@/src/app/components/Table"
import toast from "react-hot-toast"
import { parseJatosZip } from "@/src/lib/jatos/api/parseJatosZip"
import { fetchResultsBlob } from "@/src/lib/jatos/api/fetchResultsBlob"
import { JatosMetadata, JatosStudyProperties, EnrichedJatosStudyResult } from "@/src/types/jatos"
import { matchJatosDataToMetadata } from "@/src/lib/jatos/api/matchJatosDataToMetadata"
import { getComponentMap } from "@/src/lib/jatos/api/getComponentMap"
import cn from "classnames"
import FilterComponent from "./FilterComponent"
import DownloadResultsButton from "./DownloadResultsButton"

interface ResultsCardProps {
  jatosStudyId: number
  metadata: JatosMetadata
  properties: JatosStudyProperties
}

export default function ResultsCard({ jatosStudyId, metadata, properties }: ResultsCardProps) {
  const [enrichedResults, setEnrichedResults] = useState<EnrichedJatosStudyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedComponentUuids, setSelectedComponentUuids] = useState<string[]>(
    properties.components?.map((c) => c.uuid) ?? []
  )

  // ✅ Define DaisyUI colors
  const colorClasses = [
    "status-primary",
    "status-secondary",
    "status-accent",
    "status-info",
    "status-success",
    "status-warning",
    "status-error",
  ]

  // ✅ Build a single unified component map with colors
  const componentsWithColors = useMemo(() => {
    const baseMap = getComponentMap(properties)
    return baseMap.map((c, i) => ({
      uuid: c.uuid,
      title: c.title,
      colorClass: colorClasses[i % colorClasses.length],
    }))
  }, [properties])

  const componentColorMap = useMemo(() => {
    return componentsWithColors.reduce(
      (acc, c) => ({ ...acc, [c.uuid]: c.colorClass }),
      {} as Record<string, string>
    )
  }, [componentsWithColors])

  const fetchResults = async () => {
    setLoading(true)
    setError(null)
    try {
      const blob = await fetchResultsBlob(jatosStudyId)
      const files = await parseJatosZip(blob)
      const enriched = matchJatosDataToMetadata(metadata, files)
      setEnrichedResults(enriched)
      toast.success("Results loaded successfully")
    } catch (err: any) {
      console.error(err)
      setError(err.message)
      toast.error("Failed to fetch results")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [jatosStudyId])

  // ✅ Build table data (filtered by selected components)
  const tableData = useMemo(() => {
    if (!enrichedResults?.length) return []

    return enrichedResults.map((studyResult) => {
      const row: Record<string, any> = {
        participant: studyResult.comment || `#${studyResult.id}`,
      }

      studyResult.componentResults.forEach((component) => {
        if (
          selectedComponentUuids.length > 0 &&
          !selectedComponentUuids.includes(component.componentUuid)
        ) {
          return
        }

        const compData = component.parsedData ?? component.dataContent
        const compUuid = component.componentUuid
        if (compData && typeof compData === "object") {
          Object.entries(compData).forEach(([key, value]) => {
            const columnKey = `${compUuid}__${key}`
            row[columnKey] = value
          })
        } else if (typeof compData === "string") {
          row[compUuid] = compData
        }
      })

      return row
    })
  }, [enrichedResults, selectedComponentUuids])

  // ✅ Build table columns dynamically
  const columns = useMemo(() => {
    if (!tableData.length) return []

    const firstRow = tableData[0]
    const keys = Object.keys(firstRow)

    return keys.map((key) => {
      if (key === "participant") {
        return {
          id: key,
          header: "Participant",
          accessorKey: key,
          cell: (info: any) => <strong>{info.getValue()}</strong>,
        }
      }

      const [uuid, variableName] = key.split("__")
      const component = componentsWithColors.find((c) => c.uuid === uuid)
      const colorClass = componentColorMap[uuid] || "status-neutral"

      return {
        id: key,
        header: () => (
          <div className="flex flex-row items-center gap-2">
            <div aria-label="status" className={cn("status", colorClass)}></div>
            <span className="text-sm">
              {component ? component.title : uuid} — {variableName || "value"}
            </span>
          </div>
        ),
        accessorKey: key,
        cell: (info: any) => {
          const value = info.getValue()
          return typeof value === "object" ? JSON.stringify(value) : String(value ?? "")
        },
      }
    })
  }, [tableData, componentsWithColors, componentColorMap])

  return (
    <Card
      title="Results"
      className="mt-6"
      actions={
        <div className="flex gap-2">
          {/* Filter varibales by components */}
          <FilterComponent
            components={componentsWithColors}
            selectedUuids={selectedComponentUuids}
            onFilterSelect={(uuids: string[]) => setSelectedComponentUuids(uuids)}
          />
          {/* Refetch results again from JATOS */}
          <button
            className={`btn btn-secondary w-fit ${loading ? "loading" : ""}`}
            onClick={fetchResults}
            disabled={loading}
          >
            {loading ? "Fetching..." : "Fetch Raw Results"}
          </button>
          {/* Download all data */}
          <DownloadResultsButton jatosStudyId={jatosStudyId} />
        </div>
      }
    >
      {loading && <div className="text-center text-sm p-3">Loading results...</div>}
      {error && <div className="text-error text-sm p-3">{error}</div>}
      {!loading && !error && !enrichedResults.length && (
        <div className="text-center text-sm p-3">No results found</div>
      )}
      {/* Show results in the table */}
      {!loading && !error && tableData.length > 0 && (
        <div className="overflow-x-auto max-w-full border border-base-300 rounded-lg mt-3">
          <div className="min-w-max">
            <Table columns={columns} data={tableData} addPagination={true} />
          </div>
        </div>
      )}
    </Card>
  )
}
