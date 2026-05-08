"use client"

interface SyntaxPreviewProps {
  syntax: string
  show?: boolean
  label?: string
}

export function SyntaxPreview({ syntax, show = true, label = "Preview:" }: SyntaxPreviewProps) {
  if (!show || !syntax) return null

  return (
    <div className="bg-base-100 p-2 rounded">
      <div className="text-sm font-medium">{label}</div>
      <code className="text-sm">{syntax}</code>
    </div>
  )
}
