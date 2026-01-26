"use client"

import { useState } from "react"
import { StudyWithRelations } from "../../../queries/getStudy"
import StudyComponentModal from "./StudyComponentModal"

interface StudyComponentButtonProps {
  study: StudyWithRelations
}

export default function StudyComponentButton({ study }: StudyComponentButtonProps) {
  const [open, setOpen] = useState(false)
  const latestUpload = study.latestJatosStudyUpload
  const label = latestUpload?.jatosComponentId ? "Edit Study Component" : "Add Study Component"
  const variant = latestUpload?.jatosComponentId ? "btn-outline" : "btn-primary"
  const jatosStudyId = latestUpload?.jatosStudyId

  return (
    <>
      <button className={`btn ${variant}`} onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && jatosStudyId && (
        <StudyComponentModal
          study={study}
          jatosStudyId={jatosStudyId}
          isOpen={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
