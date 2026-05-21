import { z } from "zod"

export const createAdminInviteInputSchema = z.object({
  email: z.string().email("Provide a valid email address"),
  expiresInHours: z.coerce.number().int().min(1).max(168),
})

export const createAdminInviteFormSchema = createAdminInviteInputSchema.extend({
  token: z.string().optional(),
})

export type CreateAdminInviteInput = z.infer<typeof createAdminInviteInputSchema>

export const AdminInviteSchema = z.object({
  selectedInviteIds: z.array(z.number()).min(1, "Select at least one invite"),
})

export type AdminInviteFormValues = z.infer<typeof AdminInviteSchema>

export const SendAdminInviteRemindersSchema = z.object({
  inviteIds: z.array(z.number().int().positive()).min(1, "Select at least one invite"),
})

export const RevokeAdminInvitesSchema = z.object({
  inviteIds: z.array(z.number().int().positive()).min(1, "Select at least one invite"),
})

export type SendAdminInviteRemindersInput = z.infer<typeof SendAdminInviteRemindersSchema>
export type RevokeAdminInvitesInput = z.infer<typeof RevokeAdminInvitesSchema>
