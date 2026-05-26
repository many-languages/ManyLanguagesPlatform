import { describe, expect, it } from "vitest"
import type { ComponentFacts } from "../types"
import {
  materializeComponentDiagnostics,
  materializeComponentDiagnosticsByRun,
} from "./materializeComponentDiagnostics"

describe("materializeComponentDiagnostics", () => {
  it("materializes diagnostics from aggregated component facts", () => {
    const facts: ComponentFacts = new Map([
      [
        10,
        {
          componentId: 10,
          hasParsedData: false,
          hasDataContent: false,
        },
      ],
      [
        11,
        {
          componentId: 11,
          detectedFormat: "text",
          hasParsedData: true,
          hasDataContent: true,
          formatError: {
            code: "TEXT_FORMAT_NOT_SUPPORTED",
            message:
              "Text format data cannot be processed for variable extraction - data is unstructured",
          },
        },
      ],
    ])

    const diagnostics = materializeComponentDiagnostics(facts)

    expect(diagnostics.get(10)?.[0]?.code).toBe("EMPTY_OR_NO_DATA")
    expect(diagnostics.get(11)?.[0]).toMatchObject({
      severity: "error",
      code: "TEXT_FORMAT_NOT_SUPPORTED",
    })
  })

  it("aggregates per-run component facts through the explicit by-run entry point", () => {
    const factsByRun = new Map<number, ComponentFacts>([
      [
        1,
        new Map([
          [
            10,
            {
              componentId: 10,
              detectedFormat: "json",
              hasParsedData: false,
              hasDataContent: true,
              parseError: "Unexpected token",
            },
          ],
        ]),
      ],
      [
        2,
        new Map([
          [
            10,
            {
              componentId: 10,
              detectedFormat: "json",
              hasParsedData: true,
              hasDataContent: true,
            },
          ],
        ]),
      ],
    ])

    const diagnostics = materializeComponentDiagnosticsByRun(factsByRun)

    expect(diagnostics.get(10)).toEqual([
      {
        severity: "error",
        code: "PARSE_ERROR",
        message: "Parse error: Unexpected token",
        metadata: { componentId: 10, error: "Unexpected token" },
      },
    ])
  })
})
