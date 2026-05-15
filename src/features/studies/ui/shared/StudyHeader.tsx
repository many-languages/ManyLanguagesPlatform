import { ArchiveBoxIcon } from "@heroicons/react/24/outline"

interface StudyHeaderProps {
  study: {
    title?: string | null
    archived?: boolean | null
  }
}

export default function StudyHeader({ study }: StudyHeaderProps) {
  return (
    <h1 className="text-3xl font-bold text-center">
      <span className="inline-flex items-center gap-2">
        {study?.archived && (
          <ArchiveBoxIcon className="h-6 w-6" title="Archived study" aria-label="Archived study" />
        )}
        {study?.title}
      </span>
    </h1>
  )
}
