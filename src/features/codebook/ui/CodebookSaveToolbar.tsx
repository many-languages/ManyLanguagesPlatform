import { AsyncButton } from "@/src/components/ui/AsyncButton"

interface CodebookSaveToolbarProps {
  isSaved: boolean
  isSaving: boolean
  onSave: () => void | Promise<boolean>
}

export default function CodebookSaveToolbar({
  isSaved,
  isSaving,
  onSave,
}: CodebookSaveToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      {isSaved ? (
        <span className="badge badge-success">✓ Codebook saved</span>
      ) : (
        <span className="badge badge-warning">⚠ Codebook not saved</span>
      )}
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
    </div>
  )
}
