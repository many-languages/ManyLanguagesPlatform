"use client"

import { InformationCircleIcon } from "@heroicons/react/24/outline"

export interface ControlledSelectOption {
  value: string
  label: string
}

export interface ControlledSelectFieldProps {
  label?: string
  hint?: string
  value: string
  onChange: (value: string) => void
  options: ControlledSelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  selectClassName?: string
}

export function ControlledSelectField({
  label,
  hint,
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className = "",
  selectClassName = "",
}: ControlledSelectFieldProps) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          <span className="label-text flex items-center gap-1">
            <span>{label}</span>
            {hint ? (
              <span
                className="tooltip tooltip-top inline-flex cursor-help"
                data-tip={hint}
                aria-hidden
              >
                <InformationCircleIcon className="h-4 w-4 text-base-content/60" aria-hidden />
              </span>
            ) : null}
          </span>
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

export default ControlledSelectField
