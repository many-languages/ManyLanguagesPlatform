"use client"

import { useFormState } from "react-hook-form"

export function FormErrorDisplay() {
  const { errors } = useFormState()

  if (!errors.root?.message) return null

  return (
    <div className="alert alert-error" role="alert">
      {errors.root.message}
    </div>
  )
}
