import type { ExtractionObservation } from "../types"

/** RFC 4180-style escaping for a single CSV field. */
export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Sort row_key_id segments: study result / component order uses compareObservationRows elsewhere. */
export function compareRowKeyId(a: string, b: string): number {
  const segsA = a.split("|")
  const segsB = b.split("|")
  const n = Math.max(segsA.length, segsB.length)
  for (let i = 0; i < n; i++) {
    const sa = segsA[i] ?? ""
    const sb = segsB[i] ?? ""
    const ma = sa.match(/#(\d+)$/)
    const mb = sb.match(/#(\d+)$/)
    if (ma && mb) {
      const da = parseInt(ma[1], 10)
      const db = parseInt(mb[1], 10)
      if (da !== db) return da - db
    }
    const cmp = sa.localeCompare(sb)
    if (cmp !== 0) return cmp
  }
  return 0
}

/**
 * Human-readable column titles: `variableName` from the approved extraction.
 * If two variable keys share the same name, disambiguate with ` (${variableKey})`.
 */
export function buildUniqueDisplayNames(
  variableKeys: string[],
  variableKeyToName: Map<string, string>
): Map<string, string> {
  const nameToKeys = new Map<string, string[]>()
  for (const k of variableKeys) {
    const base = variableKeyToName.get(k) ?? k
    const list = nameToKeys.get(base) ?? []
    list.push(k)
    nameToKeys.set(base, list)
  }
  const out = new Map<string, string>()
  for (const [, keyList] of nameToKeys) {
    if (keyList.length === 1) {
      out.set(keyList[0], variableKeyToName.get(keyList[0]) ?? keyList[0])
    } else {
      for (const k of keyList) {
        out.set(k, `${variableKeyToName.get(k) ?? k} (${k})`)
      }
    }
  }
  return out
}

/** Stable ordering for long-format rows (matches wide export grouping intent). */
export function compareObservationExportOrder(
  a: ExtractionObservation,
  b: ExtractionObservation
): number {
  const aSr = String(a.scopeKeys.studyResultId ?? "")
  const bSr = String(b.scopeKeys.studyResultId ?? "")
  const na = Number(aSr)
  const nb = Number(bSr)
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
  const cmpSr = aSr.localeCompare(bSr)
  if (cmpSr !== 0) return cmpSr
  if (a.scopeKeys.componentId !== b.scopeKeys.componentId) {
    return a.scopeKeys.componentId - b.scopeKeys.componentId
  }
  const rk = compareRowKeyId(a.rowKeyId, b.rowKeyId)
  if (rk !== 0) return rk
  return a.variableKey.localeCompare(b.variableKey)
}
