import { useEffect, useRef } from "react"

interface CodebookPersonalDataFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: "sm" | "md"
  disabled?: boolean
  /** Mixed state (some but not all covered variables are personal). Overrides `checked` visually. */
  indeterminate?: boolean
}

export default function CodebookPersonalDataField({
  checked,
  onChange,
  size = "md",
  disabled = false,
  indeterminate = false,
}: CodebookPersonalDataFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label className="label cursor-pointer gap-2 p-0">
      <span className="label-text text-sm">Personal data</span>
      <input
        ref={inputRef}
        type="checkbox"
        className={`checkbox checkbox-primary${size === "sm" ? " checkbox-sm" : ""}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  )
}
