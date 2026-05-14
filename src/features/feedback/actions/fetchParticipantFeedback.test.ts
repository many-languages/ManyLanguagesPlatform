import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getFeedbackTemplateForParticipantRsc: vi.fn(),
  getPersonalDataViolationsForPersistedTemplate: vi.fn(),
  resolvePersistedFeedbackTemplateVariables: vi.fn(),
  getParticipantFeedback: vi.fn(),
}))

vi.mock("@/src/features/feedback/server/getFeedbackTemplate", () => ({
  getFeedbackTemplateForParticipantRsc: mocks.getFeedbackTemplateForParticipantRsc,
}))

vi.mock("@/src/features/feedback/server/feedbackTemplatePersonalDataViolations", () => ({
  getPersonalDataViolationsForPersistedTemplate:
    mocks.getPersonalDataViolationsForPersistedTemplate,
}))

vi.mock("@/src/features/feedback/server/resolvePersistedFeedbackTemplateVariables", () => ({
  resolvePersistedFeedbackTemplateVariables: mocks.resolvePersistedFeedbackTemplateVariables,
}))

vi.mock("@/src/lib/jatos/jatosAccessService", () => ({
  getParticipantFeedback: mocks.getParticipantFeedback,
}))

import { fetchParticipantFeedbackAction } from "./fetchParticipantFeedback"

const studyId = 7
const jatosStudyId = 11

const enrolledTemplate = {
  id: 1,
  content: "Thank you for participating.",
  requiredVariableNames: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
}

const loadedEnriched = {
  id: 101,
  comment: "alice-pseudonym",
  componentResults: [{ path: "/c1", dataContent: null, data: {} }],
}

describe("fetchParticipantFeedbackAction (participant feedback boundary)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPersonalDataViolationsForPersistedTemplate.mockResolvedValue([])
    mocks.resolvePersistedFeedbackTemplateVariables.mockResolvedValue({
      requiredVariableNames: null,
      variableKeysAllowlist: [],
    })
    mocks.getParticipantFeedback.mockResolvedValue({
      kind: "loaded" as const,
      enrichedResult: loadedEnriched,
      matchingResponseCount: 1,
      selectedResponseEndDate: Date.now(),
    })
  })

  it("returns not_authenticated when the participant template loader reports no session", async () => {
    mocks.getFeedbackTemplateForParticipantRsc.mockResolvedValue({ kind: "not_authenticated" })

    await expect(fetchParticipantFeedbackAction(studyId, "any-p", jatosStudyId)).resolves.toEqual({
      kind: "not_authenticated",
    })
    expect(mocks.getParticipantFeedback).not.toHaveBeenCalled()
  })

  it("returns not_enrolled when there is no participant row for this study", async () => {
    mocks.getFeedbackTemplateForParticipantRsc.mockResolvedValue({ kind: "not_enrolled" })

    await expect(fetchParticipantFeedbackAction(studyId, "any-p", jatosStudyId)).resolves.toEqual({
      kind: "not_enrolled",
    })
    expect(mocks.getParticipantFeedback).not.toHaveBeenCalled()
  })

  it("returns maintained when persisted template violates personal-data policy", async () => {
    mocks.getFeedbackTemplateForParticipantRsc.mockResolvedValue({
      kind: "ok",
      template: enrolledTemplate,
      userId: 5,
      participantStudyId: 99,
    })
    mocks.getPersonalDataViolationsForPersistedTemplate.mockResolvedValue(["email"])

    await expect(
      fetchParticipantFeedbackAction(studyId, "alice-pseudonym", jatosStudyId)
    ).resolves.toEqual({
      kind: "done",
      loaded: { kind: "maintained" },
    })
    expect(mocks.getParticipantFeedback).not.toHaveBeenCalled()
  })

  it("returns maintained when privacy policy checks throw (fail closed for participants)", async () => {
    mocks.getFeedbackTemplateForParticipantRsc.mockResolvedValue({
      kind: "ok",
      template: enrolledTemplate,
      userId: 5,
      participantStudyId: 99,
    })
    mocks.getPersonalDataViolationsForPersistedTemplate.mockRejectedValue(new Error("db failure"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(
      fetchParticipantFeedbackAction(studyId, "alice-pseudonym", jatosStudyId)
    ).resolves.toEqual({
      kind: "done",
      loaded: { kind: "maintained" },
    })
    expect(mocks.getParticipantFeedback).not.toHaveBeenCalled()
  })

  it("forwards enrollment ids to JATOS read and surfaces rendered markdown only on success", async () => {
    mocks.getFeedbackTemplateForParticipantRsc.mockResolvedValue({
      kind: "ok",
      template: enrolledTemplate,
      userId: 5,
      participantStudyId: 99,
    })

    const result = await fetchParticipantFeedbackAction(studyId, "alice-pseudonym", jatosStudyId)

    expect(mocks.getParticipantFeedback).toHaveBeenCalledTimes(1)
    expect(mocks.getParticipantFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        studyId,
        pseudonym: "alice-pseudonym",
        jatosStudyId,
        participantStudyId: 99,
        userId: 5,
        templateContent: enrolledTemplate.content,
      })
    )
    expect(result).toMatchObject({
      kind: "done",
      loaded: {
        kind: "loaded",
        matchingResponseCount: 1,
        renderedMarkdown: expect.any(String),
      },
    })
  })

  it("does not expose internal denial details when pseudonym does not match the enrolled participant", async () => {
    mocks.getFeedbackTemplateForParticipantRsc.mockResolvedValue({
      kind: "ok",
      template: enrolledTemplate,
      userId: 5,
      participantStudyId: 99,
    })
    mocks.getParticipantFeedback.mockImplementation(async ({ pseudonym }) => {
      if (pseudonym !== "alice-pseudonym") {
        throw new Error("Pseudonym does not match authenticated user")
      }
      return {
        kind: "loaded" as const,
        enrichedResult: loadedEnriched,
        matchingResponseCount: 1,
        selectedResponseEndDate: null,
      }
    })
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(
      fetchParticipantFeedbackAction(studyId, "someone-else", jatosStudyId)
    ).resolves.toEqual({
      kind: "done",
      loaded: { kind: "failed", error: "Something went wrong. Please try again." },
    })
  })

  it("maps unexpected failures to a safe participant-facing message at the action boundary", async () => {
    mocks.getFeedbackTemplateForParticipantRsc.mockResolvedValue({
      kind: "ok",
      template: enrolledTemplate,
      userId: 5,
      participantStudyId: 99,
    })
    mocks.getParticipantFeedback.mockRejectedValue(new Error("internal orchestration exploded"))

    await expect(
      fetchParticipantFeedbackAction(studyId, "alice-pseudonym", jatosStudyId)
    ).resolves.toEqual({
      kind: "done",
      loaded: { kind: "failed", error: "Something went wrong. Please try again." },
    })
  })
})
