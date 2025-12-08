/**
 * Badge class constants for variable types
 */
export const TYPE_BADGE_CLASSES = {
  primitive: "badge-primary",
  array: "badge-secondary",
  object: "badge-accent",
} as const

export type VariableType = keyof typeof TYPE_BADGE_CLASSES
