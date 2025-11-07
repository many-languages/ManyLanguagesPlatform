"use client"

interface FilterButtonWithDisplayProps {
  currentFilterClause: string
  onAddFilter: () => void
  onClearFilter: () => void
  enabled?: boolean
}

export function FilterButtonWithDisplay({
  currentFilterClause,
  onAddFilter,
  onClearFilter,
  enabled = true,
}: FilterButtonWithDisplayProps) {
  if (!enabled) return null

  return (
    <div>
      <button className="btn btn-sm btn-outline w-full" onClick={onAddFilter}>
        {currentFilterClause ? "Edit Filter" : "Add Filter"}
      </button>
      {currentFilterClause && (
        <div className="mt-2 p-2 bg-base-100 rounded text-xs">
          <div className="font-medium">Current filter:</div>
          <code>{currentFilterClause}</code>
          <button className="btn btn-xs btn-error ml-2" onClick={onClearFilter}>
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
