"use client"

import { useFormContext } from "react-hook-form"
import { FieldLabel, fieldAriaDescribedBy } from "./FieldLabel"

interface DateFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  /** Extra context shown next to the label (info icon + tooltip, screen reader text). */
  labelHint?: string
  error?: string
}

export const DateField = ({
  name,
  label,
  labelHint,
  error,
  className,
  ...props
}: DateFieldProps) => {
  const {
    register,
    formState: { isSubmitting, errors },
  } = useFormContext()

  // Prioritize form errors over custom error prop
  const fieldError = (errors[name]?.message as string) || error

  return (
    <fieldset className="fieldset">
      <FieldLabel htmlFor={name} label={label} hint={labelHint} />
      <input
        id={name}
        {...register(name)}
        {...props}
        type="date"
        disabled={isSubmitting}
        className={`input input-bordered ${fieldError ? "input-error" : ""} ${className || ""}`}
        aria-invalid={fieldError ? true : false}
        aria-describedby={fieldAriaDescribedBy(name, {
          hint: Boolean(labelHint),
          error: Boolean(fieldError),
        })}
      />
      {fieldError && (
        <span id={`${name}-error`} className="text-error text-sm" role="alert">
          {fieldError}
        </span>
      )}
    </fieldset>
  )
}

DateField.displayName = "DateField"

export default DateField
