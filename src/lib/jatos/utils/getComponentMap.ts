import { JatosStudyProperties } from "@/src/types/jatos"

/**
 * Extracts a simple mapping of component UUIDs and titles
 * from a JATOS study properties object.
 *
 * @param properties Full study properties object (with components[])
 * @returns Array of { uuid, title }
 */
export function getComponentMap(properties: JatosStudyProperties) {
  if (!properties?.components || !Array.isArray(properties.components)) {
    return []
  }

  return properties.components.map((component: any) => ({
    uuid: component.uuid,
    title: component.title,
  }))
}
