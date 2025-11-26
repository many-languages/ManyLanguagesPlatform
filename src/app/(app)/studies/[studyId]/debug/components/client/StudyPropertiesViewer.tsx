"use client"

import type { JatosStudyProperties } from "@/src/types/jatos"
import { useState, useEffect } from "react"
import Card from "@/src/app/components/Card"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

interface StudyPropertiesViewerProps {
  properties: JatosStudyProperties | null
}

export default function StudyPropertiesViewer({ properties }: StudyPropertiesViewerProps) {
  const [copySuccess, setCopySuccess] = useState(false)
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

  if (!properties) {
    return (
      <Card title="Study Properties" collapsible defaultOpen={false}>
        <div className="alert alert-warning">
          <span>Study properties not available (missing UUID or fetch failed)</span>
        </div>
      </Card>
    )
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(properties, null, 2))
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Card
      title="Study Properties"
      collapsible
      defaultOpen={false}
      actions={
        <button className="btn btn-sm btn-outline" onClick={handleCopy}>
          {copySuccess ? "Copied!" : "Copy JSON"}
        </button>
      }
    >
      <div className="max-h-96 overflow-auto rounded-lg border border-base-300">
        <SyntaxHighlighter
          language="json"
          style={isDark ? vscDarkPlus : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
          }}
          codeTagProps={{
            style: {
              fontFamily:
                "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
            },
          }}
        >
          {JSON.stringify(properties, null, 2)}
        </SyntaxHighlighter>
      </div>
    </Card>
  )
}
