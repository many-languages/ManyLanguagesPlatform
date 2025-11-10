import { promises as fs } from "fs"
import path from "path"

const TEMPLATE_ROOT = path.join(process.cwd(), "src", "app", "(app)", "notifications", "templates")

export const getTemplateContent = async (templateId: string): Promise<string> => {
  const templatePath = path.join(TEMPLATE_ROOT, `${templateId}.hbs`)
  try {
    return await fs.readFile(templatePath, "utf8")
  } catch (error: any) {
    throw new Error(
      `Failed to load notification template '${templateId}': ${error?.message ?? error}`
    )
  }
}
