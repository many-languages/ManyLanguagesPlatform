"use client"

import { useMemo } from "react"
import { TextField, FormSubmitButton, FormErrorDisplay } from "@/src/app/components/fields"
import { Form, FORM_ERROR } from "@/src/app/components/Form"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import updateProfile from "../../mutations/updateProfile"
import { UpdateProfile } from "../../validations"
import toast from "react-hot-toast"

export const EditProfileForm = () => {
  const [updateProfileMutation] = useMutation(updateProfile)
  const router = useRouter()

  const defaultValues = useMemo(() => ({ firstname: "", lastname: "", username: "" }), [])

  return (
    <div className="space-y-6">
      <Form
        schema={UpdateProfile}
        defaultValues={defaultValues}
        onSubmit={async (values) => {
          try {
            await updateProfileMutation(values)
            toast.success("Profile updated successfully")
            router.push("/profile")
          } catch (error: any) {
            const errorMessage =
              error?.message || "Sorry, we had an unexpected error. Please try again."
            return {
              [FORM_ERROR]: errorMessage,
            }
          }
        }}
        className="space-y-4"
      >
        <>
          <TextField name="username" label="Username" placeholder="Username" />
          <TextField name="firstname" label="Firstname" placeholder="Firstname" />
          <TextField name="lastname" label="Lastname" placeholder="Lastname" />

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => router.push("/profile")}
            >
              Cancel
            </button>
            <FormSubmitButton
              submitText="Update"
              loadingText="Updating..."
              className="btn btn-primary"
            />
          </div>

          <FormErrorDisplay />
        </>
      </Form>
    </div>
  )
}
