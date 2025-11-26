// Variable Types - Shared across features (codebook, feedback, admin, etc.)

export interface ExtractedVariable {
  variableName: string
  exampleValue: string
  type: "primitive" | "object" | "array"
  occurrences: number
  dataStructure: "array" | "object"
  allValues: any[] // All values found for this variable
}

export interface AvailableVariable {
  name: string
  type: "string" | "number" | "boolean"
  example: any
}

export interface AvailableField {
  name: string
  type: "string" | "number" | "boolean"
  example?: any
}
