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
