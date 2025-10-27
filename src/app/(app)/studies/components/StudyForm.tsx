import { Form } from "src/app/components/Form"
import { LabeledTextField } from "src/app/components/LabeledTextField"
import DateField from "src/app/components/DateField"
import { StudyFormSchema } from "../validations"
import { z } from "zod"

type StudyFormValues = z.infer<typeof StudyFormSchema>

type StudyFormProps = {
  formTitle: string
  submitText: string
  onCancel?: () => void
  cancelText?: string
  /** Handles submission, must return void or errors */
  onSubmit: (values: StudyFormValues) => Promise<void | { FORM_ERROR?: string }>
  initialValues?: StudyFormValues
  borderless?: boolean
  alignSubmitRight?: boolean
}

export default function StudyForm({
  onCancel,
  cancelText,
  submitText,
  formTitle,
  initialValues,
  onSubmit,
  borderless = false,
  alignSubmitRight = false,
}: StudyFormProps) {
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">{formTitle}</h1>

      <Form
        submitText={submitText}
        cancelText={cancelText}
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
          }
        }
        onSubmit={onSubmit}
        borderless={borderless}
        alignSubmitRight={alignSubmitRight}
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
      </Form>
    </>
  )
}
