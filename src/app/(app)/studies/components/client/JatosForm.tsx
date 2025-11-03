"use client"

import { useMemo } from "react"
import { Form } from "@/src/app/components/Form"
import { JatosFormSchema } from "../../validations"
import { z } from "zod"
import {
  SelectField,
  FileField,
  FormSubmitButton,
  FormErrorDisplay,
} from "@/src/app/components/fields"

type JatosFormValues = z.infer<typeof JatosFormSchema>

type JatosFormProps = {
  formTitle: string
  submitText: string
  onCancel?: () => void
  cancelText?: string
  /** Handles submission, must return void or errors */
  onSubmit: (values: JatosFormValues) => Promise<void | { FORM_ERROR?: string }>
  defaultValues?: Partial<JatosFormValues>
}

export const jatosWorkerTypeOptions = [
  { value: "SINGLE", label: "Single Personal Links (no reuse)" },
  { value: "MULTIPLE", label: "Multiple Personal Links (reuse allowed)" },
]

export default function JatosForm({
  onCancel,
  cancelText,
  submitText,
  formTitle,
  defaultValues,
  onSubmit,
}: JatosFormProps) {
  const memoizedDefaultValues = useMemo(
    () =>
      defaultValues ??
      ({
        jatosWorkerType: "SINGLE" as const,
        jatosFileName: undefined,
      } satisfies Partial<JatosFormValues>),
    [defaultValues]
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{formTitle}</h1>

      <Form
        schema={JatosFormSchema}
        defaultValues={memoizedDefaultValues}
        onSubmit={onSubmit}
        className="space-y-4"
      >
        <>
          <SelectField
            name="jatosWorkerType"
            label="Data collection method"
            options={jatosWorkerTypeOptions}
            placeholder="Select data collection method"
          />
          <FileField name="studyFile" label="Upload Study (.jzip)" accept=".jzip,.zip" />
          <p className="text-xs opacity-70">Only .jzip exports from JATOS are accepted.</p>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            {cancelText && onCancel && (
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                {cancelText}
              </button>
            )}
            <FormSubmitButton
              submitText={submitText}
              loadingText="Uploading..."
              className="btn btn-primary"
            />
          </div>

          {/* Global Form Error */}
          <FormErrorDisplay />
        </>
      </Form>
    </div>
  )
}
