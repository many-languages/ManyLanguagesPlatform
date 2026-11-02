"use client"

import { forwardRef } from "react"
import { FieldLabel, fieldAriaDescribedBy } from "./FieldLabel"

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  labelHint?: string
  error?: string
  /** Rendered inside the input's box, right-aligned (e.g. a show/hide button). */
  endAdornment?: React.ReactNode
}

/**
 * Presentational labeled text input with the app's shared error styling.
 * `TextField` wraps it for react-hook-form; use it directly for inputs kept in local state.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { id, label, labelHint, error, endAdornment, className, ...props },
  ref
) {
  return (
    <fieldset className="fieldset">
      <FieldLabel htmlFor={id} label={label} hint={labelHint} />
      <div className="relative">
        <input
          ref={ref}
          id={id}
          {...props}
          className={`input input-bordered ${error ? "input-error" : ""} ${
            endAdornment ? "pr-12" : ""
          } ${className || ""}`}
          aria-invalid={error ? true : false}
          aria-describedby={fieldAriaDescribedBy(id, {
            hint: Boolean(labelHint),
            error: Boolean(error),
          })}
        />
        {endAdornment}
      </div>
      {error && (
        <span id={`${id}-error`} className="text-error text-sm" role="alert">
          {error}
        </span>
      )}
    </fieldset>
  )
})

TextInput.displayName = "TextInput"

export default TextInput
