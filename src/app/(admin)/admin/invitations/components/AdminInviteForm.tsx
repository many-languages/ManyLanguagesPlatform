"use client"

import { useEffect, useState } from "react"
import { useMutation } from "@blitzjs/rpc"
import Form, { FORM_ERROR } from "@/src/app/components/Form"
import TextField from "@/src/app/components/fields/TextField"
import { createAdminInviteFormSchema } from "../validations"
import createAdminInvite from "../mutations/createAdminInvite"

const defaultValues = {
  email: "",
  expiresInHours: 24,
  token: "",
}

export function AdminInviteForm() {
  const [createInviteMutation] = useMutation(createAdminInvite)
  const [lastToken, setLastToken] = useState("")
  const [lastEmail, setLastEmail] = useState("")
  const [inviteLink, setInviteLink] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <Form
      schema={createAdminInviteFormSchema}
      defaultValues={defaultValues}
      resetOnSuccess={false}
      onSubmit={async ({ token, ...values }) => {
        try {
          setIsSubmitting(true)
          const result = await createInviteMutation({
            email: values.email,
            expiresInHours: values.expiresInHours,
          })
          setLastToken(result.token)
          setLastEmail(result.email)
          if (typeof window !== "undefined") {
            setInviteLink(`${window.location.origin}/signup?adminInvite=${result.token}`)
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to create admin invite."
          setIsSubmitting(false)
          return { FORM_ERROR: message }
        }
        setIsSubmitting(false)
      }}
    >
      {(form) => {
        useEffect(() => {
          if (lastToken) {
            form.setValue("token", lastToken, { shouldDirty: false })
          }
        }, [form, lastToken])

        return (
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex-1 space-y-4">
              <TextField
                name="email"
                label="Admin email"
                type="email"
                placeholder="admin@example.com"
                required
              />
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
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Generating..." : "Generate invite"}
                </button>
              </div>
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
        )
      }}
    </Form>
  )
}
