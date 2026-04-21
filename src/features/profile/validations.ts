import { z } from "zod"

export const firstname = z
  .string()
  .max(100, "Firstname must be at most 100 characters")
  .transform((str) => str.trim())

export const lastname = z
  .string()
  .max(100, "Lastname must be at most 100 characters")
  .transform((str) => str.trim())

export const username = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(50, "Username must be at most 50 characters")
  .transform((str) => str.trim())

// Update User (profile edits)
export const UpdateProfile = z.object({
  firstname: firstname.optional().nullable(),
  lastname: lastname.optional().nullable(),
  username: username.optional().nullable(),
})
