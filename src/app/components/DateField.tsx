import { forwardRef, PropsWithoutRef } from "react"
import { useField, useFormikContext, ErrorMessage } from "formik"

export interface DateFieldProps extends PropsWithoutRef<React.JSX.IntrinsicElements["input"]> {
  /** Field name. */
  name: string
  /** Field label. */
  label: string
  outerProps?: PropsWithoutRef<React.JSX.IntrinsicElements["div"]>
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ name, label, outerProps, ...props }, ref) => {
    const [field] = useField(name)
    const { isSubmitting } = useFormikContext()

    return (
      <div className="flex flex-col gap-1" {...outerProps}>
        <label className="label">{label}</label>

        <input
          {...field}
          {...props}
          type="date"
          ref={ref}
          disabled={isSubmitting}
          className="input input-bordered"
        />

        <ErrorMessage name={name}>
          {(msg) => <span className="text-error text-sm">{msg}</span>}
        </ErrorMessage>
      </div>
    )
  }
)

DateField.displayName = "DateField"

export default DateField
