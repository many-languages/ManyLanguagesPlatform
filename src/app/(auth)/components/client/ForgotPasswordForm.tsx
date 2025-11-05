"use client"

import { useMemo } from "react"
import { TextField, FormSubmitButton, FormErrorDisplay } from "@/src/app/components/fields"
import { Form, FORM_ERROR } from "@/src/app/components/Form"
import { ForgotPassword } from "../../validations"
import forgotPassword from "../../mutations/forgotPassword"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"

export function ForgotPasswordForm() {
  const [forgotPasswordMutation, { isSuccess }] = useMutation(forgotPassword)

  const defaultValues = useMemo(() => ({ email: "" }), [])

  return (
    <div className="space-y-6">
      <h1>Forgot your password?</h1>
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
              <TextField name="email" label="Email" placeholder="Email" type="email" />

              <FormSubmitButton
                submitText="Send Reset Password Instructions"
                loadingText="Sending..."
                className="btn btn-primary w-full"
              />

              <FormErrorDisplay />
            </>
          </Form>
        )}
      </>
    </div>
  )
}
