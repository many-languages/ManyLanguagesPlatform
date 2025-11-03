"use client"

import { useMemo } from "react"
import { Form } from "@/src/app/components/Form"
import {
  TextField,
  DateField,
  FormSubmitButton,
  FormErrorDisplay,
} from "@/src/app/components/fields"
import { StudyFormSchema } from "../../validations"
import { z } from "zod"

type StudyFormValues = z.infer<typeof StudyFormSchema>

type StudyFormProps = {
  formTitle: string
  submitText: string
  onCancel?: () => void
  cancelText?: string
  /** Handles submission, must return void or errors */
  onSubmit: (values: StudyFormValues) => Promise<void | { FORM_ERROR?: string }>
  defaultValues?: Partial<StudyFormValues>
}

export default function StudyForm({
  onCancel,
  cancelText,
  submitText,
  formTitle,
  defaultValues,
  onSubmit,
}: StudyFormProps) {
  const memoizedDefaultValues = useMemo(() => defaultValues, [defaultValues])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{formTitle}</h1>

      <Form
        schema={StudyFormSchema}
        onSubmit={onSubmit}
        defaultValues={memoizedDefaultValues}
        className="space-y-4"
      >
        <>
          <TextField name="title" label="Title" placeholder="Study title" />
          <TextField name="description" label="Description" placeholder="Short description" />
          <DateField name="startDate" label="Start Date" />
          <DateField name="endDate" label="End Date" />
          <TextField name="sampleSize" label="Sample Size" placeholder="100" type="number" />
          <TextField name="payment" label="Payment" placeholder="e.g., $10 voucher" />
          <TextField
            name="ethicalPermission"
            label="Ethical Permission"
            placeholder="https://example.com/approval"
          />
          <TextField name="length" label="Expected Duration" placeholder="30 minutes" />

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            {cancelText && onCancel && (
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                {cancelText}
              </button>
            )}
            <FormSubmitButton
              submitText={submitText}
              loadingText="Saving..."
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
