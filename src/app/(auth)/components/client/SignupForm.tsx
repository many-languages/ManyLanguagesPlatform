"use client"

import { TextField, SelectField } from "@/src/app/components/fields"
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

  return (
    <div className="space-y-6">
      <h1 className="font-black text-xl">Create an Account</h1>

      <Form
        schema={Signup}
        defaultValues={{ email: "", password: "", role: UserRole.PARTICIPANT }}
        onSubmit={async (values) => {
          const result = await signupMutation(values)

          if (result.error) {
            return { [FORM_ERROR]: result.error }
          }

          router.refresh()
          router.push("/dashboard")
        }}
        className="space-y-4"
      >
        {(form) => (
          <>
            <TextField name="email" label="Email" placeholder="Email" type="email" />
            <TextField name="password" label="Password" placeholder="Password" type="password" />
            <SelectField
              name="role"
              label="Role"
              options={RoleOptions}
              placeholder="Select your role"
            />

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Creating Account..." : "Create Account"}
            </button>

            {form.formState.errors.root && (
              <div className="alert alert-error">{form.formState.errors.root.message}</div>
            )}
          </>
        )}
      </Form>

      <div>
        Or <Link href="/login">Login</Link>
      </div>
    </div>
  )
}
