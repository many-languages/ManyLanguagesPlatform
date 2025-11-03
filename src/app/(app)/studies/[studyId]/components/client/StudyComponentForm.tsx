"use client"

import { useEffect, useState } from "react"
import { z } from "zod"
import { StudyComponentFormSchema } from "../../../validations"
import { fetchHtmlFiles } from "@/src/lib/jatos/api/fetchHtmlFiles"
import { Form } from "@/src/app/components/Form"
import { SelectField } from "@/src/app/components/fields"

type StudyComponentFormValues = z.infer<typeof StudyComponentFormSchema>

type StudyComponentFormProps = {
  formTitle: string
  submitText: string
  onCancel?: () => void
  jatosStudyId: number
  onSubmit: (values: StudyComponentFormValues) => Promise<void | { FORM_ERROR?: string }>
  defaultValues?: Partial<StudyComponentFormValues>
}

export default function StudyComponentForm({
  formTitle,
  submitText,
  onCancel,
  jatosStudyId,
  defaultValues,
  onSubmit,
}: StudyComponentFormProps) {
  const [files, setFiles] = useState<{ value: string; label: string }[]>([])
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{formTitle}</h1>

      <Form
        schema={StudyComponentFormSchema}
        defaultValues={defaultValues ?? { htmlFilePath: "" }}
        onSubmit={onSubmit}
        className="space-y-4"
      >
        {(form) => (
          <>
            <SelectField
              name="htmlFilePath"
              label="Index file"
              options={files}
              placeholder={
                loading ? "Loading files..." : "Select the entry HTML file for your experiment"
              }
              disabled={loading || files.length === 0}
            />
            <p className="text-sm text-gray-600">Select the entry HTML file for your experiment</p>

            {/* Form Actions */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={form.formState.isSubmitting || loading || files.length === 0}
              >
                {form.formState.isSubmitting ? "Saving..." : submitText}
              </button>
            </div>

            {/* Global Form Error */}
            {form.formState.errors.root && (
              <div className="alert alert-error">{form.formState.errors.root.message}</div>
            )}
          </>
        )}
      </Form>
    </div>
  )
}
