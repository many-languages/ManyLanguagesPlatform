"use client"

import { useMemo } from "react"
import { useFormContext } from "react-hook-form"
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
  /** When set, shown under the file name in the current-study card (typically `latestJatosStudyUpload.createdAt`). */
  currentStudyFileUploadedAt?: Date | string
  /** JATOS study UUID from the platform study record — distinguishes this import from other JATOS studies. */
  jatosStudyUuid?: string | null
}

function formatStudyFileUploadTime(value: Date | string | undefined): string | null {
  if (value == null) return null
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString()
}

export const jatosWorkerTypeOptions = [
  { value: "SINGLE", label: "Single Personal Links (no reuse)" },
  { value: "MULTIPLE", label: "Multiple Personal Links (reuse allowed)" },
]

/** Keeps `jatosFileName` in RHF state so validation and submit handlers receive the stored name. */
function HiddenJatosFileNameField() {
  const { register } = useFormContext()
  return <input type="hidden" {...register("jatosFileName")} />
}

export default function JatosForm({
  onCancel,
  cancelText,
  submitText,

  defaultValues,
  onSubmit,
  currentStudyFileUploadedAt,
  jatosStudyUuid,
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

  const existingJatosFileName = memoizedDefaultValues.jatosFileName?.trim()
  const uploadTimeLabel = formatStudyFileUploadTime(currentStudyFileUploadedAt)
  const uuidTrimmed = jatosStudyUuid?.trim() || null

  return (
    <Form schema={JatosFormSchema} defaultValues={memoizedDefaultValues} onSubmit={onSubmit}>
      <HiddenJatosFileNameField />
      <div className="mx-auto flex w-full max-w-lg flex-col space-y-6">
        <SelectField
          name="jatosWorkerType"
          label="Data collection method"
          labelHint="Use single if you want to prevent a participant from completing the same study twice. Use multiple if you would like to allow the participant to complete the study multiple times."
          options={jatosWorkerTypeOptions}
          placeholder="Select data collection method"
          className="w-full"
        />
        {existingJatosFileName ? (
          <div className="flex flex-col gap-1.5">
            <div className="label text-base font-medium">Current study file</div>
            <div className="rounded-lg border border-base-content/20 bg-base-100 px-3 py-2.5">
              <div className="font-mono text-sm font-medium break-all text-base-content">
                {existingJatosFileName}
              </div>
              {uuidTrimmed ? (
                <div className="mt-2">
                  <div className="text-xs text-base-content/60">JATOS UUID</div>
                  <div className="font-mono text-xs break-all text-base-content mt-0.5">
                    {uuidTrimmed}
                  </div>
                </div>
              ) : null}
              {uploadTimeLabel ? (
                <p className="text-xs text-base-content/60 mt-2">Uploaded {uploadTimeLabel}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        <FileField
          name="studyFile"
          label={existingJatosFileName ? "Replace study file (.jzip)" : "Upload study (.jzip)"}
          labelHint="Only .jzip exports from JATOS are accepted."
          accept=".jzip,.zip"
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
          loadingText="Uploading"
          className="btn btn-primary"
        />
      </div>
    </Form>
  )
}
