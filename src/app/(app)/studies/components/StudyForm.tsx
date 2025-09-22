import { Form } from "src/app/components/Form"
import { LabeledTextField } from "src/app/components/LabeledTextField"
import DateField from "src/app/components/DateField"
import { CreateStudy } from "../validations"
import { z } from "zod"

type StudyFormValues = z.infer<typeof CreateStudy>

type StudyFormProps = {
  formTitle: string
  submitText: string
  onCancel?: () => void
  /** Handles submission, must return void or errors */
  onSubmit: (values: StudyFormValues) => Promise<void | { FORM_ERROR?: string }>
  initialValues?: StudyFormValues
}

export default function StudyForm({
  onCancel,
  submitText,
  formTitle,
  initialValues,
  onSubmit,
}: StudyFormProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{formTitle}</h1>

      <Form
        submitText={submitText}
        cancelText="Cancel"
        onCancel={onCancel}
        schema={CreateStudy}
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
      >
        <LabeledTextField
          name="title"
          label="Title"
          placeholder="Study title"
          type="text"
          withBackground={false}
        />
        <LabeledTextField
          name="description"
          label="Description"
          placeholder="Short description"
          type="text"
          withBackground={false}
        />
        <DateField name="startDate" label="Start Date" withBackground={false} />
        <DateField name="endDate" label="End Date" withBackground={false} />
        <LabeledTextField
          name="sampleSize"
          label="Sample Size"
          placeholder="100"
          type="number"
          withBackground={false}
        />
        <LabeledTextField
          name="payment"
          label="Payment"
          placeholder="e.g., $10 voucher"
          type="text"
          withBackground={false}
        />
        <LabeledTextField
          name="ethicalPermission"
          label="Ethical Permission"
          placeholder="https://example.com/approval"
          withBackground={false}
        />
        <LabeledTextField
          name="length"
          label="Expected Duration"
          placeholder="30 minutes"
          type="text"
          withBackground={false}
        />
      </Form>
    </div>
  )
}
