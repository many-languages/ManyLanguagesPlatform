import { forwardRef } from "react"
import { useFormContext } from "react-hook-form"

interface DateFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  error?: string
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ name, label, error, className, ...props }, ref) => {
    const {
      register,
      formState: { isSubmitting, errors },
    } = useFormContext()

    const fieldError = error || (errors[name]?.message as string)

    return (
      <fieldset className="fieldset">
        <label className="label">{label}</label>
        <input
          {...register(name)}
          {...props}
          type="date"
          disabled={isSubmitting}
          className={`input input-bordered ${fieldError ? "input-error" : ""} ${className || ""}`}
        />
        {fieldError && <span className="text-error text-sm">{fieldError}</span>}
      </fieldset>
    )
  }
)

DateField.displayName = "DateField"

export default DateField
