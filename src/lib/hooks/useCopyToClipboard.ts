"use client"

import { useState, useCallback } from "react"

export function useCopyToClipboard() {
  const [copySuccess, setCopySuccess] = useState(false)

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [])

  return { copySuccess, copyToClipboard }
}
