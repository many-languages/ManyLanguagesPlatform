"use client"

interface WarningsListProps {
  warnings: string[]
}

export default function WarningsList({ warnings }: WarningsListProps) {
  if (warnings.length === 0) return null

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2 text-warning">Warnings</h3>
      <div className="space-y-2">
        {warnings.map((warning, index) => (
          <div key={index} className="alert alert-warning">
            <span>{warning}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
