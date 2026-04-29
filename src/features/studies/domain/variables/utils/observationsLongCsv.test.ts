import { describe, expect, it } from "vitest"
import type { ExtractionObservation } from "../types"
import { buildUniqueDisplayNames, compareRowKeyId, escapeCsvField } from "./observationsCsvUtils"
import { observationsToLongCsv } from "./observationsLongCsv"

function mockObservation(overrides: Partial<ExtractionObservation> = {}): ExtractionObservation {
  return {
    variableKey: "$foo",
    path: "$foo",
    keyPath: ["foo"],
    valueType: "number",
    valueJson: "1",
    rowKey: [],
    rowKeyId: "$#0",
    scopeKeys: { componentId: 10, studyResultId: 99 },
    depth: 0,
    scopeKeyId: "c:10|r:99",
    keyPathString: "foo",
    hasArrayIndices: false,
    ...overrides,
  }
}

describe("escapeCsvField", () => {
  it("leaves simple values unquoted", () => {
    expect(escapeCsvField("abc")).toBe("abc")
  })

  it("quotes and escapes commas and quotes", () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvField("a,b")).toBe('"a,b"')
  })
})

describe("compareRowKeyId", () => {
  it("orders $#N numerically", () => {
    expect(compareRowKeyId("$#2", "$#10")).toBeLessThan(0)
    expect(compareRowKeyId("$#0", "$#1")).toBeLessThan(0)
  })
})

describe("buildUniqueDisplayNames", () => {
  it("disambiguates duplicate human names", () => {
    const m = buildUniqueDisplayNames(
      ["$a", "$b"],
      new Map([
        ["$a", "x"],
        ["$b", "x"],
      ])
    )
    expect(m.get("$a")).toBe("x ($a)")
    expect(m.get("$b")).toBe("x ($b)")
  })
})

describe("observationsToLongCsv", () => {
  it("writes long header and one data row", () => {
    const obs = [mockObservation({ valueJson: "42" })]
    const csv = observationsToLongCsv(obs, new Map([["$foo", "Foo"]]), { includeUtf8Bom: false })
    const lines = csv.split("\r\n")
    expect(lines[0]).toBe("study_result_id,component_id,row_id,variable_key,variable_name,value")
    expect(lines[1]).toBe("99,10,$#0,$foo,Foo,42")
  })

  it("emits two rows for two row_ids with the same variable key", () => {
    const obs: ExtractionObservation[] = [
      mockObservation({ rowKeyId: "$#0", variableKey: "$a", valueJson: "1" }),
      mockObservation({ rowKeyId: "$#1", variableKey: "$a", valueJson: "2" }),
    ]
    const csv = observationsToLongCsv(obs, new Map([["$a", "alpha"]]), { includeUtf8Bom: false })
    const lines = csv.split("\r\n")
    expect(lines[0]).toBe("study_result_id,component_id,row_id,variable_key,variable_name,value")
    expect(lines[1]).toBe("99,10,$#0,$a,alpha,1")
    expect(lines[2]).toBe("99,10,$#1,$a,alpha,2")
  })

  it("emits one row per variable per structural row (no empty cells)", () => {
    const obs: ExtractionObservation[] = [
      mockObservation({ rowKeyId: "$#0", variableKey: "$a", valueJson: "1" }),
      mockObservation({ rowKeyId: "$#0", variableKey: "$b", valueJson: "2" }),
      mockObservation({ rowKeyId: "$#1", variableKey: "$a", valueJson: "3" }),
    ]
    const csv = observationsToLongCsv(
      obs,
      new Map([
        ["$a", "A"],
        ["$b", "B"],
      ]),
      { includeUtf8Bom: false }
    )
    const lines = csv.split("\r\n")
    expect(lines.length).toBe(4)
    expect(lines[1]).toBe("99,10,$#0,$a,A,1")
    expect(lines[2]).toBe("99,10,$#0,$b,B,2")
    expect(lines[3]).toBe("99,10,$#1,$a,A,3")
  })

  it("includes BOM when requested", () => {
    const csv = observationsToLongCsv([], new Map(), { includeUtf8Bom: true })
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const firstLine = csv.replace(/^\uFEFF/, "").split("\r\n")[0]
    expect(firstLine).toBe("study_result_id,component_id,row_id,variable_key,variable_name,value")
  })
})
