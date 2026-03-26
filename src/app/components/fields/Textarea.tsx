"use client"

import React from "react"
import { FieldLabel, fieldAriaDescribedBy } from "./FieldLabel"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  /** Extra context shown next to the label (info icon + tooltip, screen reader text). */
  labelHint?: string
  error?: string
}

export const Textarea = ({ label, labelHint, error, className, id, ...props }: TextareaProps) => {
  const fieldError = error
  const textareaId = id ?? props.name

  return (
    <fieldset className="fieldset">
      {label && textareaId && (
        <FieldLabel htmlFor={String(textareaId)} label={label} hint={labelHint} />
      )}
      <textarea
        id={textareaId}
        {...props}
        className={`textarea textarea-bordered ${fieldError ? "textarea-error" : ""} ${
          className || ""
        }`}
        aria-invalid={fieldError ? true : false}
        aria-describedby={
          textareaId
            ? fieldAriaDescribedBy(String(textareaId), {
                hint: Boolean(labelHint),
                error: Boolean(fieldError),
              })
            : undefined
        }
      />
      {fieldError && textareaId && (
        <span id={`${textareaId}-error`} className="text-error text-sm" role="alert">
          {fieldError}
        </span>
      )}
      {fieldError && !textareaId && (
        <span className="text-error text-sm" role="alert">
          {fieldError}
        </span>
      )}
    </fieldset>
  )
}

Textarea.displayName = "Textarea"

export default Textarea
