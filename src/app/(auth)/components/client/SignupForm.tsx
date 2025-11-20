"use client"

import { useMemo } from "react"
import {
  TextField,
  SelectField,
  FormSubmitButton,
  FormErrorDisplay,
} from "@/src/app/components/fields"
import { Form, FORM_ERROR } from "@/src/app/components/Form"
import signup from "../../mutations/signup"
import { Signup } from "../../validations"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { UserRole } from "db"
import Link from "next/link"

type SignupFormProps = {
  onSuccess?: () => void
}

export const RoleOptions = [
  { value: UserRole.RESEARCHER, label: "Researcher" },
  { value: UserRole.PARTICIPANT, label: "Participant" },
]

export const SignupForm = (props: SignupFormProps) => {
  const [signupMutation] = useMutation(signup)
  const router = useRouter()

  const defaultValues = useMemo(() => ({ email: "", password: "", role: UserRole.PARTICIPANT }), [])

  return (
    <div className="space-y-4">
      <h1 className="font-black text-3xl">Create an Account</h1>

      <Form
        schema={Signup}
        defaultValues={defaultValues}
        onSubmit={async (values) => {
          try {
            const result = await signupMutation(values)

            if (result.error) {
              return { [FORM_ERROR]: result.error }
            }

            router.refresh()
            router.push("/dashboard")
          } catch (error: any) {
            const errorMessage = error?.message || "An unexpected error occurred. Please try again."
            return { [FORM_ERROR]: errorMessage }
          }
        }}
        className="space-y-4"
      >
        <div className="fieldset  bg-base-200 border-base-300 rounded-box w-md border p-4">
          <TextField name="email" label="Email" placeholder="Email" type="email" />
          <TextField name="password" label="Password" placeholder="Password" type="password" />
          <SelectField
            name="role"
            label="Role"
            options={RoleOptions}
            placeholder="Select your role"
          />

          <FormSubmitButton
            submitText="Create Account"
            loadingText="Creating Account"
            className="btn btn-primary w-full mt-6"
          />

          <FormErrorDisplay />
        </div>
      </Form>

      <div>
        Or <Link href="/login">Login</Link>
      </div>
    </div>
  )
}
