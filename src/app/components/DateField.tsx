import { forwardRef, PropsWithoutRef } from "react"
import { useField, useFormikContext, ErrorMessage } from "formik"

export interface DateFieldProps extends PropsWithoutRef<React.JSX.IntrinsicElements["input"]> {
  /** Field name. */
  name: string
  /** Field label. */
  label: string
  outerProps?: PropsWithoutRef<React.JSX.IntrinsicElements["div"]>
  withBackground?: boolean
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ name, label, withBackground = true, outerProps, ...props }, ref) => {
    const [field] = useField(name)
    const { isSubmitting } = useFormikContext()

    return (
      <div
        className={`fieldset border-base-300 rounded-box border p-4 ${
          withBackground ? "bg-base-200" : ""
        }`}
        {...outerProps}
      >
        <label className="fieldset-legend">{label}</label>

        <input
          {...field}
          {...props}
          type="date"
          ref={ref}
          disabled={isSubmitting}
          className="input input-bordered"
        />

        <ErrorMessage name={name}>
          {(msg) => <span className="text-error text-sm mt-1">{msg}</span>}
        </ErrorMessage>
      </div>
    )
  }
)

DateField.displayName = "DateField"

export default DateField
