import { describe, expect, it } from "vitest"
import { buildFeedbackRenderContext } from "./feedbackRenderContext"
import { renderTemplateWithContext } from "./feedbackTemplateRenderer"
import type { FeedbackRenderBundleInput } from "./renderTypes"

describe("feedback render context", () => {
  it("renders legacy leading-dot DSL keys against normalized extraction DSL keys", () => {
    const bundle: FeedbackRenderBundleInput = {
      variables: [
        {
          variableKey: "$[*].correct",
          variableName: "correct",
          dslKey: "correct",
        },
        {
          variableKey: "$[*].rt",
          variableName: "rt",
          dslKey: "rt",
        },
      ],
      observations: [
        {
          variableKey: "$[*].correct",
          valueJson: "true",
          scopeKeyId: "studyResultId:1|componentId:1",
          rowKeyId: "root",
        },
        {
          variableKey: "$[*].rt",
          valueJson: "250",
          scopeKeyId: "studyResultId:1|componentId:1",
          rowKeyId: "root",
        },
      ],
    }

    const context = buildFeedbackRenderContext(bundle, [".correct", ".rt"])

    expect(renderTemplateWithContext("{{ var:.correct }}", context)).toBe("true")
    expect(
      renderTemplateWithContext("{{#if var:.correct == true}}{{ var:.rt }}{{/if}}", context)
    ).toBe("250")
  })

  it("renders stat references inside conditionals", () => {
    const bundle: FeedbackRenderBundleInput = {
      variables: [
        {
          variableKey: "$[*].rt",
          variableName: "rt",
          dslKey: "rt",
        },
      ],
      observations: [
        {
          variableKey: "$[*].rt",
          valueJson: "200",
          scopeKeyId: "studyResultId:1|componentId:1",
          rowKeyId: "row#1",
        },
        {
          variableKey: "$[*].rt",
          valueJson: "800",
          scopeKeyId: "studyResultId:1|componentId:1",
          rowKeyId: "row#2",
        },
      ],
    }

    const context = buildFeedbackRenderContext(bundle, [".rt"])

    expect(renderTemplateWithContext("{{#if stat:.rt.avg > 400}}high{{/if}}", context)).toBe("high")
    expect(
      renderTemplateWithContext("{{#if stat:.rt.avg > 600}}high{{else}}low{{/if}}", context)
    ).toBe("low")
  })

  it("renders conditionals with explicit boolean operators without dynamic evaluation", () => {
    const bundle: FeedbackRenderBundleInput = {
      variables: [
        {
          variableKey: "$[*].correct",
          variableName: "correct",
          dslKey: "correct",
        },
        {
          variableKey: "$[*].conditionName",
          variableName: "conditionName",
          dslKey: "conditionName",
        },
      ],
      observations: [
        {
          variableKey: "$[*].correct",
          valueJson: "false",
          scopeKeyId: "studyResultId:1|componentId:1",
          rowKeyId: "root",
        },
        {
          variableKey: "$[*].conditionName",
          valueJson: '"Blue"',
          scopeKeyId: "studyResultId:1|componentId:1",
          rowKeyId: "root",
        },
      ],
    }

    const context = buildFeedbackRenderContext(bundle, ["correct", "conditionName"])

    expect(
      renderTemplateWithContext(
        '{{#if var:correct == true or var:conditionName == "Blue"}}match{{/if}}',
        context
      )
    ).toBe("match")
    expect(renderTemplateWithContext("{{#if not var:correct}}incorrect{{/if}}", context)).toBe(
      "incorrect"
    )
    expect(
      renderTemplateWithContext(
        '{{#if (var:correct == true or var:conditionName == "Blue") and true}}match{{/if}}',
        context
      )
    ).toBe("match")
  })
})
