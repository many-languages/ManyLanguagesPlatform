"use client"

import { useFormContext } from "react-hook-form"

interface SelectOption {
  value: string | number
  label: string
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string
  label: string
  options: SelectOption[]
  placeholder?: string
  error?: string
}

export const SelectField = ({
  name,
  label,
  options,
  placeholder = "Please select an option",
  error,
  className,
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
      <label htmlFor={name} className="label text-base font-medium">
        {label}
      </label>
      <select
        id={name}
        {...register(name)}
        {...props}
        disabled={isSubmitting}
        className={`select select-bordered ${fieldError ? "select-error" : ""} ${className || ""}`}
        aria-invalid={fieldError ? true : false}
        aria-describedby={fieldError ? `${name}-error` : undefined}
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
