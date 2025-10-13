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
  /** Handles submission, must return void or errors */
  onSubmit: (values: JatosFormValues) => Promise<void | { FORM_ERROR?: string }>
  initialValues?: JatosFormValues
}

export const jatosWorkerTypeOptions = [
  { id: 0, label: "Single Personal Links (no reuse)", value: "SINGLE" },
  { id: 1, label: "Multiple Personal Links (reuse allowed)", value: "MULTIPLE" },
]

export default function JatosForm({
  onCancel,
  submitText,
  formTitle,
  initialValues,
  onSubmit,
}: JatosFormProps) {
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{formTitle}</h1>

      <Form
        submitText={submitText}
        cancelText="Cancel"
        onCancel={onCancel}
        schema={JatosFormSchema}
        initialValues={
          initialValues ?? {
            jatosWorkerType: "SINGLE",
          }
        }
        onSubmit={onSubmit}
      >
        <LabeledSelectField
          name="jatosWorkerType"
          label="Data collection method"
          options={jatosWorkerTypeOptions}
          optionText={"label"}
          optionValue={"value"}
        />
        <FileUploadField name="studyFile" label="Upload Study (.jzip)" />
        <p className="text-xs opacity-70">Only .jzip exports from JATOS are accepted.</p>
      </Form>
    </>
  )
}
