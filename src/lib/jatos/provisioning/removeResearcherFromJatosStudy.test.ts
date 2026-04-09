import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { removeResearcherFromJatosStudy } from "./removeResearcherFromJatosStudy"
import * as removeStudyMemberModule from "../client/removeStudyMember"

const mockFindUnique = vi.fn()

vi.mock("db", () => ({
  default: {
    researcherJatos: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

describe("removeResearcherFromJatosStudy", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.JATOS_TOKEN = "admin-token"
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("removes researcher from JATOS study when ResearcherJatos exists", async () => {
    mockFindUnique.mockResolvedValueOnce({ jatosUserId: 101 })
    const removeSpy = vi
      .spyOn(removeStudyMemberModule, "removeStudyMember")
      .mockResolvedValueOnce(undefined)

    await removeResearcherFromJatosStudy(42, 5)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { userId: 42 },
      select: { jatosUserId: true },
    })
    expect(removeSpy).toHaveBeenCalledWith(
      { studyId: 5, userId: 101 },
      expect.objectContaining({ token: expect.any(String) })
    )
  })

  it("no-op when researcher has no ResearcherJatos record", async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    const removeSpy = vi
      .spyOn(removeStudyMemberModule, "removeStudyMember")
      .mockResolvedValueOnce(undefined)

    await removeResearcherFromJatosStudy(99, 3)

    expect(removeSpy).not.toHaveBeenCalled()
  })
})
