"use client"

import { useMemo } from "react"
import { Form } from "@/src/app/components/Form"
import { JatosFormSchema } from "../../../../../validations"
import { z } from "zod"
import {
  SelectField,
  FileField,
  FormSubmitButton,
  FormErrorDisplay,
} from "@/src/app/components/fields"

type JatosFormValues = z.infer<typeof JatosFormSchema>

type JatosFormProps = {
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
    <Form schema={JatosFormSchema} defaultValues={memoizedDefaultValues} onSubmit={onSubmit}>
      <div className="mx-auto flex w-full max-w-lg flex-col space-y-6">
        <SelectField
          name="jatosWorkerType"
          label="Data collection method"
          options={jatosWorkerTypeOptions}
          placeholder="Select data collection method"
          className="w-full"
        />
        <FileField
          name="studyFile"
          label="Upload Study (.jzip)"
          accept=".jzip,.zip"
          className="w-full"
        />
        <p className="text-xs opacity-70">Only .jzip exports from JATOS are accepted.</p>

        {/* Global Form Error */}
        <FormErrorDisplay />
      </div>

      {/* Form Actions */}
      <div className="mx-auto flex w-full gap-2 pt-4 justify-between">
        {cancelText && onCancel ? (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
        ) : (
          <div /> // placeholder to keep submit button on right when no cancel
        )}
        <FormSubmitButton
          submitText={submitText}
          loadingText="Uploading"
          className="btn btn-primary"
        />
      </div>
    </Form>
  )
}
