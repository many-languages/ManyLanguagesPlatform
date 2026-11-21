import { describe, expect, it } from "vitest"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { DEFAULT_EXTRACTION_CONFIG } from "../variables/types"
import { extractVariableBundle } from "../variables/utils/extractVariable"
import { createExtractionIndexStore } from "../variables/utils/extractionIndexStore"
import { createComponentExplorerModel } from "./createComponentExplorerModel"

// Only the fields the extraction and the explorer read
function component(
  componentId: number,
  fields: Record<string, unknown> = {}
): EnrichedJatosStudyResult["componentResults"][number] {
  return {
    id: componentId * 100,
    componentId,
    dataContent: null,
    ...fields,
  } as unknown as EnrichedJatosStudyResult["componentResults"][number]
}

function buildModel(componentResults: EnrichedJatosStudyResult["componentResults"]) {
  const enrichedResult = {
    id: 22,
    studyState: "FINISHED",
    componentResults,
  } as unknown as EnrichedJatosStudyResult
  const bundle = extractVariableBundle(enrichedResult, DEFAULT_EXTRACTION_CONFIG)
  return createComponentExplorerModel({
    enrichedResult,
    extractedVariables: bundle.variables,
    observations: bundle.observations,
    indexStore: createExtractionIndexStore(bundle.observations),
  })
}

const jsonComponent = (componentId: number) =>
  component(componentId, {
    dataContent: '{"rt": 512}',
    parsedData: { rt: 512 },
    detectedFormat: { format: "json", confidence: 1 },
  })

const textComponent = (componentId: number) =>
  component(componentId, {
    dataContent: "These are some very scientific result data.",
    parsedData: "These are some very scientific result data.",
    detectedFormat: { format: "text", confidence: 1 },
  })

describe("createComponentExplorerModel", () => {
  it("keeps components without variables listed, so their raw data stays viewable", () => {
    // Same shape as the JATOS "Hello World" example: one text component, four with no data
    const model = buildModel([
      component(8),
      textComponent(9),
      component(10),
      component(11),
      component(12),
    ])

    expect(model.items.map((item) => item.componentId)).toEqual([9, 8, 10, 11, 12])
    expect(model.itemById.get(9)?.statusNote).toBe("text, not extractable")
    expect(model.itemById.get(8)?.statusNote).toBe("no data")
    expect(model.getItemsToRender(9)[0].component.dataContent).toBe(
      "These are some very scientific result data."
    )
  })

  it("lists extracted components first, then ones with data, then empty ones", () => {
    const model = buildModel([component(1), textComponent(2), jsonComponent(3)])

    expect(model.items.map((item) => item.componentId)).toEqual([3, 2, 1])
    expect(model.itemById.get(3)?.statusNote).toBeNull()
    expect(model.firstComponentId).toBe(3)
  })

  it("only copies components that have data", () => {
    const model = buildModel([component(1), textComponent(2)])

    expect(JSON.parse(model.getCopyText("all"))).toEqual({
      component_2: {
        raw: "These are some very scientific result data.",
        parsed: "These are some very scientific result data.",
        format: "text",
      },
    })
    expect(model.getCopyText(1)).toBe("")
    expect(model.getCopyText(2)).toBe("These are some very scientific result data.")
  })
})
