"use client"

import { useMemo, useState, useEffect, useRef, type Dispatch, type SetStateAction } from "react"
import Link from "next/link"
import type { Route } from "next"
import { useMutation, useQuery } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import type { UseFormReturn } from "react-hook-form"
import { z } from "zod"
import {
  TextField,
  TextInput,
  SelectField,
  FormSubmitButton,
  FormErrorDisplay,
} from "@/src/components/ui/fields"
import { Form, FORM_ERROR } from "@/src/components/ui/Form"
import validateAdminInviteToken from "@/src/features/admin-invitations/queries/validateAdminInviteToken"
import { getDefaultAuthenticatedPath } from "@/src/lib/auth/routing"
import signup from "../../mutations/signup"
import { Signup, email as emailSchema, PASSWORD_REQUIREMENTS_HINT } from "../../validations"
import { SIGNUP_ROLE_OPTIONS_WITH_ADMIN, SIGNUP_USER_ROLE } from "../../domain/userRoles"

/**
 * Client-side form schema. For the Administrator role the email comes from the invite, so it is
 * left to the token checks in onSubmit (and to the server) instead of failing on an empty field.
 */
const SignupFormSchema = Signup.extend({ email: z.string() }).superRefine((data, ctx) => {
  if (data.role === SIGNUP_USER_ROLE.ADMIN) return

  const result = emailSchema.safeParse(data.email)
  if (!result.success) {
    for (const issue of result.error.issues) {
      ctx.addIssue({ ...issue, path: ["email"] })
    }
  }
})

interface AdminInviteValidation {
  valid: boolean
  error?: string
  inviteEmail?: string
}

interface SignupFormFieldsProps {
  adminInviteToken: string
  form: UseFormReturn<z.infer<typeof SignupFormSchema>>
  setAdminInviteToken: Dispatch<SetStateAction<string>>
  tokenValidation: AdminInviteValidation | null
}

function SignupFormFields({
  adminInviteToken,
  form,
  setAdminInviteToken,
  tokenValidation,
}: SignupFormFieldsProps) {
  const isAdminRole = form.watch("role") === SIGNUP_USER_ROLE.ADMIN
  const isAdminInvite = isAdminRole && tokenValidation?.valid === true
  const tokenInputRef = useRef<HTMLInputElement>(null)
  const wasAdminRoleRef = useRef(isAdminRole)
  const stashedEmailRef = useRef("")

  // The invite decides the email: fill it in once the token is valid
  useEffect(() => {
    if (adminInviteToken && tokenValidation?.valid && tokenValidation.inviteEmail) {
      form.setValue("email", tokenValidation.inviteEmail)
      form.setValue("role", SIGNUP_USER_ROLE.ADMIN)
    }
  }, [adminInviteToken, form, tokenValidation])

  useEffect(() => {
    if (isAdminRole && !wasAdminRoleRef.current) {
      // The invite decides the email: set aside what was typed and restore it on switching back
      stashedEmailRef.current = form.getValues("email")
      form.setValue("email", "")
      tokenInputRef.current?.focus()
    }
    if (!isAdminRole && wasAdminRoleRef.current) {
      setAdminInviteToken("")
      form.setValue("email", stashedEmailRef.current)
      stashedEmailRef.current = ""
    }
    wasAdminRoleRef.current = isAdminRole
  }, [isAdminRole, form, setAdminInviteToken])

  return (
    <div className="fieldset bg-base-200 border-base-300 rounded-box w-md border p-4">
      {isAdminInvite && (
        <div className="alert alert-info mb-4">
          <div>
            <p className="font-medium">Admin Invitation Detected</p>
            <p className="text-sm">
              You are signing up as an administrator. Please complete the form below.
            </p>
          </div>
        </div>
      )}

      {isAdminRole && (
        <TextInput
          id="adminInviteToken"
          ref={tokenInputRef}
          type="text"
          label="Admin Invite Token"
          placeholder="Paste your admin invite token here"
          className="w-full font-mono"
          value={adminInviteToken}
          onChange={(event) => setAdminInviteToken(event.target.value)}
          error={
            adminInviteToken && tokenValidation && !tokenValidation.valid
              ? tokenValidation.error || "Invalid token"
              : undefined
          }
        />
      )}

      <TextField
        name="email"
        label="Email"
        placeholder={isAdminRole ? "Filled in from your invite once the token is valid" : "Email"}
        type="email"
        className="w-full"
        disabled={isAdminRole}
      />
      <TextField
        name="password"
        label="Password"
        labelHint={PASSWORD_REQUIREMENTS_HINT}
        placeholder="Password"
        type="password"
        className="w-full"
      />

      <SelectField
        name="role"
        label="Role"
        options={SIGNUP_ROLE_OPTIONS_WITH_ADMIN}
        placeholder="Select your role"
        className="w-full"
      />

      <FormSubmitButton
        submitText="Create Account"
        loadingText="Creating Account"
        className="btn btn-primary w-full"
      />

      <FormErrorDisplay />
    </div>
  )
}

