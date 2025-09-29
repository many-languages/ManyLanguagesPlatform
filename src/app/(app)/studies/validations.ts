import { z } from "zod"

export const Id = z.number().int().positive()
export type IdInput = z.infer<typeof Id>

export const CreateStudy = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  sampleSize: z.number().int().positive("Must be a positive number"),
  payment: z.string().min(1, "Payment description is required"),
  ethicalPermission: z.string().url("Must be a valid URL"),
  length: z.string().min(1, "Study length is required"),
})

export const UpdateStudy = z.object({
  id: Id,
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  sampleSize: z.number().min(1, "Sample size must be at least 1"),
  payment: z.string().optional(),
  ethicalPermission: z.string().url("Must be a valid URL"),
  length: z.string().optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
})

export const DeleteStudy = z.object({
  id: Id,
})

export const GetStudies = z.object({
  skip: z.number().min(0).default(0),
  take: z.number().min(1).max(100).default(100),
})
export type GetStudiesInput = z.infer<typeof GetStudies>
