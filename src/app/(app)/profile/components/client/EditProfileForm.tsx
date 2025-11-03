"use client"

import { TextField } from "@/src/app/components/fields"
import { Form, FORM_ERROR } from "@/src/app/components/Form"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import updateProfile from "../../mutations/updateProfile"
import { UpdateProfile } from "../../validations"

export const EditProfileForm = () => {
  const [updateProfileMutation] = useMutation(updateProfile)
  const router = useRouter()

  return (
    <div className="space-y-6">
      <Form
        schema={UpdateProfile}
        defaultValues={{ firstname: "", lastname: "", username: "" }}
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
        className="space-y-4"
      >
        {(form) => (
          <>
            <TextField name="username" label="Username" placeholder="Username" />
            <TextField name="firstname" label="Firstname" placeholder="Firstname" />
            <TextField name="lastname" label="Lastname" placeholder="Lastname" />

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.push("/profile")}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Updating..." : "Update"}
              </button>
            </div>

            {form.formState.errors.root && (
              <div className="alert alert-error">{form.formState.errors.root.message}</div>
            )}
          </>
        )}
      </Form>
    </div>
  )
}
