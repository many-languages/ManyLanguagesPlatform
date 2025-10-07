import { Form } from "src/app/components/Form"
import { LabeledTextField } from "src/app/components/LabeledTextField"
import DateField from "src/app/components/DateField"
import { StudyFormSchema } from "../validations"
import { z } from "zod"
import FileUploadField from "@/src/app/components/FileUploadField"
import LabeledSelectField from "@/src/app/components/LabeledSelectField"

type StudyFormValues = z.infer<typeof StudyFormSchema>

type StudyFormProps = {
  formTitle: string
  submitText: string
  onCancel?: () => void
  /** Handles submission, must return void or errors */
  onSubmit: (values: StudyFormValues) => Promise<void | { FORM_ERROR?: string }>
  initialValues?: StudyFormValues
}

export const jatosWorkerTypeOptions = [
  { id: 0, label: "Single Personal Links (no reuse)", value: "SINGLE" },
  { id: 1, label: "Multiple Personal Links (reuse allowed)", value: "MULTIPLE" },
]

export default function StudyForm({
  onCancel,
  submitText,
  formTitle,
  initialValues,
  onSubmit,
}: StudyFormProps) {
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{formTitle}</h1>

      <Form
        submitText={submitText}
        cancelText="Cancel"
        onCancel={onCancel}
        schema={StudyFormSchema}
        initialValues={
          initialValues ?? {
            title: "",
            description: "",
            startDate: "",
            endDate: "",
            sampleSize: 0,
            payment: "",
            ethicalPermission: "",
            length: "",
            jatosWorkerType: "SINGLE",
          }
        }
        onSubmit={onSubmit}
      >
        <LabeledTextField name="title" label="Title" placeholder="Study title" type="text" />
        <LabeledTextField
          name="description"
          label="Description"
          placeholder="Short description"
          type="text"
        />
        <DateField name="startDate" label="Start Date" />
        <DateField name="endDate" label="End Date" />
        <LabeledTextField name="sampleSize" label="Sample Size" placeholder="100" type="number" />
        <LabeledTextField
          name="payment"
          label="Payment"
          placeholder="e.g., $10 voucher"
          type="text"
        />
        <LabeledTextField
          name="ethicalPermission"
          label="Ethical Permission"
          placeholder="https://example.com/approval"
        />
        <LabeledTextField
          name="length"
          label="Expected Duration"
          placeholder="30 minutes"
          type="text"
        />
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
