import { RouteData } from "../types"
import { RouteDataSchema } from "../validations"

export function isRouteData(data: unknown): data is RouteData {
  return RouteDataSchema.safeParse(data).success
}
