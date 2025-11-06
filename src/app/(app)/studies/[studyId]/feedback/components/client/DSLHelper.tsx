"use client"

import { useState, useMemo } from "react"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { extractAllVariables } from "../../utils/extractVariable"
import { SelectField } from "./shared"

interface DSLHelperProps {
  enrichedResult: EnrichedJatosStudyResult
}

interface Example {
  title: string
  syntax: string
  description: string
  category: "variables" | "stats" | "conditionals" | "filters"
}

/**
 * Collapsible reference panel showing DSL syntax examples and available variables
 */
export default function DSLHelper({ enrichedResult }: DSLHelperProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const examples: Example[] = [
    // Variables
    {
      title: "All Values (Default)",
      syntax: "{{ var:correct }}",
      description: "Shows all values for the variable: true, false, true",
      category: "variables",
    },
    {
      title: "First Value",
      syntax: "{{ var:correct:first }}",
      description: "Shows only the first occurrence of the variable",
      category: "variables",
    },
    {
      title: "Last Value",
      syntax: "{{ var:correct:last }}",
      description: "Shows only the last occurrence of the variable",
      category: "variables",
    },

    // Statistics
    {
      title: "Average Reaction Time",
      syntax: "{{ stat:rt.avg }}",
      description: "Shows the average reaction time across all participants",
      category: "stats",
    },
    {
      title: "Median Accuracy",
      syntax: "{{ stat:correct.median }}",
      description: "Shows the median accuracy across all participants",
      category: "stats",
    },
    {
      title: "Standard Deviation",
      syntax: "{{ stat:rt.sd }}",
      description: "Shows the standard deviation of reaction times",
      category: "stats",
    },
    {
      title: "Count",
      syntax: "{{ stat:trials.count }}",
      description: "Shows the total number of trials completed",
      category: "stats",
    },

    // Filtered Statistics
    {
      title: "Filtered Average",
      syntax: "{{ stat:rt.avg | where: correct == true }}",
      description: "Average reaction time for correct trials only",
      category: "filters",
    },
    {
      title: "Multiple Conditions",
      syntax: '{{ stat:rt.avg | where: correct == true and stimulus == "blue" }}',
      description: "Average RT for correct blue stimulus trials",
      category: "filters",
    },

    // Conditionals
    {
      title: "Simple Conditional",
      syntax: "{{#if var:correct == true }}Great job!{{/if}}",
      description: "Shows 'Great job!' only if the participant was correct",
      category: "conditionals",
    },
    {
      title: "If-Else Block",
      syntax: "{{#if var:rt < 500 }}Fast!{{else}}Keep practicing{{/if}}",
      description: "Different messages based on reaction time",
      category: "conditionals",
    },
    {
      title: "Complex Condition",
      syntax: "{{#if var:correct == true and var:rt < 1000 }}Excellent!{{/if}}",
      description: "Multiple conditions in one expression",
      category: "conditionals",
    },
  ]

  const availableVariables = extractAllVariables(enrichedResult)

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All Categories" },
      { value: "variables", label: "Variables" },
      { value: "stats", label: "Statistics" },
      { value: "conditionals", label: "Conditionals" },
      { value: "filters", label: "Filters" },
    ],
    []
  )

  const filteredExamples = examples.filter((example) => {
    const matchesSearch =
      example.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      example.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      example.syntax.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === "all" || example.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="collapse collapse-arrow bg-base-200">
      <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
      <div className="collapse-title text-lg font-medium">📚 DSL Reference & Examples</div>
      <div className="collapse-content">
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search examples..."
              className="input input-bordered input-sm flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="w-48">
              <SelectField
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={categoryOptions}
                selectClassName="select-sm"
              />
            </div>
          </div>

          {/* Available Variables */}
          {availableVariables.length > 0 && (
            <div className="bg-base-100 p-3 rounded-lg">
              <h4 className="font-semibold mb-2">Available Variables</h4>
              <div className="flex flex-wrap gap-1">
                {availableVariables.map((variable) => (
                  <span
                    key={variable.name}
                    className="badge badge-outline text-xs cursor-pointer hover:badge-primary"
                    onClick={() => copyToClipboard(`{{ var:${variable.name} }}`)}
                    title={`Click to copy: {{ var:${variable.name} }}`}
                  >
                    {variable.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Examples */}
          <div className="space-y-3">
            <h4 className="font-semibold">Examples</h4>
            {filteredExamples.length === 0 ? (
              <p className="text-sm opacity-70">No examples match your search.</p>
            ) : (
              filteredExamples.map((example, index) => (
                <div key={index} className="bg-base-100 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium">{example.title}</h5>
                    <span className="badge badge-sm badge-outline">{example.category}</span>
                  </div>
                  <code className="block bg-base-200 p-2 rounded text-sm mb-2 font-mono">
                    {example.syntax}
                  </code>
                  <p className="text-sm opacity-80 mb-2">{example.description}</p>
                  <button
                    className="btn btn-xs btn-outline"
                    onClick={() => copyToClipboard(example.syntax)}
                  >
                    Copy
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick Reference */}
          <div className="bg-base-100 p-3 rounded-lg">
            <h4 className="font-semibold mb-2">Quick Reference</h4>
            <div className="text-sm space-y-1">
              <div>
                <strong>Variables:</strong> <code>{`{{ var:name }}`}</code> (all values)
              </div>
              <div>
                <strong>Variable Modifiers:</strong> <code>{`{{ var:name:first }}`}</code>,{" "}
                <code>{`{{ var:name:last }}`}</code>
              </div>
              <div>
                <strong>Stats:</strong> <code>{`{{ stat:name.metric }}`}</code>
              </div>
              <div>
                <strong>Filters:</strong> <code>{`{{ stat:name.metric | where: condition }}`}</code>
              </div>
              <div>
                <strong>Conditionals:</strong>{" "}
                <code>{`{{#if condition }}text{{else}}text{{/if}}`}</code>
              </div>
              <div>
                <strong>Metrics:</strong> avg, median, sd, count
              </div>
              <div>
                <strong>Operators:</strong> ==, !=, &gt;, &lt;, &gt;=, &lt;=, and, or, not
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
