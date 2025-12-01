"use client"

import { useEffect, useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

interface JsonSyntaxHighlighterProps {
  code: string
  language?: string
  className?: string
}

export default function JsonSyntaxHighlighter({
  code,
  language = "json",
  className,
}: JsonSyntaxHighlighterProps) {
  const [isDark, setIsDark] = useState(false)

  // Detect theme from document
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

  return (
    <div className={className}>
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
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
