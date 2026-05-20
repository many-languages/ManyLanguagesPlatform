import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline"

import { AsyncButton } from "@/src/components/ui/AsyncButton"

interface CodebookSaveToolbarProps {
  isSaved: boolean
  isSaving: boolean
  onSave: () => void | Promise<boolean>
  showExpandCollapse?: boolean
  allCardsExpanded?: boolean
  onToggleAllCardsOpen?: () => void
}

export default function CodebookSaveToolbar({
  isSaved,
  isSaving,
  onSave,
  showExpandCollapse = false,
  allCardsExpanded = false,
  onToggleAllCardsOpen,
}: CodebookSaveToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      {isSaved ? (
        <span className="badge badge-success">✓ Codebook saved</span>
      ) : (
        <span className="badge badge-warning">⚠ Codebook not saved</span>
      )}
      <div className="flex items-center gap-2">
        <AsyncButton
          onClick={async () => {
            await onSave()
          }}
          loadingText="Saving"
          disabled={isSaving}
          className="btn btn-sm btn-primary"
        >
          {isSaving ? "Saving..." : "Save Codebook"}
        </AsyncButton>
        {showExpandCollapse && onToggleAllCardsOpen ? (
          <button
            type="button"
            className="btn btn-sm btn-secondary gap-1"
            onClick={onToggleAllCardsOpen}
          >
            {allCardsExpanded ? (
              <>
                Collapse all
                <ChevronUpIcon className="h-4 w-4" />
              </>
            ) : (
              <>
                Expand all
                <ChevronDownIcon className="h-4 w-4" />
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}
