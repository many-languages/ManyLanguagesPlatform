import { describe, it, expect, vi, beforeEach } from "vitest"

const assertStudyNotArchived = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock("@/src/lib/studies", () => ({
  assertStudyNotArchived,
}))

vi.mock("./withStudyAccess", () => ({
  withStudyAccess: vi.fn(async (studyId: number, cb: (id: number, userId: number) => unknown) => {
    return cb(studyId, 42)
  }),
}))

describe("withStudyWriteAccess", () => {
  beforeEach(() => {
    vi.mocked(assertStudyNotArchived).mockClear()
  })

  it("calls assertStudyNotArchived with study id before the callback", async () => {
    const { withStudyWriteAccess } = await import("./withStudyWriteAccess")

    const result = await withStudyWriteAccess(7, async (sid, uid) => {
      expect(sid).toBe(7)
      expect(uid).toBe(42)
      return "ok"
    })

    expect(result).toBe("ok")
    expect(assertStudyNotArchived).toHaveBeenCalledWith(7)
  })
})
