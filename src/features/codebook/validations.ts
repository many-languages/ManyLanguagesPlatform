import { z } from "zod"

const Id = z.number().int().positive()

export const GetCodebookDataSchema = z.object({
  studyId: Id,
})

export const UpdateVariableCodebookSchema = z.object({
  studyId: Id,
  variables: z.array(
    z.object({
      variableKey: z.string(),
      variableName: z.string(),
      dslKey: z.string(),
      description: z.string().nullable(),
      personalData: z.boolean(),
    })
  ),
  groups: z.array(
    z.object({
      groupKey: z.string(),
      description: z.string().nullable(),
      personalData: z.boolean(),
    })
  ),
})

export type GetCodebookDataInput = z.infer<typeof GetCodebookDataSchema>
export type UpdateVariableCodebookInput = z.infer<typeof UpdateVariableCodebookSchema>
