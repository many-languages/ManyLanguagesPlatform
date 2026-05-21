/** Non-negative integer page index from `?page=` (invalid values → 0). */
export function parsePageQueryParam(value: string | undefined): number {
  const rawPage = Number(value ?? 0)
  return Number.isFinite(rawPage) && rawPage >= 0 ? Math.floor(rawPage) : 0
}