interface SignupFormProps {
  /** Token from the `?adminInvite=` link, validated on the server for the first render. */
  initialInviteToken?: string
  initialInviteValidation?: AdminInviteValidation | null
}

export const SignupForm = ({
  initialInviteToken = "",
  initialInviteValidation = null,
}: SignupFormProps) => {
  const [signupMutation] = useMutation(signup)
  const router = useRouter()
  const [adminInviteToken, setAdminInviteToken] = useState<string>(initialInviteToken)
  const [tokenValidation, setTokenValidation] = useState<AdminInviteValidation | null>(
    initialInviteValidation
  )

  const [debouncedToken, setDebouncedToken] = useState<string>(initialInviteToken)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedToken(adminInviteToken)
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [adminInviteToken])

  const [validationResult] = useQuery(
    validateAdminInviteToken,
    { token: debouncedToken || "" },
    { enabled: debouncedToken.length > 0 }
  )

  useEffect(() => {
    if (validationResult) {
      setTokenValidation(validationResult)
    } else if (!debouncedToken) {
      setTokenValidation(null)
    }
  }, [validationResult, debouncedToken])

  const defaultValues = useMemo(
    () => ({
      email: initialInviteValidation?.valid ? initialInviteValidation.inviteEmail ?? "" : "",
      password: "",
      role: initialInviteToken ? SIGNUP_USER_ROLE.ADMIN : SIGNUP_USER_ROLE.PARTICIPANT,
    }),
    [initialInviteToken, initialInviteValidation]
  )

  return (
    <div className="space-y-4">
      <h1 className="font-black text-3xl">Create an Account</h1>

      <Form
        schema={SignupFormSchema}
        defaultValues={defaultValues}
        onSubmit={async (values) => {
          if (values.role === SIGNUP_USER_ROLE.ADMIN) {
            if (!adminInviteToken.trim()) {
              return {
                [FORM_ERROR]: "Enter your admin invite token to sign up as an administrator.",
              }
            }

            if (!tokenValidation?.valid || !values.email) {
              return {
                [FORM_ERROR]:
                  tokenValidation?.error ??
                  "Your admin invite token has not been verified yet. Please wait a moment and try again.",
              }
            }
          }

          try {
            const result = await signupMutation({
              ...values,
              adminInviteToken: adminInviteToken || undefined,
            })

            if (result.error) {
              return { [FORM_ERROR]: result.error }
            }

            if (!result.user) {
              return { [FORM_ERROR]: "Signup succeeded but user data was missing." }
            }

            router.push(getDefaultAuthenticatedPath(result.user.role) as Route)
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "An unexpected error occurred. Please try again."
            return { [FORM_ERROR]: errorMessage }
          }
        }}
        className="space-y-4"
      >
        {(form) => (
          <SignupFormFields
            adminInviteToken={adminInviteToken}
            form={form}
            setAdminInviteToken={setAdminInviteToken}
            tokenValidation={tokenValidation}
          />
        )}
      </Form>

      <div>
        Or <Link href="/login">Login</Link>
      </div>
    </div>
  )
}
