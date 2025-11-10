"use client"

import { useMemo } from "react"
import { PromiseReturnType } from "blitz"
import Link from "next/link"
import { TextField, FormSubmitButton, FormErrorDisplay } from "@/src/app/components/fields"
import { Form, FORM_ERROR } from "@/src/app/components/Form"
import login from "../../mutations/login"
import { Login } from "../../validations"
import { useMutation } from "@blitzjs/rpc"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { usePendingNavigation } from "@/src/app/hooks/usePendingNavigation"

type LoginFormProps = {
  onSuccess?: (user: PromiseReturnType<typeof login>) => void
}

export const LoginForm = (props: LoginFormProps) => {
  const [loginMutation] = useMutation(login)
  const router = useRouter()
  const next = useSearchParams()?.get("next")
  const { isPending: isNavigating, startNavigation } = usePendingNavigation()

  const defaultValues = useMemo(() => ({ email: "", password: "" }), [])

  return (
    <div className="space-y-6">
      <h1 className="font-black text-xl">Login</h1>

      <Form
        schema={Login}
        defaultValues={defaultValues}
        onSubmit={async (values) => {
          try {
            const result = await loginMutation(values)

            if (result.error) {
              return { [FORM_ERROR]: result.error }
            }

            startNavigation(() => {
              router.refresh()
              if (next) {
                router.push(next as Route)
              } else {
                router.push("/dashboard")
              }
            })
          } catch (error: any) {
            const errorMessage = error?.message || "An unexpected error occurred. Please try again."
            return { [FORM_ERROR]: errorMessage }
          }
        }}
        className="space-y-4"
      >
        <>
          <TextField name="email" label="Email" placeholder="Email" type="email" />
          <TextField name="password" label="Password" placeholder="Password" type="password" />

          <div>
            <Link href={"/forgot-password"}>Forgot your password?</Link>
          </div>

          <FormSubmitButton
            submitText="Login"
            loadingText="Logging in..."
            className="btn btn-primary w-full"
            isPending={isNavigating}
          />

          <FormErrorDisplay />
        </>
      </Form>

      <div>
        Or <Link href="/signup">Sign Up</Link>
      </div>
    </div>
  )
}
