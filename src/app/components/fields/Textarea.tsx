"use client"

import React from "react"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = ({ label, error, className, id, ...props }: TextareaProps) => {
  const fieldError = error
  const textareaId = id ?? props.name

  return (
    <fieldset className="fieldset">
      {label && (
        <label htmlFor={textareaId} className="label text-base font-medium">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        {...props}
        className={`textarea textarea-bordered ${fieldError ? "textarea-error" : ""} ${
          className || ""
        }`}
        aria-invalid={fieldError ? true : false}
        aria-describedby={fieldError && props.name ? `${props.name}-error` : undefined}
      />
      {fieldError && props.name && (
        <span id={`${props.name}-error`} className="text-error text-sm" role="alert">
          {fieldError}
        </span>
      )}
      {fieldError && !props.name && (
        <span className="text-error text-sm" role="alert">
          {fieldError}
        </span>
      )}
    </fieldset>
  )
}

Textarea.displayName = "Textarea"

export default Textarea
