"use client"

import { ReactNode } from "react"
import { useForm, UseFormReturn, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

export interface FormProps<T extends z.ZodType<any, any>> {
  children: ReactNode | ((form: UseFormReturn<z.infer<T>>) => ReactNode)
  schema: T
  onSubmit: (values: z.infer<T>) => Promise<void | { FORM_ERROR?: string }>
  defaultValues?: Partial<z.infer<T>>
  className?: string
  /** Optional callback called after successful submission (before form reset) */
  onSuccess?: () => void
  /** Whether to reset form after successful submission. Defaults to false. */
  resetOnSuccess?: boolean
}

export const FORM_ERROR = "FORM_ERROR"

export function Form<T extends z.ZodType<any, any>>({
  children,
  schema,
  onSubmit,
  defaultValues,
  className,
  onSuccess,
  resetOnSuccess = false,
}: FormProps<T>) {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  })

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          try {
            const result = await onSubmit(values)
            if (result && result.FORM_ERROR) {
              form.setError("root", { message: result.FORM_ERROR })
            } else {
              // Successful submission
              if (onSuccess) {
                onSuccess()
              }
              if (resetOnSuccess) {
                form.reset()
              }
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "An unexpected error occurred. Please try again."
            form.setError("root", { message: errorMessage })
          }
        })}
        className={className}
      >
        {typeof children === "function" ? children(form) : children}
      </form>
    </FormProvider>
  )
}

export default Form
