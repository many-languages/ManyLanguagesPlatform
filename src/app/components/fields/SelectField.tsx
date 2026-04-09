"use client"

import { useFormContext } from "react-hook-form"
import { FieldLabel, fieldAriaDescribedBy } from "./FieldLabel"

interface SelectOption {
  value: string | number
  label: string
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string
  label: string
  /** Extra context shown next to the label (info icon + tooltip, screen reader text). */
  labelHint?: string
  options: SelectOption[]
  placeholder?: string
  error?: string
}

export const SelectField = ({
  name,
  label,
  labelHint,
  options,
  placeholder = "Please select an option",
  error,
  className,
  disabled,
  ...props
}: SelectFieldProps) => {
  const {
    register,
    formState: { isSubmitting, errors },
  } = useFormContext()

  // Prioritize form errors over custom error prop
  const fieldError = (errors[name]?.message as string) || error

  return (
    <fieldset className="fieldset">
      <FieldLabel htmlFor={name} label={label} hint={labelHint} />
      <select
        id={name}
        {...register(name)}
        {...props}
        disabled={isSubmitting || disabled}
        className={`select select-bordered ${fieldError ? "select-error" : ""} ${className || ""}`}
        aria-invalid={fieldError ? true : false}
        aria-describedby={fieldAriaDescribedBy(name, {
          hint: Boolean(labelHint),
          error: Boolean(fieldError),
        })}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {fieldError && (
        <span id={`${name}-error`} className="text-error text-sm" role="alert">
          {fieldError}
        </span>
      )}
    </fieldset>
  )
}

SelectField.displayName = "SelectField"

export default SelectField
