export type KeySeg = { kind: "key"; key: string }
export type IndexSeg = { kind: "index"; index: number }
export type PathSeg = KeySeg | IndexSeg

export type JsonPath = readonly PathSeg[]

/**
 * Path builder helpers (immutable).
 * Use these while walking JSON.
 */
export const Path = {
  root(): JsonPath {
    return []
  },

  key(path: JsonPath, key: string): JsonPath {
    return [...path, { kind: "key", key }]
  },

  index(path: JsonPath, index: number): JsonPath {
    return [...path, { kind: "index", index }]
  },

  parent(path: JsonPath): JsonPath | null {
    if (path.length === 0) return null
    return path.slice(0, -1)
  },

  depth(path: JsonPath): number {
    // root depth 0, each segment adds one step
    return Math.max(0, path.length)
  },

  /**
   * Returns the first key segment if present.
   * Useful for UI grouping, e.g. topLevel = "trials".
   */
  topLevelKey(path: JsonPath): string | null {
    const first = path[0]
    return first?.kind === "key" ? first.key : null
  },

  /**
   * Last key in the path (often your variable's leaf name, e.g. "rt").
   */
  lastKey(path: JsonPath): string | null {
    for (let i = path.length - 1; i >= 0; i--) {
      const seg = path[i]
      if (seg.kind === "key") return seg.key
    }
    return null
  },

  /**
   * True if `prefix` is a prefix of `path` (segment-wise).
   * Handy if you later add subtree scoping.
   */
  startsWith(path: JsonPath, prefix: JsonPath): boolean {
    if (prefix.length > path.length) return false
    for (let i = 0; i < prefix.length; i++) {
      const a = path[i]
      const b = prefix[i]
      if (a.kind !== b.kind) return false
      if (a.kind === "key" && (b as KeySeg).key !== (a as KeySeg).key) return false
      if (a.kind === "index" && (b as IndexSeg).index !== (a as IndexSeg).index) return false
    }
    return true
  },
}

/**
 * Rendering options.
 * If you set `quoteUnsafeKeys: true`, keys with dots/brackets/spaces will be rendered as ["..."].
 * This avoids ambiguity in logs and storage.
 */
export type RenderOptions = {
  quoteUnsafeKeys?: boolean
  rootToken?: string // default "$"
}

const DEFAULT_RENDER: Required<RenderOptions> = {
  quoteUnsafeKeys: true,
  rootToken: "$",
}

function isSimpleIdentifier(key: string): boolean {
  // allows a.b style; if you want stricter, keep it as-is
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
}

function escapeQuotedKey(key: string): string {
  // minimal escaping for display and storage stability
  return key.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

/**
 * Convert a concrete JsonPath to a provenance string, e.g.:
 * trials[17].rt
 * ["weird.key"][0].rt
 */
export function toSourcePath(path: JsonPath, opts?: RenderOptions): string {
  const o = { ...DEFAULT_RENDER, ...opts }
  if (path.length === 0) return o.rootToken

  let out = ""
  for (const seg of path) {
    if (seg.kind === "key") {
      if (!out) {
        // first segment
        out += renderKey(seg.key, o)
      } else {
        // subsequent key segments
        out += renderKeyWithDot(seg.key, o)
      }
    } else {
      out += `[${seg.index}]`
    }
  }
  return out
}

/**
 * Convert a concrete JsonPath to a variable grouping key where indices are wildcarded, e.g.:
 * trials[*].rt
 * responses[*].items[*].choice
 */
export function toVariableKey(path: JsonPath, opts?: RenderOptions): string {
  const o = { ...DEFAULT_RENDER, ...opts }
  if (path.length === 0) return o.rootToken

  let out = ""
  for (const seg of path) {
    if (seg.kind === "key") {
      if (!out) out += renderKey(seg.key, o)
      else out += renderKeyWithDot(seg.key, o)
    } else {
      out += `[*]`
    }
  }
  return out
}

function renderKey(key: string, o: Required<RenderOptions>): string {
  if (!o.quoteUnsafeKeys) return key
  if (isSimpleIdentifier(key)) return key
  return `["${escapeQuotedKey(key)}"]`
}

function renderKeyWithDot(key: string, o: Required<RenderOptions>): string {
  if (!o.quoteUnsafeKeys) return `.${key}`
  if (isSimpleIdentifier(key)) return `.${key}`
  return `["${escapeQuotedKey(key)}"]`
}
