"use client"

import { useState, useMemo } from "react"
import { SelectField } from "./shared"
import Card from "@/src/components/ui/Card"
import { dslHelperStyles } from "@/src/features/feedback/styles/feedbackStyles"

interface Example {
  title: string
  syntax: string
  description: string
  category: "variables" | "stats" | "conditionals" | "filters"
}

const SECTION_HEADER_CLASS = "text-xl font-medium"

const EXAMPLES: Example[] = [
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
  {
    title: "Average Reaction Time (Participant)",
    syntax: "{{ stat:rt.avg:within }}",
    description: "Average reaction time for the current participant",
    category: "stats",
  },
  {
    title: "Average Reaction Time (All Participants)",
    syntax: "{{ stat:rt.avg:across }}",
    description: "Average reaction time calculated across all participants",
    category: "stats",
  },
  {
    title: "Median Accuracy (Participant)",
    syntax: "{{ stat:correct.median:within }}",
    description: "Median accuracy for the current participant",
    category: "stats",
  },
  {
    title: "Median Accuracy (All Participants)",
    syntax: "{{ stat:correct.median:across }}",
    description: "Median accuracy calculated across all participants",
    category: "stats",
  },
  {
    title: "Standard Deviation (Participant)",
    syntax: "{{ stat:rt.sd:within }}",
    description: "Standard deviation of reaction times for the current participant",
    category: "stats",
  },
  {
    title: "Standard Deviation (All Participants)",
    syntax: "{{ stat:rt.sd:across }}",
    description: "Standard deviation of reaction times across all participants",
    category: "stats",
  },
  {
    title: "Count (Participant)",
    syntax: "{{ stat:trials.count:within }}",
    description: "Total number of trials completed by the current participant",
    category: "stats",
  },
  {
    title: "Count (All Participants)",
    syntax: "{{ stat:trials.count:across }}",
    description: "Total number of trials completed across all participants",
    category: "stats",
  },
  {
    title: "Filtered Average",
    syntax: "{{ stat:rt.avg:within | where: correct == true }}",
    description: "Average reaction time for correct trials for the current participant",
    category: "filters",
  },
  {
    title: "Multiple Conditions",
    syntax: '{{ stat:rt.avg:across | where: correct == true and stimulus == "blue" }}',
    description: "Average RT across participants for correct blue stimulus trials",
    category: "filters",
  },
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

/**
 * Collapsible reference panel showing generic DSL syntax examples (illustrative names only).
 */
export default function DSLHelper() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

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

  const filteredExamples = EXAMPLES.filter((example) => {
    const matchesSearch =
      example.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      example.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      example.syntax.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === "all" || example.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <Card
      title="📚 DSL Reference & Examples"
      collapsible
      bgColor="bg-base-300"
      className="mt-4"
      defaultOpen={false}
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <div className={SECTION_HEADER_CLASS}>Quick Reference</div>
          <div className="p-3 rounded-lg" style={dslHelperStyles.section}>
            <div className="text-sm space-y-1">
              <div>
                <strong>Variables:</strong> <code>{`{{ var:name }}`}</code> (all values)
              </div>
              <div>
                <strong>Variable Modifiers:</strong> <code>{`{{ var:name:first }}`}</code>,{" "}
                <code>{`{{ var:name:last }}`}</code>
              </div>
              <div>
                <strong>Stats:</strong> <code>{`{{ stat:name.metric:scope }}`}</code>
              </div>
              <div>
                <strong>Filters:</strong> <code>{`{{ stat:name.metric | where: condition }}`}</code>
              </div>
              <div>
                <strong>Conditionals:</strong>{" "}
                <code>{`{{#if condition }}text{{else}}text{{/if}}`}</code>
              </div>
              <div>
                <strong>Scopes:</strong> <code>within</code> (current participant),{" "}
                <code>across</code> (all participants)
              </div>
              <div>
                <strong>Metrics:</strong> avg, median, sd, count
              </div>
              <div>
                <strong>Operators:</strong> ==, !=, &gt;, &lt;, &gt;=, &lt;=, and, or, not
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className={SECTION_HEADER_CLASS}>Examples</div>
          <p className="text-sm opacity-70">
            Illustrative variable names only, use Insert Variable / Insert Stat above with your
            study&apos;s variables.
          </p>
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
          {filteredExamples.length === 0 ? (
            <p className="text-sm opacity-70">No examples match your search.</p>
          ) : (
            filteredExamples.map((example, index) => (
              <div key={index} className="p-3 rounded-lg" style={dslHelperStyles.section}>
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium">{example.title}</h5>
                  <span className="badge badge-sm badge-outline">{example.category}</span>
                </div>
                <code className="block bg-base-100 p-2 rounded text-sm mb-2 font-mono">
                  {example.syntax}
                </code>
                <p className="text-sm opacity-80">{example.description}</p>
              </div>
            ))
          )}
        </section>
      </div>
    </Card>
  )
}
