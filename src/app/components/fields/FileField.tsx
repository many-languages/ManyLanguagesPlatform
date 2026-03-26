"use client"

import { useFormContext, Controller } from "react-hook-form"
import { FieldLabel, fieldAriaDescribedBy } from "./FieldLabel"

interface FileFieldProps {
  name: string
  label: string
  /** Extra context shown next to the label (info icon + tooltip, screen reader text). */
  labelHint?: string
  accept?: string
  error?: string
  className?: string
}

export const FileField = ({
  name,
  label,
  labelHint,
  accept = ".jzip,.zip",
  className,
  error,
}: FileFieldProps) => {
  const {
    control,
    formState: { isSubmitting, errors },
  } = useFormContext()

  // Prioritize form errors over custom error prop
  const fieldError = (errors[name]?.message as string) || error

  return (
    <fieldset className="fieldset">
      <FieldLabel htmlFor={name} label={label} hint={labelHint} />
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            id={name}
            type="file"
            accept={accept}
            disabled={isSubmitting}
            className={`file-input file-input-bordered ${fieldError ? "file-input-error" : ""} ${
              className || ""
            }`}
            onChange={(e) => field.onChange(e.target.files?.[0] || null)}
            aria-invalid={fieldError ? true : false}
            aria-describedby={fieldAriaDescribedBy(name, {
              hint: Boolean(labelHint),
              error: Boolean(fieldError),
            })}
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
