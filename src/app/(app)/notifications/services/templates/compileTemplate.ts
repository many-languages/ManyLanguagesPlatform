import Mustache from "mustache"

import { getTemplateContent } from "./getTemplateContent"

const templateCache = new Map<string, string>()

export const compileTemplate = async <T extends Record<string, any>>(
  templateId: string,
  data: T
): Promise<string> => {
  if (!templateCache.has(templateId)) {
    const templateString = await getTemplateContent(templateId)
    templateCache.set(templateId, templateString)
  }

  const template = templateCache.get(templateId)!
  return Mustache.render(template, data)
}
