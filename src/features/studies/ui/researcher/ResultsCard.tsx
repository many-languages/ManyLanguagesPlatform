"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Card from "@/src/components/ui/Card"
import Table from "@/src/components/ui/Table"
import { Alert } from "@/src/components/ui/Alert"
import { AsyncButton } from "@/src/components/ui/AsyncButton"
import { EmptyState } from "@/src/components/ui/EmptyState"
import { LoadingMessage } from "@/src/components/ui/LoadingStates"
import cn from "classnames"
import FilterComponent from "./FilterComponent"
import DownloadResultsButton from "./DownloadResultsButton"
import DownloadCleanedResultsButton from "./DownloadCleanedResultsButton"

import type { ResearcherResultComponentOption } from "../../types"
import type { ResearcherRawResultInspectorPayload } from "../../server/loadResearcherStudyData"
import { refetchEnrichedResultsAction } from "@/src/features/studies/actions/results"

interface ResultsCardProps {
  jatosStudyId: number
  resultComponents: ResearcherResultComponentOption[]
  rawResultInspectorPayload: ResearcherRawResultInspectorPayload
  studyId: number
  /** True when the latest upload has an approved extraction (step 4). */
  hasApprovedExtraction: boolean
  /** True when JATOS metadata reports at least one result without exposing raw result data. */
  hasResults: boolean
}

export default function ResultsCard({
  jatosStudyId,
  resultComponents,
  rawResultInspectorPayload,
  studyId,
  hasApprovedExtraction,
  hasResults,
}: ResultsCardProps) {
  const router = useRouter()
  const [enrichedResults, setEnrichedResults] = useState(rawResultInspectorPayload.enrichedResults)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedComponentUuids, setSelectedComponentUuids] = useState<string[]>(
    resultComponents.map((component) => component.uuid)
  )

  const cleanedDownloadEnabled = hasApprovedExtraction && hasResults

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
    return resultComponents.map((c, i) => ({
      uuid: c.uuid,
      title: c.title,
      colorClass: colorClasses[i % colorClasses.length],
    }))
  }, [resultComponents])

  const componentColorMap = useMemo(() => {
    return componentsWithColors.reduce(
      (acc, c) => ({ ...acc, [c.uuid]: c.colorClass }),
      {} as Record<string, string>
    )
  }, [componentsWithColors])

  const handleRefetch = async () => {
    setLoading(true)
    setError(null)

    const result = await refetchEnrichedResultsAction({ jatosStudyId, studyId })

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    setEnrichedResults(result.data.enrichedResults)
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
      bodyClassName="flex flex-col gap-3 max-h-[70vh] min-h-0 overflow-hidden"
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
            loadingText="Fetching"
            className="btn btn-secondary w-fit"
            disabled={loading}
          >
            Inspect Raw Results
          </AsyncButton>
          {/* Download all data */}
          <DownloadResultsButton studyId={studyId} />
          <DownloadCleanedResultsButton
            studyId={studyId}
            enabled={cleanedDownloadEnabled}
            disabledReason={
              cleanedDownloadEnabled
                ? undefined
                : "Requires an approved extraction and at least one result (participant or pilot)."
            }
          />
          {/* Open Inspector */}
          <Link href={`/studies/${studyId}/inspector`} className="btn btn-ghost">
            Inspector
          </Link>
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        {loading && <LoadingMessage message="Loading results..." />}
        {error && (
          <Alert variant="error" className="mt-3">
            <p>{error}</p>
          </Alert>
        )}
        {!loading && !error && !enrichedResults.length && (
          <EmptyState
            message={
              hasResults
                ? "No raw results could be loaded. Try fetching results again."
                : "No results found"
            }
          />
        )}
        {/* Show results in the table */}
        {!loading && !error && tableData.length > 0 && (
          <div className="flex-1 min-h-0 overflow-auto max-w-full">
            <div className="min-w-max">
              <Table columns={columns} data={tableData} addPagination={true} />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
