"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

interface JsonSyntaxHighlighterProps {
  code: string
  language?: string
  className?: string
  highlightPath?: string // Deprecated - use highlightPaths instead. Path to highlight (e.g., "name", "user.name", "items[*].value")
  highlightPaths?: string[] // Array of paths to highlight
}

export default function JsonSyntaxHighlighter({
  code,
  language = "json",
  className,
  highlightPath,
  highlightPaths,
}: JsonSyntaxHighlighterProps) {
  // Normalize to array of paths (prioritize highlightPaths over highlightPath for backward compatibility)
  const pathsToHighlight = highlightPaths ?? (highlightPath ? [highlightPath] : [])

  console.log("[JsonSyntaxHighlighter] Component rendered with highlightPaths:", pathsToHighlight)

  // Detect theme from document
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute("data-theme")
      setIsDark(
        theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
      )
    }

    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })

    return () => observer.disconnect()
  }, [])

  // Split code into lines once
  const lines = useMemo(() => code.split("\n"), [code])

  /**
   * Parse a path string into path segments, handling [*] notation
   * Examples:
   * - "user.name" -> ["user", "name"]
   * - "trials[*].rt" -> ["trials", "[*]", "rt"]
   * - "items[*].data.value" -> ["items", "[*]", "data", "value"]
   */
  const parsePath = (path: string): string[] => {
    const segments: string[] = []
    let current = ""

    for (let i = 0; i < path.length; i++) {
      const char = path[i]

      if (char === ".") {
        if (current) {
          segments.push(current)
          current = ""
        }
      } else if (char === "[" && i + 1 < path.length && path[i + 1] === "*") {
        // Found [*] notation
        if (current) {
          segments.push(current)
          current = ""
        }
        segments.push("[*]")
        i += 2 // Skip "*]"
      } else {
        current += char
      }
    }

    if (current) {
      segments.push(current)
    }

    return segments
  }

  /**
   * Navigate to a path in the JSON object, handling [*] notation
   * For [*], we use the first array item (consistent with extractVariable.ts behavior)
   */
  const navigateToPath = (
    obj: any,
    pathSegments: string[]
  ): { value: any; parent: any; parentKey: string | null; fullPath: string[] } | null => {
    let current: any = obj
    let parent: any = obj
    let parentKey: string | null = null
    const fullPath: string[] = []

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i]

      if (current === null || current === undefined) {
        return null
      }

      // Handle [*] notation - use first array item
      if (segment === "[*]") {
        if (!Array.isArray(current)) {
          return null
        }
        if (current.length === 0) {
          return null
        }
        parent = current
        parentKey = "[*]"
        current = current[0]
        fullPath.push("[*]")
        continue
      }

      // Handle object property access
      if (typeof current !== "object" || Array.isArray(current)) {
        return null
      }

      if (!(segment in current)) {
        return null
      }

      // Store parent before moving to next level
      if (i < pathSegments.length - 1) {
        parent = current
        parentKey = segment
        current = current[segment]
        fullPath.push(segment)
      } else {
        // This is the target - return the parent and the value
        return {
          value: current[segment],
          parent: current,
          parentKey: segment,
          fullPath: [...fullPath, segment],
        }
      }
    }

    return { value: current, parent, parentKey, fullPath }
  }

  /**
   * Find line numbers for a single path in the JSON
   * Returns an array of line numbers (can be multiple for [*] paths)
   */
  const findLineNumbersForPath = (path: string): number[] => {
    if (!path || language !== "json") return []

    try {
      const parsed = JSON.parse(code)
      const pathSegments = parsePath(path)

      // Check if path contains [*] - if so, we need to find all occurrences
      const hasWildcard = pathSegments.includes("[*]")

      if (hasWildcard) {
        // For wildcard paths, find all matching lines
        const lineNumbers: number[] = []

        // Navigate to the array that contains [*]
        let arrayPath: string[] = []
        let arrayValue: any = parsed

        for (let i = 0; i < pathSegments.length; i++) {
          if (pathSegments[i] === "[*]") {
            break
          }
          arrayPath.push(pathSegments[i])
          if (i < pathSegments.length - 1) {
            if (typeof arrayValue !== "object" || arrayValue === null) return []
            arrayValue = arrayValue[pathSegments[i]]
          }
        }

        // arrayValue should now be the array
        if (!Array.isArray(arrayValue)) return []

        // Get the remaining path after [*]
        const wildcardIndex = pathSegments.indexOf("[*]")
        const remainingPath = pathSegments.slice(wildcardIndex + 1)
        const targetKey = remainingPath[remainingPath.length - 1]

        // Find the array key in the JSON
        const arrayKey = arrayPath[arrayPath.length - 1] || ""
        const escapedArrayKey = arrayKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const arrayKeyPattern = new RegExp(`"${escapedArrayKey}"\\s*:\\s*\\[`, "i")

        // Find where the array starts
        let arrayStartLine = -1
        let indentLevel = 0

        for (let i = 0; i < lines.length; i++) {
          if (arrayKeyPattern.test(lines[i])) {
            arrayStartLine = i
            indentLevel = lines[i].match(/^(\s*)/)?.[1].length || 0
            break
          }
        }

        if (arrayStartLine === -1) return []

        // Find all occurrences of the target key within array items
        const escapedTargetKey = targetKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const targetKeyPattern = new RegExp(`"${escapedTargetKey}"\\s*:`, "i")
        const expectedIndent = indentLevel + 2 + (remainingPath.length - 1) * 2

        for (let i = arrayStartLine + 1; i < lines.length; i++) {
          const line = lines[i]
          const lineIndent = line.match(/^(\s*)/)?.[1].length || 0

          // Stop if we've gone past the array (indent is less than array indent)
          if (lineIndent <= indentLevel && line.trim() !== "" && !line.trim().startsWith("//")) {
            if (line.trim() === "]" || line.trim().startsWith("]")) {
              break
            }
            if (lineIndent < indentLevel) {
              break
            }
          }

          // Check if this line matches our target key with correct indentation
          if (targetKeyPattern.test(line) && Math.abs(lineIndent - expectedIndent) <= 2) {
            lineNumbers.push(i + 1)
          }
        }

        return lineNumbers
      } else {
        // No wildcard - find single line
        const navigationResult = navigateToPath(parsed, pathSegments)

        if (!navigationResult) {
          console.log("[JsonSyntaxHighlighter] Path does not exist in JSON:", path)
          return []
        }

        const { parent, parentKey, fullPath } = navigationResult
        const targetKey = pathSegments[pathSegments.length - 1]

        // Build a pattern to find the key, considering the full path context
        const escapedKey = targetKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const keyPattern = new RegExp(`"${escapedKey}"\\s*:`, "i")

        // Calculate expected indentation based on nesting depth
        const nestingDepth = fullPath.length - 1
        const expectedIndent = nestingDepth * 2

        // Find the line by searching with context
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (!keyPattern.test(line)) continue

          const lineIndent = line.match(/^(\s*)/)?.[1].length || 0

          // Check if indentation matches expected depth
          if (Math.abs(lineIndent - expectedIndent) <= 2) {
            // For nested paths, verify parent context
            if (fullPath.length > 1) {
              // Check if parent keys appear before this line
              let contextValid = true
              let searchIndex = i - 1

              for (let pathIdx = fullPath.length - 2; pathIdx >= 0; pathIdx--) {
                const pathKey = fullPath[pathIdx]
                if (pathKey === "[*]") continue // Skip wildcard in context check

                const escapedPathKey = pathKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                const pathKeyPattern = new RegExp(`"${escapedPathKey}"\\s*:`, "i")
                const expectedPathIndent = pathIdx * 2

                let foundParent = false
                while (searchIndex >= 0) {
                  const checkLine = lines[searchIndex]
                  const checkIndent = checkLine.match(/^(\s*)/)?.[1].length || 0

                  if (checkIndent < expectedPathIndent) break

                  if (
                    pathKeyPattern.test(checkLine) &&
                    Math.abs(checkIndent - expectedPathIndent) <= 2
                  ) {
                    foundParent = true
                    break
                  }

                  searchIndex--
                }

                if (!foundParent) {
                  contextValid = false
                  break
                }
              }

              if (contextValid) {
                console.log("[JsonSyntaxHighlighter] Found line:", i + 1, "for path:", path)
                return [i + 1]
              }
            } else {
              // Root level - no context needed
              console.log("[JsonSyntaxHighlighter] Found root-level line:", i + 1)
              return [i + 1]
            }
          }
        }

        // Fallback: return first match even without perfect context
        for (let i = 0; i < lines.length; i++) {
          if (keyPattern.test(lines[i])) {
            console.log("[JsonSyntaxHighlighter] Found fallback line:", i + 1)
            return [i + 1]
          }
        }
      }
    } catch (error) {
      console.log("[JsonSyntaxHighlighter] Error parsing JSON:", error)
      return []
    }

    return []
  }

  /**
   * Find line numbers for all paths in the JSON
   * Returns union of all line numbers from all paths
   */
  const findLineNumbers = useMemo(() => {
    if (pathsToHighlight.length === 0 || language !== "json") return []

    // Get line numbers for each path and union them (remove duplicates)
    const allLineNumbers = new Set<number>()
    pathsToHighlight.forEach((path) => {
      const lineNums = findLineNumbersForPath(path)
      lineNums.forEach((lineNum) => allLineNumbers.add(lineNum))
    })

    return Array.from(allLineNumbers).sort((a, b) => a - b)
  }, [pathsToHighlight, code, lines, language])

  // Use a ref to access the container element
  const containerRef = useRef<HTMLDivElement>(null)

  // Add global styles for the highlighted line class
  useEffect(() => {
    console.log(
      "[JsonSyntaxHighlighter] Setting up global styles, highlightPaths:",
      pathsToHighlight
    )
    if (pathsToHighlight.length === 0) return

    const styleId = "json-highlighted-line-styles"
    let styleElement = document.getElementById(styleId) as HTMLStyleElement

    if (!styleElement) {
      styleElement = document.createElement("style")
      styleElement.id = styleId
      document.head.appendChild(styleElement)
      console.log("[JsonSyntaxHighlighter] Created new style element")
    }

    styleElement.textContent = `
      .json-highlighted-line {
        background-color: ${
          isDark ? "rgba(255, 255, 0, 0.4)" : "rgba(255, 255, 0, 0.7)"
        } !important;
        border-radius: 2px;
      }
    `
    console.log("[JsonSyntaxHighlighter] Applied global styles")

    return () => {
      // Don't remove the style element, as it might be used by other instances
    }
  }, [pathsToHighlight, isDark])

  // Apply highlighting after render using DOM manipulation
  useEffect(() => {
    if (pathsToHighlight.length === 0 || findLineNumbers.length === 0 || !containerRef.current) {
      if (findLineNumbers.length === 0) {
        console.log("[JsonSyntaxHighlighter] No target line numbers found")
      }
      return
    }

    // Use a small delay to ensure the DOM is ready after syntax highlighting
    const timeoutId = setTimeout(() => {
      const container = containerRef.current
      if (!container) {
        console.log("[JsonSyntaxHighlighter] Container ref is null")
        return
      }

      console.log("[JsonSyntaxHighlighter] Highlighting line numbers:", findLineNumbers)

      // Find all line spans - try different selectors that react-syntax-highlighter might use
      let lineSpans = container.querySelectorAll('span[class*="token-line"]')
      if (lineSpans.length === 0) {
        // Try alternative selector
        lineSpans = container.querySelectorAll('span[class*="line"]')
      }
      if (lineSpans.length === 0) {
        // Try finding spans within pre > code structure
        const codeElement = container.querySelector("code")
        if (codeElement) {
          lineSpans = codeElement.querySelectorAll("span")
        }
      }

      console.log("[JsonSyntaxHighlighter] Found", lineSpans.length, "potential line elements")

      // Remove previous highlights
      lineSpans.forEach((span) => {
        span.classList.remove("json-highlighted-line")
        ;(span as HTMLElement).style.backgroundColor = ""
      })

      // Highlight all target lines
      const lineSpansArray = Array.from(lineSpans)
      let highlightedCount = 0

      findLineNumbers.forEach((lineNum) => {
        if (lineNum > 0 && lineNum <= lineSpansArray.length) {
          const targetSpan = lineSpansArray[lineNum - 1]
          if (targetSpan) {
            console.log(
              "[JsonSyntaxHighlighter] ✅ Highlighting line:",
              lineNum,
              targetSpan.textContent?.substring(0, 50)
            )
            targetSpan.classList.add("json-highlighted-line")
            ;(targetSpan as HTMLElement).style.backgroundColor = isDark
              ? "rgba(255, 255, 0, 0.4)"
              : "rgba(255, 255, 0, 0.7)"
            highlightedCount++
          }
        }
      })

      if (highlightedCount === 0) {
        console.log(
          "[JsonSyntaxHighlighter] Could not find matching spans for lines",
          findLineNumbers
        )
      } else {
        console.log("[JsonSyntaxHighlighter] Successfully highlighted", highlightedCount, "line(s)")
      }
    }, 150)

    return () => clearTimeout(timeoutId)
  }, [pathsToHighlight, findLineNumbers, isDark])

  return (
    <div
      className={className}
      data-highlight-paths={
        pathsToHighlight.length > 0 ? JSON.stringify(pathsToHighlight) : undefined
      }
      ref={containerRef}
    >
      <SyntaxHighlighter
        language={language}
        style={isDark ? vscDarkPlus : oneLight}
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          userSelect: "text",
          WebkitUserSelect: "text",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
            userSelect: "text",
            WebkitUserSelect: "text",
          },
        }}
        PreTag={({ children, ...props }) => (
          <pre {...props} style={{ ...props.style, userSelect: "text", WebkitUserSelect: "text" }}>
            {children}
          </pre>
        )}
        wrapLines={true}
        showLineNumbers={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
