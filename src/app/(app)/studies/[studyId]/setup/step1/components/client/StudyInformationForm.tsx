"use client"

import { useMemo } from "react"
import { Form } from "@/src/app/components/Form"
import {
  TextField,
  DateField,
  FormSubmitButton,
  FormErrorDisplay,
} from "@/src/app/components/fields"
import { StudyInformationFormSchema } from "../../../../../validations"
import { z } from "zod"

type StudyInformationFormValues = z.infer<typeof StudyInformationFormSchema>

type StudyInformationFormProps = {
  submitText: string
  onCancel?: () => void
  cancelText?: string
  /** Handles submission, must return void or errors */
  onSubmit: (values: StudyInformationFormValues) => Promise<void | { FORM_ERROR?: string }>
  defaultValues?: Partial<StudyInformationFormValues>
}

export default function StudyInformationForm({
  onCancel,
  cancelText,
  submitText,
  defaultValues,
  onSubmit,
}: StudyInformationFormProps) {
  const memoizedDefaultValues = useMemo(() => defaultValues, [defaultValues])

  return (
    <Form
      schema={StudyInformationFormSchema}
      onSubmit={onSubmit}
      defaultValues={memoizedDefaultValues}
    >
      <div className="mx-auto w-full max-w-lg flex flex-col space-y-6">
        <TextField name="title" label="Title" placeholder="Study title" className="w-full" />
        <TextField
          name="description"
          label="Description"
          placeholder="Short description"
          className="w-full"
        />
        <DateField name="startDate" label="Start Date" className="w-full" />
        <DateField name="endDate" label="End Date" className="w-full" />
        <TextField
          name="sampleSize"
          label="Sample Size"
          placeholder="100"
          type="number"
          className="w-full"
        />
        <TextField
          name="payment"
          label="Payment"
          placeholder="e.g., $10 voucher"
          className="w-full"
        />
        <TextField
          name="length"
          label="Expected Duration"
          placeholder="30 minutes"
          className="w-full"
        />
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
          loadingText="Saving..."
          className="btn btn-primary"
        />
      </div>
    </Form>
  )
}
