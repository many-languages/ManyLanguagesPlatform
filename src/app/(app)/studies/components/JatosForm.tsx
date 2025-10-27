import { Form } from "src/app/components/Form"
import { JatosFormSchema, StudyFormSchema } from "../validations"
import { z } from "zod"
import LabeledSelectField from "@/src/app/components/LabeledSelectField"
import FileUploadField from "@/src/app/components/FileUploadField"

type JatosFormValues = z.infer<typeof JatosFormSchema>

type JatosFormProps = {
  formTitle: string
  submitText: string
  onCancel?: () => void
  cancelText?: string
  /** Handles submission, must return void or errors */
  onSubmit: (
    values: JatosFormValues,
    helpers?: {
      setSubmitting: (isSubmitting: boolean) => void
      setErrors: (errors: any) => void
      resetForm: () => void
      submitForm: () => void
    }
  ) => Promise<void | { FORM_ERROR?: string }>
  initialValues?: JatosFormValues
  borderless?: boolean
  alignSubmitRight?: boolean
  separateActions?: boolean
}

export const jatosWorkerTypeOptions = [
  { id: 0, label: "Single Personal Links (no reuse)", value: "SINGLE" },
  { id: 1, label: "Multiple Personal Links (reuse allowed)", value: "MULTIPLE" },
]

export default function JatosForm({
  onCancel,
  cancelText,
  submitText,
  formTitle,
  initialValues,
  onSubmit,
  borderless = false,
  alignSubmitRight = false,
  separateActions = false,
}: JatosFormProps) {
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{formTitle}</h1>

      <Form
        submitText={submitText}
        cancelText={cancelText}
        onCancel={onCancel}
        schema={JatosFormSchema}
        initialValues={
          initialValues ?? {
            jatosWorkerType: "SINGLE",
            jatosFileName: undefined,
          }
        }
        onSubmit={onSubmit}
        borderless={borderless}
        alignSubmitRight={alignSubmitRight}
        separateActions={separateActions}
      >
        <LabeledSelectField
          name="jatosWorkerType"
          label="Data collection method"
          options={jatosWorkerTypeOptions}
          optionText={"label"}
          optionValue={"value"}
        />
        <FileUploadField
          name="studyFile"
          label="Upload Study (.jzip)"
          // existingFileName={initialValues?.jatosFileName}
        />
        <p className="text-xs opacity-70">Only .jzip exports from JATOS are accepted.</p>
      </Form>
    </>
  )
}
