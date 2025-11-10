import handlebars from "handlebars"

import { getTemplateContent } from "./getTemplateContent"

const templateCache = new Map<string, handlebars.TemplateDelegate>()

export const compileTemplate = async <T extends Record<string, any>>(
  templateId: string,
  data: T
): Promise<string> => {
  if (!templateCache.has(templateId)) {
    const templateString = await getTemplateContent(templateId)
    templateCache.set(templateId, handlebars.compile(templateString))
  }

  const template = templateCache.get(templateId)!
  return template(data)
}
