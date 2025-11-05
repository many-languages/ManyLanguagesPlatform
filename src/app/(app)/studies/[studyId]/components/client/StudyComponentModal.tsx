"use client"

import toast from "react-hot-toast"
import StudyComponentForm from "./StudyComponentForm"
import { useMutation } from "@blitzjs/rpc"
import { StudyWithRelations } from "../../../queries/getStudy"
import updateStudyComponent from "../../../mutations/updateStudyComponent"
import { callJatosApi } from "@/src/lib/jatos/api/client"
import type { CreateComponentResponse } from "@/src/types/jatos-api"
import { FORM_ERROR } from "@/src/app/components/Form"
import Modal from "@/src/app/components/Modal"

interface StudyComponentModalProps {
  study: StudyWithRelations
  jatosStudyId: number
  isOpen: boolean
  onClose: () => void
}

export default function StudyComponentModal({
  study,
  jatosStudyId,
  isOpen,
  onClose,
}: StudyComponentModalProps) {
  const [updateStudyComponentMutation] = useMutation(updateStudyComponent)

  return (
    <Modal open={isOpen}>
      <StudyComponentForm
        formTitle="Setup Data Collection"
        submitText="Create Component"
        jatosStudyId={jatosStudyId}
        onSubmit={async (values) => {
          try {
            const data = await callJatosApi<CreateComponentResponse>("/create-component", {
              method: "POST",
              body: {
                jatosStudyId,
                title: "Main Component",
                htmlFilePath: values.htmlFilePath,
              },
            })

            await updateStudyComponentMutation({
              id: study.id,
              jatosComponentId: data.jatosComponentId,
              jatosComponentUUID: data.jatosComponentUUID,
            })

            toast.success("Component created successfully!")
            onClose()
          } catch (err: any) {
            const errorMessage = err?.message || "An unexpected error occurred. Please try again."
            return { [FORM_ERROR]: errorMessage }
          }
        }}
        onCancel={onClose}
      />
    </Modal>
  )
}
