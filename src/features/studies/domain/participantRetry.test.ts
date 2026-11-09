import { describe, expect, it } from "vitest"
import type { JatosStudyResult } from "@/src/types/jatos"
import { isParticipantRetryable, pickParticipantStudyResult } from "./participantRetry"

const result = (id: number, comment: string, studyState: string) =>
  ({ id, comment, studyState } as unknown as JatosStudyResult)

describe("isParticipantRetryable", () => {
  it("allows single-run participants who started but did not finish", () => {
    expect(isParticipantRetryable({ workerType: "SINGLE", started: true, finished: false })).toBe(
      true
    )
  })

  it("rejects multiple-run studies", () => {
    expect(isParticipantRetryable({ workerType: "MULTIPLE", started: true, finished: false })).toBe(
      false
    )
  })

  it("rejects participants who never started", () => {
    expect(isParticipantRetryable({ workerType: "SINGLE", started: false, finished: false })).toBe(
      false
    )
  })

  it("rejects participants with a finished run", () => {
    expect(isParticipantRetryable({ workerType: "SINGLE", started: true, finished: true })).toBe(
      false
    )
  })
})

describe("pickParticipantStudyResult", () => {
  const participant = { pseudonym: "p-1", email: "a@b.c" }

  it("returns undefined when the participant has no result", () => {
    expect(
      pickParticipantStudyResult([result(1, "other", "FINISHED")], participant)
    ).toBeUndefined()
  })

  it("prefers a finished result even when an unfinished one is newer", () => {
    const picked = pickParticipantStudyResult(
      [result(5, "p-1", "FAIL"), result(3, "p-1", "FINISHED")],
      participant
    )
    expect(picked?.id).toBe(3)
  })

  it("falls back to the newest result when none finished", () => {
    const picked = pickParticipantStudyResult(
      [result(2, "p-1", "FAIL"), result(4, "p-1", "ABORTED")],
      participant
    )
    expect(picked?.id).toBe(4)
  })

  it("still matches legacy results commented with the email", () => {
    expect(pickParticipantStudyResult([result(1, "a@b.c", "FINISHED")], participant)?.id).toBe(1)
  })
})
