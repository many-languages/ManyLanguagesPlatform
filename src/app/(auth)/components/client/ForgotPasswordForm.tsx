"use client"

import { TextField } from "@/src/app/components/fields"
import { Form, FORM_ERROR } from "@/src/app/components/Form"
import { ForgotPassword } from "../../validations"
import forgotPassword from "../../mutations/forgotPassword"
import { useMutation } from "@blitzjs/rpc"

export function ForgotPasswordForm() {
  const [forgotPasswordMutation, { isSuccess }] = useMutation(forgotPassword)

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
            defaultValues={{ email: "" }}
            onSubmit={async (values) => {
              try {
                await forgotPasswordMutation(values)
              } catch (error: any) {
                return {
                  [FORM_ERROR]: "Sorry, we had an unexpected error. Please try again.",
                }
              }
            }}
            className="space-y-4"
          >
            {(form) => (
              <>
                <TextField name="email" label="Email" placeholder="Email" type="email" />

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Sending..." : "Send Reset Password Instructions"}
                </button>

                {form.formState.errors.root && (
                  <div className="alert alert-error">{form.formState.errors.root.message}</div>
                )}
              </>
            )}
          </Form>
        )}
      </>
    </div>
  )
}
