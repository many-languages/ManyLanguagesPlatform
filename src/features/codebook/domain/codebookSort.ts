export type CodebookSortOrder = "presentation" | "alphabetical"

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })

/** Returns a copy sorted by the given label when alphabetical; otherwise keeps presentation order. */
export function sortCodebookItems<T>(
  items: T[],
  order: CodebookSortOrder,
  getLabel: (item: T) => string
): T[] {
  if (order === "presentation") return items
  return [...items].sort((a, b) => collator.compare(getLabel(a), getLabel(b)))
}
