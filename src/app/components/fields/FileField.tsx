"use client"

import { useFormContext, Controller } from "react-hook-form"

interface FileFieldProps {
  name: string
  label: string
  accept?: string
  error?: string
}

export const FileField = ({ name, label, accept = ".jzip,.zip", error }: FileFieldProps) => {
  const {
    control,
    formState: { isSubmitting, errors },
  } = useFormContext()

  // Prioritize form errors over custom error prop
  const fieldError = (errors[name]?.message as string) || error

  return (
    <fieldset className="fieldset">
      <label htmlFor={name} className="label">
        {label}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            id={name}
            type="file"
            accept={accept}
            disabled={isSubmitting}
            className={`file-input file-input-bordered ${fieldError ? "file-input-error" : ""}`}
            onChange={(e) => field.onChange(e.target.files?.[0] || null)}
            aria-invalid={fieldError ? true : false}
            aria-describedby={fieldError ? `${name}-error` : undefined}
          />
        )}
      />
      {fieldError && (
        <span id={`${name}-error`} className="text-error text-sm" role="alert">
          {fieldError}
        </span>
      )}
    </fieldset>
  )
}

FileField.displayName = "FileField"

export default FileField
