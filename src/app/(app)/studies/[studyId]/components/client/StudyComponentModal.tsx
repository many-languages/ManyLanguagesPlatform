"use client"

import toast from "react-hot-toast"
import StudyComponentForm from "./StudyComponentForm"
import { useMutation, useQuery } from "@blitzjs/rpc"
import getStudy from "../../../queries/getStudy"
import updateStudyComponent from "../../../mutations/updateStudyComponent"
import Modal from "@/src/components/Modal"

interface StudyComponentModalProps {
  studyId: number
  jatosStudyId: number
  isOpen: boolean
  onClose: () => void
}

export default function StudyComponentModal({
  studyId,
  jatosStudyId,
  isOpen,
  onClose,
}: StudyComponentModalProps) {
  const [updateStudyComponentMutation] = useMutation(updateStudyComponent)
  const [study] = useQuery(getStudy, { id: studyId })

  return (
    <Modal open={isOpen}>
      <StudyComponentForm
        formTitle="Setup Data Collection"
        submitText="Create Component"
        jatosStudyId={jatosStudyId}
        onSubmit={async (values) => {
          try {
            const res = await fetch("/api/jatos/create-component", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jatosStudyId,
                title: "Main Component",
                htmlFilePath: values.htmlFilePath,
              }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || "Component creation failed")

            await updateStudyComponentMutation({
              id: studyId,
              jatosComponentId: data.jatosComponentId,
              jatosComponentUUID: data.jatosComponentUUID,
            })

            toast.success("Component created successfully!")
            onClose()
          } catch (err: any) {
            toast.error(err.message ?? "Unexpected error")
            return { FORM_ERROR: `Unexpected error: ${err.message ?? String(err)}` }
          }
        }}
        onCancel={onClose}
      />
    </Modal>
  )
}
