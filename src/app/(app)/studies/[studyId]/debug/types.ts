// Simple type for path display (replaces NestedPath)
export type PathDisplay = {
  path: string
  type: "string" | "number" | "boolean" | "object" | "array" | "null"
  exampleValue: any
  depth: number
}
