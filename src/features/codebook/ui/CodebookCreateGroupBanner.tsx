import { Alert } from "@/src/components/ui/Alert"

interface CodebookCreateGroupBannerProps {
  candidateCount: number
  onCreateGroup: () => void
}

export default function CodebookCreateGroupBanner({
  candidateCount,
  onCreateGroup,
}: CodebookCreateGroupBannerProps) {
  const prefixMessage =
    candidateCount === 1
      ? "1 groupable variable prefix detected."
      : `${candidateCount} groupable variable prefixes detected.`

  return (
    <Alert variant="info" className="mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{prefixMessage} Group related variables to annotate them together.</p>
        <button className="btn btn-sm btn-primary shrink-0" onClick={onCreateGroup} type="button">
          Create Group
        </button>
      </div>
    </Alert>
  )
}
