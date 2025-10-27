"use client"

import { useEffect, useState } from "react"

import { z } from "zod"
import { StudyComponentFormSchema } from "../../../validations"
import { fetchHtmlFiles } from "@/src/lib/jatos/api/fetchHtmlFiles"
import Form from "@/src/components/Form"
import LabeledSelectField from "@/src/components/LabeledSelectField"

type StudyComponentFormValues = z.infer<typeof StudyComponentFormSchema>

type StudyComponentFormProps = {
  formTitle: string
  submitText: string
  onCancel?: () => void
  jatosStudyId: number
  onSubmit: (values: StudyComponentFormValues) => Promise<void | { FORM_ERROR?: string }>
  initialValues?: StudyComponentFormValues
}

export default function StudyComponentForm({
  formTitle,
  submitText,
  onCancel,
  jatosStudyId,
  initialValues,
  onSubmit,
}: StudyComponentFormProps) {
  const [files, setFiles] = useState<{ label: string; value: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const htmlFiles = await fetchHtmlFiles(jatosStudyId)
        setFiles(htmlFiles)
      } catch (err) {
        console.error("Error fetching JATOS assets:", err)
      } finally {
        setLoading(false)
      }
    }

    loadAssets()
  }, [jatosStudyId])

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{formTitle}</h1>

      <Form
        submitText={submitText}
        cancelText="Cancel"
        onCancel={onCancel}
        schema={StudyComponentFormSchema}
        initialValues={initialValues ?? { htmlFilePath: "" }}
        onSubmit={onSubmit}
      >
        <LabeledSelectField
          name="htmlFilePath"
          label="Index file"
          description="Select the entry HTML file for your experiment"
          options={files}
          optionText="label"
          optionValue="value"
          disabled={loading || files.length === 0}
        />
      </Form>
    </>
  )
}
