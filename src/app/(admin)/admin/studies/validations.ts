import { z } from "zod"

export const AdminStudySchema = z.object({
  selectedStudyIds: z.array(z.number()).min(1, "Select at least one study"),
})

export type AdminStudyFormValues = z.infer<typeof AdminStudySchema>
