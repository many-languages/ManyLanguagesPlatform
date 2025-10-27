import { forwardRef, PropsWithoutRef } from "react"
import { useField, useFormikContext, ErrorMessage } from "formik"

export interface FileUploadFieldProps
  extends PropsWithoutRef<React.JSX.IntrinsicElements["input"]> {
  /** Field name. */
  name: string
  /** Field label. */
  label: string
  outerProps?: PropsWithoutRef<React.JSX.IntrinsicElements["div"]>
  accept?: string
}

export const FileUploadField = forwardRef<HTMLInputElement, FileUploadFieldProps>(
  ({ name, label, outerProps, accept = ".jzip,.zip", ...props }, ref) => {
    const [, , helpers] = useField(name)
    const { isSubmitting } = useFormikContext()

    return (
      <div className="flex flex-col gap-1" {...outerProps}>
        <label htmlFor={name} className="label">
          {label}
        </label>

        <input
          id={name}
          name={name}
          type="file"
          accept={accept}
          ref={ref}
          disabled={isSubmitting}
          className="file-input file-input-bordered"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null
            helpers.setValue(file) // store File object in Formik state
          }}
          {...props}
        />

        <ErrorMessage name={name}>
          {(msg) => <span className="text-error text-sm">{msg}</span>}
        </ErrorMessage>
      </div>
    )
  }
)

FileUploadField.displayName = "FileUploadField"

export default FileUploadField
