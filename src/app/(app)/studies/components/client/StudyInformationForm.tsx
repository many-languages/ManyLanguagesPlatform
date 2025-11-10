"use client"

import { useMemo } from "react"
import { Form } from "@/src/app/components/Form"
import {
  TextField,
  DateField,
  FormSubmitButton,
  FormErrorDisplay,
} from "@/src/app/components/fields"
import { StudyInformationFormSchema } from "../../validations"
import { z } from "zod"
import { clsx } from "clsx"

type StudyInformationFormValues = z.infer<typeof StudyInformationFormSchema>

type StudyInformationFormProps = {
  formTitle: string
  submitText: string
  onCancel?: () => void
  cancelText?: string
  actionsClassName?: string
  /** Handles submission, must return void or errors */
  onSubmit: (values: StudyInformationFormValues) => Promise<void | { FORM_ERROR?: string }>
  defaultValues?: Partial<StudyInformationFormValues>
}

export default function StudyInformationForm({
  onCancel,
  cancelText,
  submitText,
  formTitle,
  defaultValues,
  onSubmit,
  actionsClassName,
}: StudyInformationFormProps) {
  const memoizedDefaultValues = useMemo(() => defaultValues, [defaultValues])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{formTitle}</h1>

      <Form
        schema={StudyInformationFormSchema}
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
          <TextField name="length" label="Expected Duration" placeholder="30 minutes" />

          {/* Form Actions */}
          <div className={clsx("flex gap-2 pt-4", actionsClassName || "justify-end")}>
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

          {/* Global Form Error */}
          <FormErrorDisplay />
        </>
      </Form>
    </div>
  )
}
