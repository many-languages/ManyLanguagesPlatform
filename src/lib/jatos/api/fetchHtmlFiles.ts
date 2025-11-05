import { fetchStudyAssets } from "./fetchStudyAssets"

export async function fetchHtmlFiles(studyId: number) {
  const root = await fetchStudyAssets(studyId)
  const htmlFiles: { label: string; value: string }[] = []

  const traverse = (node: any, path = "") => {
    if (!node) return

    // Add .html files
    if (node.type === "file" && node.name.endsWith(".html")) {
      htmlFiles.push({ label: path + node.name, value: node.path || node.name })
    }

    // Recurse into nested folders (JATOS uses 'content')
    if (Array.isArray(node.content)) {
      node.content.forEach((child: any) =>
        traverse(child, path ? `${path}${node.name}/` : `${node.name}/`)
      )
    }
  }

  traverse(root)
  return htmlFiles
}
