import type { RouteData } from "../types"

export const resolveRouteHref = (routeData: RouteData): string => {
  const { path, params } = routeData
  if (!params || Object.keys(params).length === 0) {
    return path
  }

  let resolvedPath = path
  const remainingParams = { ...params }

  resolvedPath = resolvedPath.replace(/\[([^\]]+)\]/g, (_match, key: string) => {
    if (!(key in remainingParams)) {
      throw new Error(`Missing route parameter '${key}' for path '${path}'`)
    }
    const value = remainingParams[key]
    delete remainingParams[key]
    return encodeURIComponent(String(value))
  })

  const searchParams = new URLSearchParams()
  Object.entries(remainingParams).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)))
    } else {
      searchParams.append(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${resolvedPath}?${queryString}` : resolvedPath
}
