"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import Card from "@/src/app/components/Card"

interface ComponentResultExplorerProps {
  enrichedResult: EnrichedJatosStudyResult
}

export default function ComponentResultExplorer({ enrichedResult }: ComponentResultExplorerProps) {
  return (
    <Card title="Component Result Explorer" collapsible defaultOpen={true}>
      <div className="space-y-4">
        {enrichedResult.componentResults.map((component) => {
          const title = (
            <div className="flex items-center justify-between w-full">
              <span>Component {component.componentId}</span>
              <span
                className={`badge badge-sm ${
                  component.dataContent ? "badge-success" : "badge-ghost"
                }`}
              >
                {component.componentState}
              </span>
            </div>
          )

          return (
            <Card
              key={component.id}
              title={title}
              collapsible
              defaultOpen={false}
              bgColor="bg-base-100"
              className="border border-base-300"
            >
              <div className="space-y-2 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Component UUID:</span>
                    <div
                      className="tooltip tooltip-right cursor-help"
                      data-tip="Component result ID for this specific study result"
                    >
                      <span className="text-muted-content text-xs">(ID: {component.id})</span>
                    </div>
                  </div>
                  <div className="font-mono text-xs">{component.componentUuid}</div>
                </div>

                <div className="divider my-2" />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="font-medium">Start Date:</span>
                    <div className="text-xs">{new Date(component.startDate).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium">End Date:</span>
                    <div className="text-xs">{new Date(component.endDate).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>
                    <div className="text-xs">{component.duration}</div>
                  </div>
                </div>

                <div className="divider my-2" />

                <div>
                  <span className="font-medium">Data:</span>
                  <div className="text-xs space-y-1 mt-1">
                    <div>
                      Path: <span className="font-mono">{component.path}</span>
                    </div>
                    <div>
                      Size: {component.data.sizeHumanReadable} | Has Data:{" "}
                      {component.dataContent ? "Yes" : "No"}
                      {component.dataContent && (
                        <> | Lines: {component.dataContent.split("\n").length}</>
                      )}
                    </div>
                    <div>
                      Format:{" "}
                      {component.dataContent ? (
                        component.detectedFormat ? (
                          <span className="flex items-center gap-1">
                            <span
                              className={`badge badge-xs ${
                                component.detectedFormat.format === "json"
                                  ? "badge-success"
                                  : component.detectedFormat.format === "csv" ||
                                    component.detectedFormat.format === "tsv"
                                  ? "badge-info"
                                  : "badge-warning"
                              }`}
                            >
                              {component.detectedFormat.format.toUpperCase()}
                            </span>
                            <span className="text-muted-content">
                              ({Math.round(component.detectedFormat.confidence * 100)}% confidence)
                            </span>
                          </span>
                        ) : (
                          "Unknown"
                        )
                      ) : (
                        "N/A"
                      )}
                    </div>
                    {component.detectedFormat?.message && (
                      <div className="text-muted-content">{component.detectedFormat.message}</div>
                    )}
                    {component.detectedFormat?.delimiter && (
                      <div className="text-muted-content">
                        Delimiter:{" "}
                        {component.detectedFormat.delimiter === "\t"
                          ? "TAB"
                          : `'${component.detectedFormat.delimiter}'`}
                      </div>
                    )}
                    {component.parseError && (
                      <div className="alert alert-error py-1 px-2 mt-1">
                        <span className="text-xs">Parse Error: {component.parseError}</span>
                      </div>
                    )}
                  </div>
                </div>

                {component.files.length > 0 && (
                  <>
                    <div className="divider my-2" />
                    <div>
                      <span className="font-medium">Files ({component.files.length}):</span>
                      <ul className="list-disc list-inside text-xs mt-1">
                        {component.files.map((file, idx) => (
                          <li key={idx}>
                            {file.filename} ({file.sizeHumanReadable})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </Card>
  )
}
