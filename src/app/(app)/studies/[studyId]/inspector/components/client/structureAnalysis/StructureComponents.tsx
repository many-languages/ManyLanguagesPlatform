"use client"

import type { ComponentExplorerModel, SelectedPath } from "../../../types"
import { Alert } from "@/src/app/components/Alert"
import { useCallback, useMemo } from "react"
import ComponentView from "../componentView/ComponentView"
import ComponentSelector from "../componentView/ComponentSelector"
import CopyButton from "../CopyButton"

interface StructureComponentsProps {
  componentExplorer: ComponentExplorerModel
  selectedComponentId: number | "all" | null
  selectedPath?: SelectedPath | null
  onSelectComponent: (componentId: number | "all" | null) => void
  onHighlightPath: (variableKey: string, componentId: number) => void
}

export default function StructureComponents({
  componentExplorer,
  selectedComponentId,
  selectedPath,
  onSelectComponent,
  onHighlightPath,
}: StructureComponentsProps) {
  const itemsToRender = useMemo(
    () => componentExplorer.getItemsToRender(selectedComponentId),
    [componentExplorer, selectedComponentId]
  )

  const canCopy =
    componentExplorer.items.length > 0 &&
    (selectedComponentId === "all" || selectedComponentId !== null)

  const getTextToCopy = useCallback(() => {
    return componentExplorer.getCopyText(selectedComponentId)
  }, [componentExplorer, selectedComponentId])

  return (
    <div className="space-y-4">
      <div className="flex-1">
        <ComponentSelector
          // selector should use the filtered list from the model
          components={componentExplorer.items.map((it) => ({
            id: it.component.id,
            componentId: it.component.componentId,
          }))}
          selectedComponentId={selectedComponentId}
          onSelect={onSelectComponent}
        />
      </div>

      {itemsToRender.length === 0 ? (
        <Alert variant="info">Please select a component to view details</Alert>
      ) : (
        <div className="space-y-6">
          {itemsToRender.map((item) => {
            const highlightPaths =
              selectedPath && selectedPath.componentId === item.componentId
                ? componentExplorer.getHighlightPaths(item.componentId, selectedPath.selectedPath)
                : undefined

            return (
              <ComponentView
                key={item.component.id}
                component={item.component}
                extractedPaths={item.badges}
                stats={item.stats}
                selectedPath={selectedPath}
                highlightPaths={highlightPaths}
                onHighlightPath={onHighlightPath}
              />
            )
          })}
          <div className="flex justify-end pt-2">
            <CopyButton getTextToCopy={getTextToCopy} disabled={!canCopy} />
          </div>
        </div>
      )}
    </div>
  )
}
