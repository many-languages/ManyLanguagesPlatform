import { useState, ReactNode, PropsWithoutRef } from "react"
import { Formik, FormikProps } from "formik"
import { validateZodSchema } from "blitz"
import { z } from "zod"

export interface FormProps<S extends z.ZodType<any, any>>
  extends Omit<PropsWithoutRef<React.JSX.IntrinsicElements["form"]>, "onSubmit"> {
  children?: ReactNode
  submitText?: string
  schema?: S
  onSubmit: (
    values: z.infer<S>,
    helpers?: {
      setSubmitting: (isSubmitting: boolean) => void
      setErrors: (errors: any) => void
      resetForm: () => void
      submitForm: () => void
    }
  ) => Promise<void | OnSubmitResult>
  initialValues?: FormikProps<z.infer<S>>["initialValues"]
  cancelText?: string
  onCancel?: () => void
  title?: string
  borderless?: boolean
  alignSubmitRight?: boolean
  separateActions?: boolean
}

interface OnSubmitResult {
  FORM_ERROR?: string
  [prop: string]: any
}

export const FORM_ERROR = "FORM_ERROR"

export function Form<S extends z.ZodType<any, any>>({
  title,
  children,
  submitText,
  schema,
  initialValues,
  onSubmit,
  cancelText,
  onCancel,
  borderless,
  alignSubmitRight,
  separateActions,
  ...props
}: FormProps<S>) {
  const [formError, setFormError] = useState<string | null>(null)

  return (
    <Formik
      initialValues={initialValues || {}}
      validate={validateZodSchema(schema)}
      onSubmit={async (values, { setErrors, setSubmitting, resetForm, submitForm }) => {
        const { FORM_ERROR, ...otherErrors } =
          (await onSubmit(values, { setSubmitting, setErrors, resetForm, submitForm })) || {}

        if (FORM_ERROR) setFormError(FORM_ERROR)
        if (Object.keys(otherErrors).length > 0) setErrors(otherErrors)
      }}
    >
      {({ handleSubmit, isSubmitting }) => (
        <form onSubmit={handleSubmit} className="form" {...props}>
          <fieldset
            className={`fieldset w-full rounded-box ${
              borderless ? "border-0 bg-transparent p-0" : "border border-base-300 bg-base-200 p-4"
            }`}
          >
            {title && <legend className="fieldset-legend">{title}</legend>}
            <div className="flex flex-col gap-6">{children}</div>

            {formError && (
              <div role="alert" className="text-error mt-2">
                {formError}
              </div>
            )}

            <div
              className={`form-actions flex gap-2 mt-4 ${
                separateActions ? "justify-between" : alignSubmitRight ? "justify-end" : ""
              }`}
            >
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

              {submitText && (
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {submitText}
                </button>
              )}
            </div>
          </fieldset>
        </form>
      )}
    </Formik>
  )
}

export default Form
