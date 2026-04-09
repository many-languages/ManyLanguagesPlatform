/**
 * Extracts .html file paths from JATOS asset structure tree.
 * Pure transform - no HTTP, no token.
 */
export type AssetNode = {
  type?: string
  name?: string
  path?: string
  content?: AssetNode[]
}

export function extractHtmlFilesFromStructure(
  root: AssetNode | null
): { label: string; value: string }[] {
  const htmlFiles: { label: string; value: string }[] = []

  const traverse = (node: AssetNode | null | undefined, path = "") => {
    if (!node) return

    if (node.type === "file" && node.name?.endsWith(".html")) {
      htmlFiles.push({ label: path + (node.name ?? ""), value: node.path ?? node.name ?? "" })
    }

    if (Array.isArray(node.content)) {
      node.content.forEach((child) =>
        traverse(child, path ? `${path}${node.name ?? ""}/` : `${node.name ?? ""}/`)
      )
    }
  }

  traverse(root)
  return htmlFiles
}
