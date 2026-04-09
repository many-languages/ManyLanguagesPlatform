import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { importJatosStudyForResearcher } from "./importJatosStudy"
import JSZip from "jszip"
import * as verifyResearchersStudyAccess from "@/src/app/(app)/studies/[studyId]/utils/verifyResearchersStudyAccess"

const mockUploadStudy = vi.fn()
const mockEnsureResearcherJatosMember = vi.fn()
const mockAddStudyMember = vi.fn()
const mockGetServiceAccountJatosUserId = vi.fn()

vi.mock("@/src/app/(app)/studies/[studyId]/utils/verifyResearchersStudyAccess", () => ({
  verifyResearcherStudyAccess: vi.fn(),
}))
vi.mock("../client/uploadStudy", () => ({
  uploadStudy: (...args: unknown[]) => mockUploadStudy(...args),
}))
vi.mock("./ensureResearcherJatosMember", () => ({
  ensureResearcherJatosMember: (...args: unknown[]) => mockEnsureResearcherJatosMember(...args),
}))
vi.mock("../client/addStudyMember", () => ({
  addStudyMember: (...args: unknown[]) => mockAddStudyMember(...args),
}))
vi.mock("../serviceAccount", () => ({
  getServiceAccountJatosUserId: () => mockGetServiceAccountJatosUserId(),
}))
vi.mock("../getAdminToken", () => ({
  getAdminToken: () => "admin-token",
}))

vi.mock("@/src/app/(app)/studies/[studyId]/setup/utils/deriveStep1Completed", () => ({
  deriveStep1Completed: (study: { title?: string; description?: string }) =>
    Boolean(study?.title && study?.description),
}))

const mockTransaction = vi.fn()
const mockStudyFindUnique = vi.fn()
const mockStudyUpdate = vi.fn()
const mockUploadFindUnique = vi.fn()
const mockUploadUpdate = vi.fn()
const mockUploadFindFirst = vi.fn()
const mockUploadCreate = vi.fn()
const mockStudyResearcherFindMany = vi.fn()

vi.mock("db", () => ({
  default: {
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
    studyResearcher: {
      findMany: (...args: unknown[]) => mockStudyResearcherFindMany(...args),
    },
  },
}))

async function createTestJzipFile(): Promise<File> {
  const zip = new JSZip()
  zip.file("study.jas", JSON.stringify({ version: 3, data: { uuid: "test-uuid-123" } }))
  zip.file("manifest.json", "{}")
  const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" })
  const blob = new Blob([arrayBuffer], { type: "application/zip" })
  Object.defineProperty(blob, "name", { value: "study.jzip", writable: false })
  return blob as unknown as File
}

describe("importJatosStudyForResearcher", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(verifyResearchersStudyAccess.verifyResearcherStudyAccess).mockResolvedValue(undefined)
    mockUploadStudy.mockResolvedValue({
      id: 100,
      uuid: "jatos-uuid-456",
      title: "Imported Study",
    })
    mockGetServiceAccountJatosUserId.mockResolvedValue(50)
    mockEnsureResearcherJatosMember.mockResolvedValue(undefined)
    mockAddStudyMember.mockResolvedValue(undefined)

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        study: {
          findUnique: mockStudyFindUnique,
          update: mockStudyUpdate,
        },
        jatosStudyUpload: {
          findUnique: mockUploadFindUnique,
          update: mockUploadUpdate,
          findFirst: mockUploadFindFirst,
          create: mockUploadCreate,
        },
      }
      return fn(tx)
    })

    mockStudyFindUnique.mockResolvedValue({
      title: "My Study",
      description: "Description",
    })
    mockUploadFindUnique.mockResolvedValue(null)
    mockUploadFindFirst.mockResolvedValue(null)
    mockUploadCreate.mockResolvedValue({ id: 1 })
    mockStudyUpdate.mockResolvedValue(undefined)
    mockStudyResearcherFindMany.mockResolvedValue([{ userId: 42 }])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("orchestrates full import flow and returns result", async () => {
    const file = await createTestJzipFile()

    const result = await importJatosStudyForResearcher({
      file,
      studyId: 1,
      userId: 42,
      jatosWorkerType: "SINGLE",
    })

    expect(verifyResearchersStudyAccess.verifyResearcherStudyAccess).toHaveBeenCalledWith(1, 42)
    expect(mockUploadStudy).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ token: expect.any(String) })
    )
    expect(result).toEqual({
      jatosStudyId: 100,
      jatosStudyUUID: "jatos-uuid-456",
      jatosFileName: "study.jzip",
      buildHash: expect.any(String),
      hashAlgorithm: "sha256",
      studyExists: true,
      uploadedStudyTitle: "Imported Study",
      latestUpload: { id: 1 },
    })
    expect(mockEnsureResearcherJatosMember).toHaveBeenCalledWith(42, 100)
    expect(mockAddStudyMember).toHaveBeenCalledWith(
      { studyId: 100, userId: 50 },
      expect.objectContaining({ token: expect.any(String) })
    )
  })

  it("throws when researcher has no study access", async () => {
    vi
      .mocked(verifyResearchersStudyAccess.verifyResearcherStudyAccess)
      .mockRejectedValueOnce(new Error("You are not authorized to access this study.")) as any
    const file = await createTestJzipFile()

    await expect(
      importJatosStudyForResearcher({
        file,
        studyId: 1,
        userId: 999,
        jatosWorkerType: "SINGLE",
      })
    ).rejects.toThrow("You are not authorized to access this study.")

    expect(mockUploadStudy).not.toHaveBeenCalled()
  })

  it("propagates uploadStudy failure", async () => {
    mockUploadStudy.mockRejectedValueOnce(new Error("JATOS upload failed"))
    const file = await createTestJzipFile()

    await expect(
      importJatosStudyForResearcher({
        file,
        studyId: 1,
        userId: 42,
        jatosWorkerType: "SINGLE",
      })
    ).rejects.toThrow("JATOS upload failed")
  })

  it("skips addStudyMember when service account not provisioned", async () => {
    mockGetServiceAccountJatosUserId.mockResolvedValueOnce(null)
    const file = await createTestJzipFile()

    await importJatosStudyForResearcher({
      file,
      studyId: 1,
      userId: 42,
      jatosWorkerType: "SINGLE",
    })

    expect(mockAddStudyMember).not.toHaveBeenCalled()
  })

  it("updates existing upload when buildHash matches", async () => {
    mockUploadFindUnique.mockResolvedValueOnce({ id: 5 })
    mockUploadUpdate.mockResolvedValueOnce({ id: 5 })
    const file = await createTestJzipFile()

    const result = await importJatosStudyForResearcher({
      file,
      studyId: 1,
      userId: 42,
      jatosWorkerType: "MULTIPLE",
    })

    expect(mockUploadCreate).not.toHaveBeenCalled()
    expect(mockUploadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({
          jatosStudyId: 100,
          jatosFileName: "study.jzip",
          jatosWorkerType: "MULTIPLE",
        }),
      })
    )
    expect(result.latestUpload).toEqual({ id: 5 })
  })
})
