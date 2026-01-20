"use client"

interface ComponentSelectorProps {
  components: Array<{
    id: number
    componentId: number
  }>
  selectedComponentId: number | "all" | null
  onSelect: (componentId: number | "all" | null) => void
}

export default function ComponentSelector({
  components,
  selectedComponentId,
  onSelect,
}: ComponentSelectorProps) {
  if (components.length === 0) return null

  return (
    <div className="mb-4">
      <label className="label mb-2">
        <span className="label-text font-semibold">Select Component</span>
      </label>
      <select
        className="select select-bordered w-full"
        value={selectedComponentId ?? ""}
        onChange={(e) => {
          const value = e.target.value
          if (value === "all") {
            onSelect("all")
          } else if (value === "") {
            onSelect(null)
          } else {
            onSelect(Number(value))
          }
        }}
      >
        <option value="">Select a component...</option>
        <option value="all">All Components</option>
        {components.map((component) => (
          <option key={component.id} value={component.componentId}>
            Component {component.componentId}
          </option>
        ))}
      </select>
    </div>
  )
}
