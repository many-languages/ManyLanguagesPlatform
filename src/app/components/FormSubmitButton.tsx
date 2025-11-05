"use client"

import { useFormContext } from "react-hook-form"

interface FormSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  submitText: string
  loadingText?: string
}

export function FormSubmitButton({
  submitText,
  loadingText,
  className,
  disabled,
  ...props
}: FormSubmitButtonProps) {
  const { formState } = useFormContext()
  const { isSubmitting } = formState

  return (
    <button type="submit" disabled={isSubmitting || disabled} className={className} {...props}>
      {isSubmitting ? loadingText || "Submitting..." : submitText}
    </button>
  )
}
