"use client"

import React from "react"
import { useFormContext } from "react-hook-form"
import Textarea from "./Textarea"

interface FormTextAreaFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name"> {
  name: string
  label: string
  error?: string
}

export const FormTextAreaField = ({
  name,
  label,
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
