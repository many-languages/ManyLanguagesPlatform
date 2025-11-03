"use client"

import { PromiseReturnType } from "blitz"
import Link from "next/link"
import { TextField } from "@/src/app/components/fields"
import { Form, FORM_ERROR } from "@/src/app/components/Form"
import login from "../../mutations/login"
import { Login } from "../../validations"
import { useMutation } from "@blitzjs/rpc"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import type { Route } from "next"

type LoginFormProps = {
  onSuccess?: (user: PromiseReturnType<typeof login>) => void
}

export const LoginForm = (props: LoginFormProps) => {
  const [loginMutation] = useMutation(login)
  const router = useRouter()
  const next = useSearchParams()?.get("next")

  return (
    <div className="space-y-6">
      <h1 className="font-black text-xl">Login</h1>

      <Form
        schema={Login}
        defaultValues={{ email: "", password: "" }}
        onSubmit={async (values) => {
          const result = await loginMutation(values)

          if (result.error) {
            return { [FORM_ERROR]: result.error }
          }

          router.refresh()
          if (next) {
            router.push(next as Route)
          } else {
            router.push("/dashboard")
          }
        }}
        className="space-y-4"
      >
        {(form) => (
          <>
            <TextField name="email" label="Email" placeholder="Email" type="email" />
            <TextField name="password" label="Password" placeholder="Password" type="password" />

            <div>
              <Link href={"/forgot-password"}>Forgot your password?</Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Logging in..." : "Login"}
            </button>

            {form.formState.errors.root && (
              <div className="alert alert-error">{form.formState.errors.root.message}</div>
            )}
          </>
        )}
      </Form>

      <div>
        Or <Link href="/signup">Sign Up</Link>
      </div>
    </div>
  )
}
