"use client"

import React from "react"
import { useFormContext } from "react-hook-form"
import Textarea from "./Textarea"

interface FormTextAreaFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name"> {
  name: string
  label: string
  /** Extra context shown next to the label (info icon + tooltip, screen reader text). */
  labelHint?: string
  error?: string
}

export const FormTextAreaField = ({
  name,
  label,
  labelHint,
  error,
  className,
  ...props
}: FormTextAreaFieldProps) => {
  const {
    register,
    formState: { isSubmitting, errors },
  } = useFormContext()

  const fieldError = (errors[name]?.message as string) || error

  return (
    <Textarea
      id={name}
      label={label}
      labelHint={labelHint}
      error={fieldError}
      {...register(name)}
      {...props}
      disabled={isSubmitting}
      className={className}
    />
  )
}

FormTextAreaField.displayName = "FormTextAreaField"

export default FormTextAreaField
