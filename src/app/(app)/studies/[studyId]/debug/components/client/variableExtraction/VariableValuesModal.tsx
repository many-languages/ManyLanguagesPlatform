"use client"

import { useMemo } from "react"
import Modal from "@/src/app/components/Modal"
import JsonView from "@/src/app/components/JsonView"
import type { ExtractedVariable, ExtractionObservation } from "../../../../variables/types"
import type { ExtractionIndexStore } from "../../../../variables/utils/extractionIndexStore"
import { formatValue } from "@/src/lib/utils/formatValue"
import { formatJson } from "@/src/lib/utils/formatJson"

interface VariableValuesModalProps {
  selectedVariable: ExtractedVariable | null
  indexStore: ExtractionIndexStore
  observations: ExtractionObservation[]
  onClose: () => void
}

export default function VariableValuesModal({
  selectedVariable,
  indexStore,
  observations,
  onClose,
}: VariableValuesModalProps) {
  const isOpen = selectedVariable !== null

  // Get all values from observation store
  const allValues = useMemo(() => {
    if (!selectedVariable) return []
    const valueJsonStrings = Array.from(
      indexStore.iterateValueJsonByVariableKey(selectedVariable.variableKey, observations)
    )
    return valueJsonStrings.map((json) => {
      try {
        return JSON.parse(json)
      } catch {
        return null
      }
    })
  }, [selectedVariable, indexStore, observations])

  return (
    <Modal open={isOpen} size="max-w-4xl">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            All Values: <span className="font-mono">{selectedVariable?.variableName}</span>
          </h2>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="text-sm text-muted-content">
          <span className="font-medium">Type:</span> {selectedVariable?.type} |{" "}
          <span className="font-medium">Occurrences:</span> {selectedVariable?.occurrences}
        </div>

        <div className="max-h-[60vh] overflow-auto space-y-4">
          {allValues.map((value, index) => {
            const isObject = typeof value === "object" && value !== null && !Array.isArray(value)
            const isArray = Array.isArray(value)
            const isJSON = isObject || isArray

            if (isJSON) {
              const jsonString = formatJson(value)
              return (
                <div key={index} className="border border-base-300 rounded-lg overflow-hidden">
                  <div className="bg-base-200 px-3 py-1 text-xs font-mono text-muted-content">
                    [{index}]:
                  </div>
                  <JsonView code={jsonString} language="json" />
                </div>
              )
            }

            // For primitive values, show with simple formatting
            const formatted = formatValue(value)
            return (
              <div key={index} className="border border-base-300 rounded-lg p-3">
                <span className="text-muted-content text-xs font-mono">[{index}]:</span>{" "}
                <span className="font-mono text-sm">{formatted}</span>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
