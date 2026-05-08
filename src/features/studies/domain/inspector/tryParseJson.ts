export function tryParseJson(
  valueJson: string
): { ok: true; value: unknown } | { ok: false; raw: string } {
  try {
    return { ok: true, value: JSON.parse(valueJson) }
  } catch {
    return { ok: false, raw: valueJson }
  }
}
