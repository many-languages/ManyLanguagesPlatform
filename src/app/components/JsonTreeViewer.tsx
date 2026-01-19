"use client"

import { useMemo } from "react"
import { JSONTree } from "react-json-tree"

interface JsonTreeViewerProps {
  data: unknown
  className?: string
  highlightPaths?: string[]
  highlightKey?: string
  expandAll?: boolean
}

function isSimpleIdentifier(key: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
}

function escapeQuotedKey(key: string): string {
  return key.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function segmentsToPath(segments: Array<string | number>): string {
  let out = "$"
  segments.forEach((segment) => {
    const seg = String(segment)
    if (/^\d+$/.test(seg)) {
      out += `[${seg}]`
    } else if (isSimpleIdentifier(seg)) {
      out += `.${seg}`
    } else {
      out += `["${escapeQuotedKey(seg)}"]`
    }
  })
  return out
}

function parsePathSegments(path: string): Array<string | number> {
  let p = path.trim()
  if (p.startsWith("$")) {
    p = p.slice(1)
  }
  if (p.startsWith(".")) {
    p = p.slice(1)
  }

  const segments: Array<string | number> = []
  let i = 0

  while (i < p.length) {
    const char = p[i]
    if (char === ".") {
      i += 1
      continue
    }

    if (char === "[") {
      const closing = p.indexOf("]", i)
      if (closing === -1) break
      const inner = p.slice(i + 1, closing)
      if (inner.startsWith('"') && inner.endsWith('"')) {
        const raw = inner.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\")
        segments.push(raw)
      } else if (/^\d+$/.test(inner)) {
        segments.push(Number(inner))
      } else {
        segments.push(inner)
      }
      i = closing + 1
      continue
    }

    let next = i
    while (next < p.length && p[next] !== "." && p[next] !== "[") {
      next += 1
    }
    const key = p.slice(i, next)
    if (key.length > 0) segments.push(key)
    i = next
  }

  return segments
}

function normalizePath(path: string): string {
  return segmentsToPath(parsePathSegments(path))
}

function keyPathToSegments(keyPath: Array<string | number>): Array<string | number> {
  const reversed = [...keyPath].reverse()
  const segments = reversed.filter((seg) => seg !== "root")
  return segments
}

export default function JsonTreeViewer({
  data,
  className,
  highlightPaths,
  highlightKey,
  expandAll = true,
}: JsonTreeViewerProps) {
  const highlightPathSet = useMemo(() => {
    if (!highlightPaths || highlightPaths.length === 0) return new Set<string>()
    return new Set(highlightPaths.map((path) => normalizePath(path)))
  }, [highlightPaths])

  const isHighlightedPath = (keyPath: Array<string | number>): boolean => {
    if (highlightPathSet.size === 0) return false
    const path = segmentsToPath(keyPathToSegments(keyPath))
    return highlightPathSet.has(path)
  }

  return (
    <div className={className}>
      <JSONTree
        data={data}
        hideRoot={false}
        shouldExpandNodeInitially={
          expandAll ? () => true : (_keyPath: any, _data: any, level: number) => level < 1
        }
        labelRenderer={(keyPath) => {
          const key = String(keyPath[0])
          const matchKey = highlightKey ? key === highlightKey : false
          const matchPath = isHighlightedPath(keyPath)
          const className = matchKey || matchPath ? "bg-warning/30 rounded px-1" : undefined
          return <span className={className}>{key}</span>
        }}
        valueRenderer={(raw, _value, ...keyPath) => {
          const matchPath = isHighlightedPath(keyPath)
          const className = matchPath ? "bg-warning/20 rounded px-1" : undefined
          return <span className={className}>{raw}</span>
        }}
      />
    </div>
  )
}
