"use client"
import { TextField } from "@/src/app/components/fields"
import { Form, FORM_ERROR } from "@/src/app/components/Form"
import { ResetPassword } from "../../validations"
import resetPassword from "../../mutations/resetPassword"
import { useMutation } from "@blitzjs/rpc"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams?.get("token")?.toString()
  const [resetPasswordMutation, { isSuccess }] = useMutation(resetPassword)

  return (
    <div className="space-y-6">
      <h1 className="mb-4 font-black text-xl">Set a New Password</h1>

      {isSuccess ? (
        <div>
          <h2>Password Reset Successfully</h2>
          <p>
            Go to the <Link href="/">homepage</Link>
          </p>
        </div>
      ) : (
        <Form
          schema={ResetPassword}
          defaultValues={{
            password: "",
            passwordConfirmation: "",
            token,
          }}
          onSubmit={async (values) => {
            try {
              await resetPasswordMutation({ ...values, token })
            } catch (error: any) {
              if (error.name === "ResetPasswordError") {
                return {
                  [FORM_ERROR]: error.message,
                }
              } else {
                return {
                  [FORM_ERROR]: "Sorry, we had an unexpected error. Please try again.",
                }
              }
            }
          }}
          className="space-y-4"
        >
          {(form) => (
            <>
              <TextField name="password" label="New Password" type="password" />
              <TextField name="passwordConfirmation" label="Confirm New Password" type="password" />

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Resetting..." : "Reset Password"}
              </button>

              {form.formState.errors.root && (
                <div className="alert alert-error">{form.formState.errors.root.message}</div>
              )}
            </>
          )}
        </Form>
      )}
    </div>
  )
}
