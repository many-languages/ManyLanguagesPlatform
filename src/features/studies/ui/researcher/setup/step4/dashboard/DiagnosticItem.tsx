import type { Diagnostic } from "../../../../../domain/variables/types"
import { ExclamationCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline"

export default function DiagnosticItem({ diagnostic }: { diagnostic: Diagnostic }) {
  const Icon = diagnostic.severity === "error" ? ExclamationCircleIcon : ExclamationTriangleIcon
  const color = diagnostic.severity === "error" ? "text-error" : "text-warning"

  return (
    <div className="alert bg-base-100 shadow-sm border border-base-200 mb-2 flex items-start">
      <Icon className={`${color} mt-1 w-5 h-5`} />
      <div className="flex-1">
        <h3 className={`font-semibold text-sm ${color}`}>{diagnostic.code}</h3>
        <p className="text-sm">{diagnostic.message}</p>

        {/* Metadata Rendering if needed */}
        {diagnostic.metadata && (
          <div className="mt-1 text-xs text-base-content/60 font-mono">
            {diagnostic.metadata.threshold && (
              <span>Threshold: {diagnostic.metadata.threshold} </span>
            )}
            {diagnostic.metadata.count && <span>Count: {diagnostic.metadata.count}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
