// @vitest-environment jsdom
import React, { act } from "react"
// @types/react-dom is not installed in this project, so this import is untyped
// @ts-ignore
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Diagnostic } from "../../../../../domain/variables/types"
import ExtractionDiagnosticsList from "./ExtractionDiagnosticsList"

// Vitest compiles JSX with the classic runtime here, so components expect a global React
;(globalThis as { React?: typeof React }).React = React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Root = { render(node: React.ReactNode): void; unmount(): void }
type Props = React.ComponentProps<typeof ExtractionDiagnosticsList>

const emptyData = (componentId: number): Diagnostic => ({
  severity: "warning",
  code: "EMPTY_OR_NO_DATA",
  message: `Component ${componentId} has no data or empty data`,
  metadata: { componentId },
})

const textFormat = (componentId: number): Diagnostic => ({
  severity: "error",
  code: "TEXT_FORMAT_NOT_SUPPORTED",
  message: "Text format data cannot be processed for variable extraction - data is unstructured",
  metadata: { componentId, format: "text" },
})

describe("ExtractionDiagnosticsList", () => {
  let container: HTMLDivElement
  let root: Root

  const render = async (diagnostics: Props["diagnostics"]) => {
    await act(async () => {
      root.render(<ExtractionDiagnosticsList diagnostics={diagnostics} />)
    })
  }

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it("lists component-level issues that have no variable to attach to", async () => {
    // The diagnostics the JATOS "Hello World" example produces: one text-format component and
    // four components that submit nothing, and no variables at all
    await render({
      run: [],
      component: new Map([
        [8, [emptyData(8)]],
        [9, [textFormat(9)]],
        [10, [emptyData(10)]],
        [11, [emptyData(11)]],
        [12, [emptyData(12)]],
      ]),
      variable: new Map(),
    })

    expect(container.textContent).toContain("TEXT_FORMAT_NOT_SUPPORTED")
    expect(container.textContent).toContain("Component 12 has no data or empty data")
    expect(container.textContent).not.toContain("No Extraction Issues Detected")
    expect(container.querySelectorAll(".text-error").length).toBeGreaterThan(0)
    expect(container.querySelectorAll(".text-warning").length).toBeGreaterThan(0)
  })

  it("lists components with errors before components with only warnings", async () => {
    await render({
      run: [],
      component: new Map([
        [8, [emptyData(8)]],
        [9, [textFormat(9)]],
      ]),
      variable: new Map(),
    })

    const text = container.textContent ?? ""
    expect(text.indexOf("Component ID: 9")).toBeGreaterThan(-1)
    expect(text.indexOf("Component ID: 9")).toBeLessThan(text.indexOf("Component ID: 8"))
  })

  it("shows run-level and variable-level issues", async () => {
    await render({
      run: [
        {
          severity: "warning",
          code: "TRUNCATED_EXTRACTION",
          message: "Extraction was truncated due to limits",
        },
      ],
      component: new Map(),
      variable: new Map([
        [
          "$rt",
          {
            variableName: "rt",
            diagnostics: [
              {
                severity: "warning",
                code: "HIGH_NULL_RATE",
                message: "Variable 'rt' is mostly null",
              },
            ],
          },
        ],
      ]),
    })

    expect(container.textContent).toContain("Extraction was truncated due to limits")
    expect(container.textContent).toContain("rt")
    expect(container.textContent).toContain("Variable 'rt' is mostly null")
  })

  it("shows a success message when there are no issues", async () => {
    await render({ run: [], component: new Map(), variable: new Map() })

    expect(container.textContent).toContain("No Extraction Issues Detected")
  })
})
