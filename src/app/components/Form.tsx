import { useState, ReactNode, PropsWithoutRef } from "react"
import { Formik, FormikProps } from "formik"
import { validateZodSchema } from "blitz"
import { z } from "zod"

export interface FormProps<S extends z.ZodType<any, any>>
  extends Omit<PropsWithoutRef<React.JSX.IntrinsicElements["form"]>, "onSubmit"> {
  children?: ReactNode
  submitText?: string
  schema?: S
  onSubmit: (values: z.infer<S>) => Promise<void | OnSubmitResult>
  initialValues?: FormikProps<z.infer<S>>["initialValues"]
  cancelText?: string
  onCancel?: () => void
}

interface OnSubmitResult {
  FORM_ERROR?: string
  [prop: string]: any
}

export const FORM_ERROR = "FORM_ERROR"

export function Form<S extends z.ZodType<any, any>>({
  children,
  submitText,
  schema,
  initialValues,
  onSubmit,
  cancelText,
  onCancel,
  ...props
}: FormProps<S>) {
  const [formError, setFormError] = useState<string | null>(null)

  return (
    <Formik
      initialValues={initialValues || {}}
      validate={validateZodSchema(schema)}
      onSubmit={async (values, { setErrors }) => {
        const { FORM_ERROR, ...otherErrors } = (await onSubmit(values)) || {}

        if (FORM_ERROR) setFormError(FORM_ERROR)
        if (Object.keys(otherErrors).length > 0) setErrors(otherErrors)
      }}
    >
      {({ handleSubmit, isSubmitting }) => (
        <form onSubmit={handleSubmit} className="form" {...props}>
          {children}

          {formError && (
            <div role="alert" className="text-error mt-2">
              {formError}
            </div>
          )}

          <div className="form-actions flex gap-2 mt-4">
            {submitText && (
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {submitText}
              </button>
            )}

            {cancelText && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onCancel?.()}
                disabled={isSubmitting}
              >
                {cancelText}
              </button>
            )}
          </div>
        </form>
      )}
    </Formik>
  )
}

export default Form
