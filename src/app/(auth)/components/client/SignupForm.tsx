"use client"

import { useMemo, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  TextField,
  SelectField,
  FormSubmitButton,
  FormErrorDisplay,
} from "@/src/app/components/fields"
import { Form, FORM_ERROR } from "@/src/app/components/Form"
import signup from "../../mutations/signup"
import { Signup } from "../../validations"
import { useMutation, useQuery } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { UserRole } from "db"
import Link from "next/link"
import validateAdminInviteToken from "@/src/app/(admin)/admin/invitations/queries/validateAdminInviteToken"

export const RoleOptions = [
  { value: UserRole.RESEARCHER, label: "Researcher" },
  { value: UserRole.PARTICIPANT, label: "Participant" },
]

export const AdminRoleOptions = [{ value: UserRole.ADMIN, label: "Administrator" }]

export const SignupForm = () => {
  const [signupMutation] = useMutation(signup)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [adminInviteToken, setAdminInviteToken] = useState<string>("")
  const [showTokenField, setShowTokenField] = useState(false)
  const [tokenValidation, setTokenValidation] = useState<{
    valid: boolean
    error?: string
    inviteEmail?: string
  } | null>(null)

  // Get token from URL params
  useEffect(() => {
    const tokenFromUrl = searchParams.get("adminInvite")
    if (tokenFromUrl) {
      setAdminInviteToken(tokenFromUrl)
      setShowTokenField(true)
    }
  }, [searchParams])

  // Debounce token for validation
  const [debouncedToken, setDebouncedToken] = useState<string>("")
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedToken(adminInviteToken)
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [adminInviteToken])

  // Validate token using useQuery (only when debouncedToken exists)
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
      email: "",
      password: "",
      role: UserRole.PARTICIPANT,
    }),
    []
  )

  const isAdminInvite = tokenValidation?.valid === true

  return (
    <div className="space-y-4">
      <h1 className="font-black text-3xl">Create an Account</h1>

      {isAdminInvite && (
        <div className="alert alert-info">
          <div>
            <p className="font-medium">Admin Invitation Detected</p>
            <p className="text-sm">
              You are signing up as an administrator. Please complete the form below.
            </p>
          </div>
        </div>
      )}

      <Form
        schema={Signup}
        defaultValues={defaultValues}
        onSubmit={async (values) => {
          try {
            const result = await signupMutation({
              ...values,
              adminInviteToken: adminInviteToken || undefined,
            })

            if (result.error) {
              return { [FORM_ERROR]: result.error }
            }

            router.refresh()
            router.push(isAdminInvite ? "/admin" : "/dashboard")
          } catch (error: any) {
            const errorMessage = error?.message || "An unexpected error occurred. Please try again."
            return { [FORM_ERROR]: errorMessage }
          }
        }}
        className="space-y-4"
      >
        {(form) => {
          // Update form values when token is validated
          useEffect(() => {
            if (tokenValidation?.valid && tokenValidation.inviteEmail) {
              form.setValue("email", tokenValidation.inviteEmail)
              form.setValue("role", UserRole.ADMIN)
            } else if (!adminInviteToken) {
              form.setValue("role", UserRole.PARTICIPANT)
            }
          }, [tokenValidation, form, adminInviteToken])

          return (
            <>
              <div className="fieldset bg-base-200 border-base-300 rounded-box w-md border p-4">
                <TextField
                  name="email"
                  label="Email"
                  placeholder="Email"
                  type="email"
                  className="w-full"
                  disabled={isAdminInvite}
                />
                <TextField
                  name="password"
                  label="Password"
                  placeholder="Password"
                  type="password"
                  className="w-full"
                />

                {!isAdminInvite && (
                  <SelectField
                    name="role"
                    label="Role"
                    options={RoleOptions}
                    placeholder="Select your role"
                    className="w-full"
                  />
                )}

                {isAdminInvite && (
                  <SelectField
                    name="role"
                    label="Role"
                    options={AdminRoleOptions}
                    placeholder="Administrator"
                    className="w-full"
                    disabled
                  />
                )}

                {!isAdminInvite && !showTokenField && (
                  <button
                    type="button"
                    onClick={() => setShowTokenField(true)}
                    className="mt-2 mb-6 block text-left cursor-pointer"
                  >
                    Have an admin invite token?
                  </button>
                )}

                {!isAdminInvite && showTokenField && (
                  <div className="mt-2 mb-6 space-y-2">
                    <label className="label">
                      <span className="label-text font-medium">Admin Invite Token (optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Paste your admin invite token here"
                      className="input input-bordered w-full font-mono"
                      value={adminInviteToken}
                      onChange={(e) => setAdminInviteToken(e.target.value)}
                    />
                    {adminInviteToken && tokenValidation && !tokenValidation.valid && (
                      <div className="alert alert-error">
                        <div>
                          <p className="text-sm">{tokenValidation.error || "Invalid token"}</p>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowTokenField(false)
                        setAdminInviteToken("")
                      }}
                      className="text-sm text-base-content/60 hover:text-base-content underline"
                    >
                      Hide
                    </button>
                  </div>
                )}

                <FormSubmitButton
                  submitText="Create Account"
                  loadingText="Creating Account"
                  className="btn btn-primary w-full"
                />

                <FormErrorDisplay />
              </div>
            </>
          )
        }}
      </Form>

      <div>
        Or <Link href="/login">Login</Link>
      </div>
    </div>
  )
}
