export interface CodebookVariableHeaderVariable {
  variableKey: string
  variableName: string
  type: string | null
  examples: Array<{ value: string; sourcePath: string }>
}

interface CodebookVariableHeaderProps {
  variable: CodebookVariableHeaderVariable
  /** When false, only key/type/example render (name shown elsewhere, e.g. Card title). */
  showName?: boolean
  className?: string
}

export default function CodebookVariableHeader({
  variable,
  showName = true,
  className = "",
}: CodebookVariableHeaderProps) {
  return (
    <div className={className}>
      {showName && <h3 className="font-semibold text-lg">{variable.variableName}</h3>}
      <p className={`text-xs text-base-content/50${showName ? " mt-1" : ""}`}>
        Key: {variable.variableKey}
      </p>
      {variable.type && <p className="text-sm text-base-content/70">Type: {variable.type}</p>}
      {variable.examples.length > 0 && (
        <p className="text-sm text-base-content/70">
          Example: <code className="text-xs">{variable.examples[0]?.value}</code>
        </p>
      )}
    </div>
  )
}
