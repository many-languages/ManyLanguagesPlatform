import { forwardRef } from "react"
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

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    { name, label, options, placeholder = "Please select an option", error, className, ...props },
    ref
  ) => {
    const {
      register,
      formState: { isSubmitting, errors },
    } = useFormContext()

    const fieldError = error || (errors[name]?.message as string)

    return (
      <fieldset className="fieldset">
        <label className="label">{label}</label>
        <select
          {...register(name)}
          {...props}
          disabled={isSubmitting}
          className={`select select-bordered ${fieldError ? "select-error" : ""} ${
            className || ""
          }`}
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
        {fieldError && <span className="text-error text-sm">{fieldError}</span>}
      </fieldset>
    )
  }
)

SelectField.displayName = "SelectField"

export default SelectField
