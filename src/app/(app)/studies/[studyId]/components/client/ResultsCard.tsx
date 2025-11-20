"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Card from "@/src/app/components/Card"
import Table from "@/src/app/components/Table"
import { Alert } from "@/src/app/components/Alert"
import { getComponentMap } from "@/src/lib/jatos/api/getComponentMap"
import { AsyncButton } from "@/src/app/components/AsyncButton"
import { EmptyState } from "@/src/app/components/EmptyState"
import { LoadingMessage } from "@/src/app/components/LoadingStates"
import cn from "classnames"
import FilterComponent from "./FilterComponent"
import DownloadResultsButton from "./DownloadResultsButton"

import type {
  JatosMetadata,
  JatosStudyProperties,
  EnrichedJatosStudyResult,
} from "@/src/types/jatos"
import { refetchEnrichedResultsAction } from "../../actions/results"

interface ResultsCardProps {
  jatosStudyId: number
  metadata: JatosMetadata
  properties: JatosStudyProperties
  initialEnrichedResults: EnrichedJatosStudyResult[]
  studyId: number
}

export default function ResultsCard({
  jatosStudyId,
  metadata,
  properties,
  initialEnrichedResults,
  studyId,
}: ResultsCardProps) {
  const router = useRouter()
  const [enrichedResults, setEnrichedResults] = useState(initialEnrichedResults)
  const [loading, setLoading] = useState(false)
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

  const handleRefetch = async () => {
    setLoading(true)
    setError(null)

    const result = await refetchEnrichedResultsAction(jatosStudyId, metadata, studyId)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    setEnrichedResults(result.data)
    setLoading(false)

    // Refresh router to update server component cache
    router.refresh()
  }

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
      className="mt-4"
      collapsible
      actions={
        <div className="flex gap-2">
          {/* Filter varibales by components */}
          <FilterComponent
            components={componentsWithColors}
            selectedUuids={selectedComponentUuids}
            onFilterSelect={(uuids: string[]) => setSelectedComponentUuids(uuids)}
          />
          {/* Refetch results again from JATOS */}
          <AsyncButton
            onClick={handleRefetch}
            loadingText="Fetching..."
            className="btn btn-secondary w-fit"
            disabled={loading}
          >
            Fetch Raw Results
          </AsyncButton>
          {/* Download all data */}
          <DownloadResultsButton jatosStudyId={jatosStudyId} />
        </div>
      }
    >
      {loading && <LoadingMessage message="Loading results..." />}
      {error && (
        <Alert variant="error" className="mt-3">
          <p>{error}</p>
        </Alert>
      )}
      {!loading && !error && !enrichedResults.length && <EmptyState message="No results found" />}
      {/* Show results in the table */}
      {!loading && !error && tableData.length > 0 && (
        <div className="overflow-auto max-w-full border border-base-300 rounded-lg mt-3">
          <div className="min-w-max">
            <Table columns={columns} data={tableData} addPagination={true} />
          </div>
        </div>
      )}
    </Card>
  )
}
