import { useFormContext, Controller } from "react-hook-form"

interface FileFieldProps {
  name: string
  label: string
  accept?: string
  error?: string
}

export const FileField = ({ name, label, accept = ".jzip,.zip", error }: FileFieldProps) => {
  const {
    control,
    formState: { isSubmitting, errors },
  } = useFormContext()

  const fieldError = error || (errors[name]?.message as string)

  return (
    <fieldset className="fieldset">
      <label className="label">{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            type="file"
            accept={accept}
            disabled={isSubmitting}
            className={`file-input file-input-bordered ${fieldError ? "file-input-error" : ""}`}
            onChange={(e) => field.onChange(e.target.files?.[0] || null)}
          />
        )}
      />
      {fieldError && <span className="text-error text-sm">{fieldError}</span>}
    </fieldset>
  )
}

FileField.displayName = "FileField"

export default FileField
