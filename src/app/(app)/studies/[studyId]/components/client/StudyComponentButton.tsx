"use client"

import { useState } from "react"
import { StudyWithRelations } from "../../../queries/getStudy"
import StudyComponentModal from "./StudyComponentModal"

interface StudyComponentButtonProps {
  study: StudyWithRelations
}

export default function StudyComponentButton({ study }: StudyComponentButtonProps) {
  const [open, setOpen] = useState(false)
  const label = study.jatosComponentId ? "Edit Study Component" : "Add Study Component"
  const variant = study.jatosComponentId ? "btn-outline" : "btn-primary"

  return (
    <>
      <button className={`btn ${variant}`} onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && (
        <StudyComponentModal
          studyId={study.id}
          jatosStudyId={study.jatosStudyId!}
          isOpen={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
