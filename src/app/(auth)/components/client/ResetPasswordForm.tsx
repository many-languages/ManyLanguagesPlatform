"use client"

import { useMemo } from "react"
import { TextField, FormSubmitButton, FormErrorDisplay } from "@/src/app/components/fields"
import { Form, FORM_ERROR } from "@/src/app/components/Form"
import { ResetPassword } from "../../validations"
import resetPassword from "../../mutations/resetPassword"
import { useMutation } from "@blitzjs/rpc"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams?.get("token")?.toString()
  const [resetPasswordMutation, { isSuccess }] = useMutation(resetPassword)

  const defaultValues = useMemo(
    () => ({
      password: "",
      passwordConfirmation: "",
      token: token || "",
    }),
    [token]
  )

  return (
    <div className="space-y-4">
      <h1 className="font-black text-3xl">Set a New Password</h1>

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
          defaultValues={defaultValues}
          onSubmit={async (values) => {
            try {
              await resetPasswordMutation({ ...values, token })
              toast.success("Password reset successfully!")
            } catch (error: any) {
              const errorMessage =
                error.name === "ResetPasswordError"
                  ? error.message
                  : "Sorry, we had an unexpected error. Please try again."
              return {
                [FORM_ERROR]: errorMessage,
              }
            }
          }}
          className="space-y-4"
        >
          <div className="fieldset bg-base-200 border-base-300 rounded-box w-md border p-4">
            <TextField name="password" label="New Password" type="password" className="w-full" />
            <TextField
              name="passwordConfirmation"
              label="Confirm New Password"
              type="password"
              className="w-full"
            />

            <FormSubmitButton
              submitText="Reset Password"
              loadingText="Resetting"
              className="btn btn-primary w-full"
            />

            <FormErrorDisplay />
          </div>
        </Form>
      )}

      <div>
        Or <Link href="/login">Login</Link>
      </div>
    </div>
  )
}
