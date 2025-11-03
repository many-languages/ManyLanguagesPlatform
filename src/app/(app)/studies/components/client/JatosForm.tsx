import { Form } from "@/src/app/components/Form"
import { JatosFormSchema } from "../../validations"
import { z } from "zod"
import { SelectField, FileField } from "@/src/app/components/fields"

type JatosFormValues = z.infer<typeof JatosFormSchema>

type JatosFormProps = {
  formTitle: string
  submitText: string
  onCancel?: () => void
  cancelText?: string
  /** Handles submission, must return void or errors */
  onSubmit: (values: JatosFormValues) => Promise<void | { FORM_ERROR?: string }>
  defaultValues?: Partial<JatosFormValues>
}

export const jatosWorkerTypeOptions = [
  { value: "SINGLE", label: "Single Personal Links (no reuse)" },
  { value: "MULTIPLE", label: "Multiple Personal Links (reuse allowed)" },
]

export default function JatosForm({
  onCancel,
  cancelText,
  submitText,
  formTitle,
  defaultValues,
  onSubmit,
}: JatosFormProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{formTitle}</h1>

      <Form
        schema={JatosFormSchema}
        defaultValues={
          defaultValues ?? {
            jatosWorkerType: "SINGLE",
            jatosFileName: undefined,
          }
        }
        onSubmit={onSubmit}
        className="space-y-4"
      >
        {(form) => (
          <>
            <SelectField
              name="jatosWorkerType"
              label="Data collection method"
              options={jatosWorkerTypeOptions}
              placeholder="Select data collection method"
            />
            <FileField name="studyFile" label="Upload Study (.jzip)" accept=".jzip,.zip" />
            <p className="text-xs opacity-70">Only .jzip exports from JATOS are accepted.</p>

            {/* Form Actions */}
            <div className="flex gap-2 pt-4">
              {cancelText && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onCancel}
                  disabled={form.formState.isSubmitting}
                >
                  {cancelText}
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Uploading..." : submitText}
              </button>
            </div>

            {/* Global Form Error */}
            {form.formState.errors.root && (
              <div className="alert alert-error">{form.formState.errors.root.message}</div>
            )}
          </>
        )}
      </Form>
    </div>
  )
}
