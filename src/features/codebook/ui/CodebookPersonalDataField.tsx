interface CodebookPersonalDataFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: "sm" | "md"
  disabled?: boolean
}

export default function CodebookPersonalDataField({
  checked,
  onChange,
  size = "md",
  disabled = false,
}: CodebookPersonalDataFieldProps) {
  return (
    <label className="label cursor-pointer gap-2 p-0">
      <span className="label-text text-sm">Personal data</span>
      <input
        type="checkbox"
        className={`checkbox checkbox-primary${size === "sm" ? " checkbox-sm" : ""}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  )
}
