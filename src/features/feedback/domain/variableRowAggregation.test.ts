import { describe, expect, it } from "vitest"
import { buildPredicate } from "./variableRowAggregation"

describe("variableRowAggregation", () => {
  it("supports or in where clauses", () => {
    const predicate = buildPredicate('correct == true or stimulus == "blue"')

    expect(predicate({ correct: false, stimulus: "red" })).toBe(false)
    expect(predicate({ correct: true, stimulus: "red" })).toBe(true)
    expect(predicate({ correct: false, stimulus: "blue" })).toBe(true)
  })

  it("preserves field and string literal casing while parsing logical operators", () => {
    const predicate = buildPredicate('Condition == "Blue" OR correct == true')

    expect(predicate({ Condition: "Blue", correct: false })).toBe(true)
    expect(predicate({ Condition: "blue", correct: false })).toBe(false)
    expect(predicate({ Condition: "red", correct: true })).toBe(true)
  })

  it("uses and precedence over or", () => {
    const predicate = buildPredicate("a == true or b == true and c == true")

    expect(predicate({ a: true, b: false, c: false })).toBe(true)
    expect(predicate({ a: false, b: true, c: true })).toBe(true)
    expect(predicate({ a: false, b: true, c: false })).toBe(false)
  })

  it("resolves dotted and leading-dot DSL keys as flat row keys first", () => {
    const dottedPredicate = buildPredicate("trials.rt > 500")
    const leadingDotPredicate = buildPredicate(".correct == true")

    expect(dottedPredicate({ "trials.rt": 750 })).toBe(true)
    expect(leadingDotPredicate({ ".correct": true })).toBe(true)
  })
})
