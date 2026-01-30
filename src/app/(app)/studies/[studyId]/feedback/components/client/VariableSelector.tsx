"use client"

import { useState, useMemo } from "react"
import FilterBuilder from "./FilterBuilder"
import { SelectField, FilterButtonWithDisplay, SyntaxPreview } from "./shared"
import type { FeedbackVariable } from "../../types"

interface VariableSelectorProps {
  variables: FeedbackVariable[]
  onInsert: (variableSyntax: string) => void
  markdown?: string
}

const MODIFIERS = [
  { key: "all", label: "All Values", description: "Show all occurrences" },
  { key: "first", label: "First Value", description: "Show only first occurrence" },
  { key: "last", label: "Last Value", description: "Show only last occurrence" },
]

export default function VariableSelector({ variables, onInsert, markdown }: VariableSelectorProps) {
  const [selectedVariable, setSelectedVariable] = useState("")
  const [selectedModifier, setSelectedModifier] = useState("all")
  const [showFilterBuilder, setShowFilterBuilder] = useState(false)
  const [currentFilterClause, setCurrentFilterClause] = useState("")

  const variableOptions = useMemo(
    () =>
      variables.map((v) => ({
        value: v.variableName,
        label: v.type ? `${v.variableName} (${v.type})` : v.variableName,
      })),
    [variables]
  )

  const modifierOptions = useMemo(
    () =>
      MODIFIERS.map((m) => ({
        value: m.key,
        label: `${m.label} - ${m.description}`,
      })),
    []
  )

  const generateSyntax = useMemo(() => {
    if (!selectedVariable) return ""
    let syntax = `{{ var:${selectedVariable}`
    if (selectedModifier !== "all") {
      syntax += `:${selectedModifier}`
    }
    syntax += " }}"
    if (currentFilterClause) {
      syntax = syntax.replace(" }}", `${currentFilterClause} }}`)
    }
    return syntax
  }, [selectedVariable, selectedModifier, currentFilterClause])

  const handleInsert = () => {
    if (!selectedVariable) return
    onInsert(generateSyntax)
    // Clear selections after insert for next use
    setSelectedVariable("")
    setSelectedModifier("all")
    setCurrentFilterClause("")
  }

  const handleFilterInsert = (filterClause: string) => {
    setCurrentFilterClause(filterClause)
    setShowFilterBuilder(false)
  }

  return (
    <div className="dropdown dropdown-hover">
      <label tabIndex={0} className="btn btn-sm btn-outline m-1">
        Insert Variable ⌄
      </label>
      <div tabIndex={0} className="dropdown-content menu bg-base-200 rounded-box shadow p-4 w-80">
        <div className="space-y-3">
          <SelectField
            label="Variable"
            value={selectedVariable}
            onChange={(value) => {
              setSelectedVariable(value)
              if (value) {
                setSelectedModifier("all")
              }
            }}
            options={variableOptions}
            placeholder="Select variable..."
          />

          {selectedVariable && (
            <SelectField
              label="Value"
              value={selectedModifier}
              onChange={setSelectedModifier}
              options={modifierOptions}
            />
          )}

          <FilterButtonWithDisplay
            currentFilterClause={currentFilterClause}
            onAddFilter={() => setShowFilterBuilder(true)}
            onClearFilter={() => setCurrentFilterClause("")}
            enabled={!!selectedVariable}
          />

          <SyntaxPreview syntax={generateSyntax} show={!!selectedVariable} />

          <button
            className="btn btn-primary btn-sm w-full"
            onClick={handleInsert}
            disabled={!selectedVariable}
          >
            Insert Variable
          </button>
        </div>
      </div>

      {/* FilterBuilder Modal */}
      {showFilterBuilder && (
        <FilterBuilder
          variables={variables}
          onInsert={handleFilterInsert}
          onClose={() => setShowFilterBuilder(false)}
        />
      )}
    </div>
  )
}
