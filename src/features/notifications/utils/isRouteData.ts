import { RouteData } from "../types"

export function isRouteData(data: any): data is RouteData {
  return typeof data === "object" && data !== null && "path" in data
}
