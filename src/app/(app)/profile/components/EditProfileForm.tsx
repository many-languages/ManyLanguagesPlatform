"use client"
import { LabeledTextField } from "src/app/components/LabeledTextField"
import { Form, FORM_ERROR } from "src/app/components/Form"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import updateProfile from "../mutations/updateProfile"
import { UpdateProfile } from "../validations"

export const EditProfileForm = () => {
  const [updateProfileMutation] = useMutation(updateProfile)
  const router = useRouter()

  return (
    <>
      <Form
        submitText="Update"
        cancelText="Cancel"
        schema={UpdateProfile}
        initialValues={{ firstname: "", lastname: "", username: "" }}
        onSubmit={async (values) => {
          try {
            await updateProfileMutation(values)
            router.push("/profile")
          } catch (error: any) {
            return {
              [FORM_ERROR]:
                "Sorry, we had an unexpected error. Please try again. - " + error.toString(),
            }
          }
        }}
        onCancel={() => {
          router.push("/profile")
        }}
      >
        <LabeledTextField name="username" label="Username" placeholder="Username" type="text" />
        <LabeledTextField name="firstname" label="Firstname" placeholder="Firstname" type="text" />
        <LabeledTextField name="lastname" label="Lastname" placeholder="Lastname" type="text" />
      </Form>
    </>
  )
}
