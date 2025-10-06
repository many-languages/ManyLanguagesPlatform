import { forwardRef, PropsWithoutRef } from "react"
import { useField, useFormikContext, ErrorMessage } from "formik"

export interface LabeledSelectFieldProps
  extends PropsWithoutRef<React.JSX.IntrinsicElements["select"]> {
  /** Field name. */
  name: string
  /** Field label. */
  label: string
  description?: string
  type?: "number" | "string"
  options: any[]
  optionText: string
  optionValue: string
  outerProps?: PropsWithoutRef<React.JSX.IntrinsicElements["div"]>
  multiple?: boolean
  disableFirstOption?: boolean
}

export const LabeledSelectField = forwardRef<HTMLSelectElement, LabeledSelectFieldProps>(
  (
    {
      name,
      label,
      description,
      outerProps,
      options,
      optionText,
      optionValue,
      multiple,
      disableFirstOption = true,
      type = "number",
      ...props
    },
    ref
  ) => {
    const [field, meta] = useField({
      name,
      type: multiple ? "select-multiple" : "select-one",
      parse: (value: any) => {
        if (value === "") return null
        return type === "number" ? Number(value) : value
      },
    })
    const { isSubmitting } = useFormikContext()

    const firstOptionText = disableFirstOption ? "Please select an option" : "Select none"

    return (
      <div className="flex flex-col gap-1" {...outerProps}>
        <label className="label">{label}</label>
        <select
          {...field}
          disabled={isSubmitting}
          multiple={multiple}
          {...props}
          ref={ref}
          className="select"
        >
          <option disabled={disableFirstOption} value="">
            {firstOptionText}
          </option>
          {options?.map((v) => (
            <option key={v.id ?? v[optionValue]} value={v[optionValue]}>
              {v[optionText]}
            </option>
          ))}
        </select>
        {description && <span className="label">{description}</span>}

        <ErrorMessage name={name}>
          {(msg) => <span className="text-error text-sm">{msg}</span>}
        </ErrorMessage>
      </div>
    )
  }
)

LabeledSelectField.displayName = "LabeledSelectField"

export default LabeledSelectField
