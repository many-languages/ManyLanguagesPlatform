"use client"
import { LabeledTextField } from "src/app/components/LabeledTextField"
import { Form, FORM_ERROR } from "src/app/components/Form"
import signup from "../mutations/signup"
import { Signup } from "../validations"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import LabeledSelectField from "@/src/app/components/LabeledSelectField"
import { UserRole } from "db"
import Link from "next/link"

type SignupFormProps = {
  onSuccess?: () => void
}

export const RoleOptions = [
  { id: 0, value: UserRole.RESEARCHER, label: "Researcher" },
  { id: 1, value: UserRole.PARTICIPANT, label: "Participant" },
]

export const SignupForm = (props: SignupFormProps) => {
  const [signupMutation] = useMutation(signup)
  const router = useRouter()

  return (
    <>
      <h1 className="font-black text-xl">Create an Account</h1>

      <Form
        submitText="Create Account"
        schema={Signup}
        initialValues={{ email: "", password: "", role: UserRole.PARTICIPANT }}
        onSubmit={async (values) => {
          try {
            await signupMutation(values)
            router.refresh()
            router.push("/dashboard")
          } catch (error: any) {
            if (error.code === "P2002" && error.meta?.target?.includes("email")) {
              // This error comes from Prisma
              return { email: "This email is already being used" }
            } else {
              return { [FORM_ERROR]: error.toString() }
            }
          }
        }}
      >
        <LabeledTextField name="email" label="Email" placeholder="Email" type="text" />
        <LabeledTextField name="password" label="Password" placeholder="Password" type="password" />
        <LabeledSelectField
          name="role"
          label="Role"
          options={RoleOptions}
          optionText="label"
          optionValue="value"
        />
      </Form>

      <div>
        Or <Link href="/login">Login</Link>
      </div>
    </>
  )
}
