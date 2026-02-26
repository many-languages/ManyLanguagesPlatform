"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { StudyView } from "../../utils/studyView"
import { STUDY_VIEWS } from "../../utils/studyView"
import clsx from "clsx"

const VIEW_LABELS: Record<StudyView, string> = {
  all: "All",
  active: "Active",
  archived: "Archived",
  incomplete: "Setup incomplete",
}

interface StudiesViewTabsProps {
  currentView: StudyView
}

export default function StudiesViewTabs({ currentView }: StudiesViewTabsProps) {
  const pathname = usePathname()

  return (
    <div
      role="tablist"
      className="tabs tabs-boxed bg-base-200 p-1.5 rounded-xl shadow-sm border border-base-300"
    >
      {STUDY_VIEWS.map((view) => {
        const href = view === "all" ? pathname : `${pathname}?view=${view}`
        const isActive = currentView === view

        return (
          <Link
            key={view}
            href={href}
            role="tab"
            className={clsx(
              "tab rounded-lg px-4 py-2 transition-all duration-200",
              isActive
                ? "tab-active bg-primary text-primary-content font-semibold shadow-sm"
                : "hover:bg-base-300 hover:text-base-content"
            )}
            aria-selected={isActive}
          >
            {VIEW_LABELS[view]}
          </Link>
        )
      })}
    </div>
  )
}
