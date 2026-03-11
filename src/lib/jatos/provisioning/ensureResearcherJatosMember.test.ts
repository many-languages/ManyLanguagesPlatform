import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ensureResearcherJatosMember } from "./ensureResearcherJatosMember"
import * as provisionResearcherJatosModule from "./provisionResearcherJatos"
import * as addStudyMemberModule from "../api/admin/addStudyMember"

describe("ensureResearcherJatosMember", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("provisions researcher and adds them as study member", async () => {
    const provisionSpy = vi
      .spyOn(provisionResearcherJatosModule, "provisionResearcherJatos")
      .mockResolvedValueOnce({ jatosUserId: 101 })
    const addMemberSpy = vi
      .spyOn(addStudyMemberModule, "addStudyMember")
      .mockResolvedValueOnce(undefined)

    await ensureResearcherJatosMember(42, 5)

    expect(provisionSpy).toHaveBeenCalledWith(42)
    expect(addMemberSpy).toHaveBeenCalledWith({ studyId: 5, userId: 101 })
  })

  it("uses existing jatosUserId when researcher already provisioned", async () => {
    const provisionSpy = vi
      .spyOn(provisionResearcherJatosModule, "provisionResearcherJatos")
      .mockResolvedValueOnce({ jatosUserId: 99 })
    const addMemberSpy = vi
      .spyOn(addStudyMemberModule, "addStudyMember")
      .mockResolvedValueOnce(undefined)

    await ensureResearcherJatosMember(10, 3)

    expect(provisionSpy).toHaveBeenCalledWith(10)
    expect(addMemberSpy).toHaveBeenCalledWith({ studyId: 3, userId: 99 })
  })
})
