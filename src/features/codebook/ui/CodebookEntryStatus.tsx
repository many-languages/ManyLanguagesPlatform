import { codebookCardHasDescription } from "../domain/codebookCardOpen"

interface CodebookEntryStatusProps {
  description: string | null | undefined
}

export default function CodebookEntryStatus({ description }: CodebookEntryStatusProps) {
  const hasDescription = codebookCardHasDescription(description)
  const ariaLabel = hasDescription ? "Description provided" : "Description missing"

  return (
    <span
      className="tooltip tooltip-top inline-flex shrink-0 cursor-help"
      data-tip={ariaLabel}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className={`status status-md ${hasDescription ? "status-success" : "status-neutral"}`}
        aria-label={ariaLabel}
      />
    </span>
  )
}
