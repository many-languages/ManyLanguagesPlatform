"use client"

import type { DebugStructureAnalysis } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"

interface DetectedPatternsProps {
  patterns: DebugStructureAnalysis["patterns"]
}

export default function DetectedPatterns({ patterns }: DetectedPatternsProps) {
  if (patterns.length === 0) return null

  return (
    <div className="card bg-base-200 p-4">
      <h3 className="font-semibold mb-3">Detected Patterns</h3>
      <div className="space-y-2">
        {patterns.map((pattern, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="badge badge-sm">{pattern.type.replace(/_/g, " ")}</span>
            <div className="flex-1">
              <div className="text-sm">{pattern.description}</div>
              <div className="text-xs text-muted-content mt-1">
                Confidence: {(pattern.confidence * 100).toFixed(0)}%
              </div>
              {pattern.exampleComponents.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {pattern.exampleComponents.slice(0, 3).map((compId, pIdx) => (
                    <span key={pIdx} className="badge badge-xs font-mono">
                      Component {compId}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
