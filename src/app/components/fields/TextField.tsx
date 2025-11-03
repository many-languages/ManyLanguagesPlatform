import { forwardRef } from "react"
import { useFormContext } from "react-hook-form"

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  error?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
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
          disabled={isSubmitting}
          className={`input input-bordered ${fieldError ? "input-error" : ""} ${className || ""}`}
        />
        {fieldError && <span className="text-error text-sm">{fieldError}</span>}
      </fieldset>
    )
  }
)

TextField.displayName = "TextField"

export default TextField
