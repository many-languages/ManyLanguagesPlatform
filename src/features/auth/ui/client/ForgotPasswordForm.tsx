"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"
import { TextField, FormSubmitButton, FormErrorDisplay } from "@/src/components/ui/fields"
import { Form, FORM_ERROR } from "@/src/components/ui/Form"
import forgotPassword from "../../mutations/forgotPassword"
import { ForgotPassword } from "../../validations"

export function ForgotPasswordForm() {
  const [forgotPasswordMutation, { isSuccess }] = useMutation(forgotPassword)

  const defaultValues = useMemo(() => ({ email: "" }), [])

  return (
    <div className="space-y-4">
      <h1 className="font-black text-3xl">Forgot your password?</h1>
      <>
        {isSuccess ? (
          <div>
            <h2>Request Submitted</h2>
            <p>
              If your email is in our system, you will receive instructions to reset your password
              shortly.
            </p>
          </div>
        ) : (
          <Form
            schema={ForgotPassword}
            defaultValues={defaultValues}
            onSubmit={async (values) => {
              try {
                await forgotPasswordMutation(values)
                toast.success("Password reset instructions sent to your email")
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error
                    ? error.message
                    : "Sorry, we had an unexpected error. Please try again."
                return {
                  [FORM_ERROR]: errorMessage,
                }
              }
            }}
            className="space-y-4"
          >
            <div className="fieldset  bg-base-200 border-base-300 rounded-box w-md border p-4">
              <TextField
                name="email"
                label="Email"
                placeholder="Email"
                type="email"
                className="w-full"
              />

              <FormSubmitButton
                submitText="Send Reset Password"
                loadingText="Sending"
                className="btn btn-primary mt-6 w-full"
              />

              <FormErrorDisplay />
            </div>
          </Form>
        )}
      </>

      <div>
        Or <Link href="/login">Login</Link>
      </div>
    </div>
  )
}
