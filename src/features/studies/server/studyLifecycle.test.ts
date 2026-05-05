import { describe, it, expect, vi, beforeEach } from "vitest"
import { assertStudyNotArchived } from "./studyLifecycle"
import { ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE } from "../domain/studyEditability"
import db from "db"

vi.mock("db", () => ({
  default: {
    study: {
      findUnique: vi.fn(),
    },
  },
}))

describe("assertStudyNotArchived", () => {
  beforeEach(() => {
    vi.mocked(db.study.findUnique).mockReset()
  })

  it("throws when study is archived (by id)", async () => {
    vi.mocked(db.study.findUnique).mockResolvedValue({ archived: true } as Awaited<
      ReturnType<typeof db.study.findUnique>
    >)

    await expect(assertStudyNotArchived(1)).rejects.toThrow(ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE)
  })

  it("resolves when study is not archived (by id)", async () => {
    vi.mocked(db.study.findUnique).mockResolvedValue({ archived: false } as Awaited<
      ReturnType<typeof db.study.findUnique>
    >)

    await expect(assertStudyNotArchived(1)).resolves.toBeUndefined()
  })

  it("throws when study is missing (by id)", async () => {
    vi.mocked(db.study.findUnique).mockResolvedValue(null)

    await expect(assertStudyNotArchived(99)).rejects.toThrow("Study not found")
  })

  it("throws when study object has archived true", async () => {
    await expect(assertStudyNotArchived({ archived: true })).rejects.toThrow(
      ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE
    )
  })

  it("resolves when study object is not archived", async () => {
    await expect(assertStudyNotArchived({ archived: false })).resolves.toBeUndefined()
  })
})
