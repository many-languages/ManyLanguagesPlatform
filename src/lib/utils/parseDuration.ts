export function parseDuration(duration: string): number {
  if (!duration) return NaN
  const parts = duration.split(":").map(Number)
  if (parts.length !== 3) return NaN
  const [h, m, s] = parts
  return h * 3600 + m * 60 + s
}
