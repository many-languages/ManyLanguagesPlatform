"use client"

import { memo, useId } from "react"
import { useController, useFormContext } from "react-hook-form"

type SelectFieldValue = string | number

type UseSelectFieldOptions = {
  fieldName: string
}

const useSelectField = ({ fieldName }: UseSelectFieldOptions) => {
  const { control } = useFormContext()
  return useController({
    name: fieldName as never,
    control,
  })
}

type SelectCheckboxProps = {
  value: SelectFieldValue
  fieldName?: string
  ariaLabel?: string
  disabled?: boolean
}

export const SelectCheckbox = memo(
  ({
    value,
    fieldName = "selectedIds",
    ariaLabel = "Select row",
    disabled,
  }: SelectCheckboxProps) => {
    const {
      field: { value: selected = [], onChange },
    } = useSelectField({ fieldName })
    const checkboxId = useId()
    const selectedArray = Array.isArray(selected) ? (selected as SelectFieldValue[]) : []
    const checked = selectedArray.includes(value)

    const toggle = () => {
      if (disabled) return
      const nextValues = checked
        ? selectedArray.filter((item) => item !== value)
        : [...selectedArray, value]
      onChange(nextValues)
    }

    return (
      <label htmlFor={checkboxId} className="label cursor-pointer">
        <input
          id={checkboxId}
          type="checkbox"
          className="checkbox checkbox-primary border-2"
          checked={checked}
          onChange={toggle}
          aria-label={ariaLabel}
          disabled={disabled}
        />
      </label>
    )
  }
)

SelectCheckbox.displayName = "SelectCheckbox"

type SelectAllCheckboxProps = {
  values: SelectFieldValue[]
  fieldName?: string
  ariaLabel?: string
  disabled?: boolean
}

export const SelectAllCheckbox = memo(
  ({
    values,
    fieldName = "selectedIds",
    ariaLabel = "Toggle select all table rows",
    disabled,
  }: SelectAllCheckboxProps) => {
    const {
      field: { value = [], onChange },
    } = useSelectField({ fieldName })
    const checkboxId = useId()
    const selectedArray = Array.isArray(value) ? (value as SelectFieldValue[]) : []

    const isAllSelected = values.length > 0 && values.every((item) => selectedArray.includes(item))
    const isIndeterminate = selectedArray.length > 0 && !isAllSelected

    const handleChange = () => {
      if (disabled) return
      onChange(isAllSelected ? [] : values)
    }

    return (
      <label htmlFor={checkboxId} className="label cursor-pointer">
        <input
          id={checkboxId}
          type="checkbox"
          className="checkbox checkbox-secondary border-2"
          checked={isAllSelected}
          ref={(el) => {
            if (el) el.indeterminate = isIndeterminate
          }}
          onChange={handleChange}
          aria-label={ariaLabel}
          disabled={disabled}
        />
      </label>
    )
  }
)

SelectAllCheckbox.displayName = "SelectAllCheckbox"
