"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { z } from "zod"
import type { UseFormReturn } from "react-hook-form"
import Form from "@/src/components/ui/Form"
import TextField from "@/src/components/ui/fields/TextField"
import { Alert } from "@/src/components/ui/Alert"
import { FormErrorDisplay } from "@/src/components/ui/FormErrorDisplay"
import { adminInvitePath } from "../constants"
import { createAdminInviteFormSchema } from "../validations"
import createAdminInvite from "../mutations/createAdminInvite"
import getAdminInviteEmailStatus from "../queries/getAdminInviteEmailStatus"

type FormValues = z.infer<typeof createAdminInviteFormSchema>

const defaultValues = {
  email: "",
  expiresInHours: 24,
  token: "",
}

const emailSchema = z.string().email()

/** Tells the superadmin what inviting the typed email will do, before they submit. */
function useInviteEmailStatus(rawEmail: string) {
  const [debouncedEmail, setDebouncedEmail] = useState("")

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedEmail(rawEmail.trim()), 400)
    return () => clearTimeout(timeoutId)
  }, [rawEmail])

  const enabled = emailSchema.safeParse(debouncedEmail).success
  const [status] = useQuery(
    getAdminInviteEmailStatus,
    { email: debouncedEmail },
    { enabled, suspense: false }
  )

  // Ignore a status that belongs to an email the user has since edited.
  const isCurrent = enabled && debouncedEmail === rawEmail.trim()
  return isCurrent ? status ?? null : null
}

interface AdminInviteFormFieldsProps {
  form: UseFormReturn<FormValues>
  lastToken: string
  lastEmail: string
  inviteLink: string
  emailSent: boolean
}

function AdminInviteFormFields({
  form,
  lastToken,
  lastEmail,
  inviteLink,
  emailSent,
}: AdminInviteFormFieldsProps) {
  const emailStatus = useInviteEmailStatus(form.watch("email") ?? "")
  const blocked = emailStatus?.eligible === false

  return (
    <>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex-1 space-y-4">
          <TextField
            name="email"
            label="Admin email"
            type="email"
            placeholder="admin@example.com"
            required
          />
          {emailStatus && (
            <Alert variant={emailStatus.eligible ? "info" : "warning"}>
              <p className="text-sm">{emailStatus.message}</p>
            </Alert>
          )}
          <TextField
            name="expiresInHours"
            label="Expires in (hours)"
            type="number"
            min={1}
            max={168}
            step={1}
            inputMode="numeric"
          />
          <div className="flex gap-2 items-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={form.formState.isSubmitting || blocked}
              aria-busy={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Generating..." : "Generate invite"}
            </button>
          </div>
          <FormErrorDisplay />
        </div>

        <div className="divider md:hidden" />
        <div className="divider divider-horizontal hidden md:flex" />

        <div className="flex-1 space-y-8">
          {lastToken ? (
            <>
              <p className="text-lg font-semibold text-base-content">{lastEmail}</p>
              <TextField name="token" label="Invitation token" readOnly className="font-mono" />
              <div className="alert alert-info">
                <div>
                  <p className="font-medium">Share this link securely:</p>
                  <p className="font-mono text-sm break-all">{inviteLink}</p>
                  <p className="text-sm text-base-content/70 mt-2">
                    Copy it now: tokens are stored only as a hash, so this one can&apos;t be shown
                    again. Use &quot;New link&quot; on the invite below to get a fresh one later.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="alert alert-neutral shadow-sm">
              <div>
                <p className="font-medium">No new admin invites</p>
                <p className="text-sm text-base-content/70">
                  Generate an invite to preview the token and shareable link.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {emailSent && (
        <div className="mt-4 w-full">
          <p className="text-sm text-success">Invitation email has been sent.</p>
        </div>
      )}
    </>
  )
}

export function AdminInviteForm() {
  const router = useRouter()
  const [createInviteMutation] = useMutation(createAdminInvite)
  const setTokenField = useRef<((token: string) => void) | null>(null)
  const [lastToken, setLastToken] = useState("")
  const [lastEmail, setLastEmail] = useState("")
  const [inviteLink, setInviteLink] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  return (
    <Form
      schema={createAdminInviteFormSchema}
      defaultValues={defaultValues}
      resetOnSuccess={false}
      onSubmit={async ({ token, ...values }) => {
        void token
        try {
          setEmailSent(false)
          const result = await createInviteMutation({
            email: values.email,
            expiresInHours: values.expiresInHours,
          })

          if (!result.ok) {
            return { FORM_ERROR: result.error }
          }

          setLastToken(result.token)
          setTokenField.current?.(result.token)
          setLastEmail(result.email)
          setEmailSent(true)
          if (typeof window !== "undefined") {
            setInviteLink(
              `${window.location.origin}${adminInvitePath(result.token, result.existingAccount)}`
            )
          }
          router.refresh()
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to create admin invite."
          setEmailSent(false)
          return { FORM_ERROR: message }
        }
      }}
    >
      {(form) => {
        setTokenField.current = (token) => form.setValue("token", token, { shouldDirty: false })
        return (
          <AdminInviteFormFields
            form={form}
            lastToken={lastToken}
            lastEmail={lastEmail}
            inviteLink={inviteLink}
            emailSent={emailSent}
          />
        )
      }}
    </Form>
  )
}
