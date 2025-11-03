"use client"

import { useFormContext } from "react-hook-form"

interface DateFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  error?: string
}

export const DateField = ({ name, label, error, className, ...props }: DateFieldProps) => {
  const {
    register,
    formState: { isSubmitting, errors },
  } = useFormContext()

  // Prioritize form errors over custom error prop
  const fieldError = (errors[name]?.message as string) || error

  return (
    <fieldset className="fieldset">
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input
        id={name}
        {...register(name)}
        {...props}
        type="date"
        disabled={isSubmitting}
        className={`input input-bordered ${fieldError ? "input-error" : ""} ${className || ""}`}
        aria-invalid={fieldError ? true : false}
        aria-describedby={fieldError ? `${name}-error` : undefined}
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
