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
}

export const FORM_ERROR = "FORM_ERROR"

export function Form<T extends z.ZodType<any, any>>({
  children,
  schema,
  onSubmit,
  defaultValues,
  className,
}: FormProps<T>) {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  })

  // Add debugging for form state
  console.log("Form state:", {
    isValid: form.formState.isValid,
    errors: form.formState.errors,
    values: form.getValues(),
  })

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(
          async (values) => {
            //console.log("Form submission started with values:", values)
            try {
              const result = await onSubmit(values)
              //console.log("Form submission result:", result)
              if (result && result.FORM_ERROR) {
                form.setError("root", { message: result.FORM_ERROR })
              }
            } catch (error) {
              // console.error("Form submission error:", error)
              form.setError("root", {
                message: "An unexpected error occurred. Please try again.",
              })
            }
          },
          (errors) => {
            console.log("Form validation failed:", errors)
          }
        )}
        className={className}
      >
        {typeof children === "function" ? children(form) : children}
      </form>
    </FormProvider>
  )
}

export default Form
