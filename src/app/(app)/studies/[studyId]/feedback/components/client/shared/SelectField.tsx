"use client"

interface SelectFieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  disabled?: boolean
  className?: string
  selectClassName?: string
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className = "",
  selectClassName = "",
}: SelectFieldProps) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}
      <select
        className={`select select-bordered w-full ${selectClassName}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
