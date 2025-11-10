"use client"

import { useFormContext } from "react-hook-form"

interface FormSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  submitText: string
  loadingText?: string
  isPending?: boolean
}

export function FormSubmitButton({
  submitText,
  loadingText,
  className,
  disabled,
  isPending,
  ...props
}: FormSubmitButtonProps) {
  const { formState } = useFormContext()
  const { isSubmitting } = formState
  const pending = isSubmitting || Boolean(isPending)

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
      aria-busy={pending}
      {...props}
    >
      {pending ? loadingText || "Submitting..." : submitText}
    </button>
  )
}
