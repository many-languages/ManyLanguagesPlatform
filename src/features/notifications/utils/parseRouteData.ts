import { RouteData } from "../types"
import { RouteDataSchema } from "../validations"

export const parseRouteData = (value: unknown): RouteData | null => {
  if (!value) return null

  if (typeof value === "string") {
    try {
      return RouteDataSchema.parse(JSON.parse(value))
    } catch {
      return null
    }
  }

  const parsed = RouteDataSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
