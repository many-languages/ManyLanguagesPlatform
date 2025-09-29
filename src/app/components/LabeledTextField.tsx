import { forwardRef, PropsWithoutRef } from "react"
import { useField, useFormikContext, ErrorMessage } from "formik"

export interface LabeledTextFieldProps
  extends PropsWithoutRef<React.JSX.IntrinsicElements["input"]> {
  /** Field name. */
  name: string
  /** Field label. */
  label: string
  /** Field type. Doesn't include radio buttons and checkboxes */
  type?: "text" | "password" | "email" | "number"
  outerProps?: PropsWithoutRef<React.JSX.IntrinsicElements["div"]>
}

export const LabeledTextField = forwardRef<HTMLInputElement, LabeledTextFieldProps>(
  ({ name, label, outerProps, ...props }, ref) => {
    const [input] = useField(name)
    const { isSubmitting } = useFormikContext()

    return (
      <div className="flex flex-col gap-1" {...outerProps}>
        <label className="label">{label}</label>
        <input
          {...input}
          disabled={isSubmitting}
          {...props}
          ref={ref}
          className="input input-bordered"
        />

        <ErrorMessage name={name}>
          {(msg) => <span className="text-error text-sm">{msg}</span>}
        </ErrorMessage>
      </div>
    )
  }
)

LabeledTextField.displayName = "LabeledTextField"

export default LabeledTextField
