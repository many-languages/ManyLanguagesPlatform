import { RouteData } from "../types"
import { isRouteData } from "./isRouteData"

export const parseRouteData = (value: unknown): RouteData | null => {
  if (!value) return null

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return isRouteData(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  if (isRouteData(value)) {
    return value
  }

  return null
}
