/**
 * jatosAccessService — seam-line tests.
 *
 * Focus: access enforcement, token broker integration, best-effort fallback,
 * critical throws, no real JATOS network calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getResultsMetadataForResearcher,
  getResultsMetadataForResearcherDashboard,
  getResultsMetadataForParticipantDashboard,
  checkParticipantCompletionForParticipant,
  getParticipantFeedback,
  createPersonalStudyCodeForParticipant,
  createPersonalStudyCodeForResearcher,
  downloadAllResultsForResearcher,
} from "./jatosAccessService"
import * as tokenBrokerModule from "./tokenBroker"
import * as getResultsMetadataModule from "./client/getResultsMetadata"
import * as getResultsDataModule from "./client/getResultsData"
import * as fetchStudyCodesModule from "./client/fetchStudyCodes"
import * as parseJatosZipModule from "./parsers/parseJatosZip"
import * as matchJatosDataToMetadataModule from "./utils/matchJatosDataToMetadata"
import * as generateJatosRunUrlModule from "./utils/generateJatosRunUrl"
import * as loggerModule from "./logger"

// --- DB mocks ---
const mockStudyResearcherFindFirst = vi.fn()
const mockParticipantStudyFindUnique = vi.fn()
const mockJatosStudyUploadFindFirst = vi.fn()
const mockStudyFindUnique = vi.fn()

vi.mock("db", () => ({
  default: {
    studyResearcher: { findFirst: (...args: unknown[]) => mockStudyResearcherFindFirst(...args) },
    participantStudy: {
      findUnique: (...args: unknown[]) => mockParticipantStudyFindUnique(...args),
    },
    jatosStudyUpload: { findFirst: (...args: unknown[]) => mockJatosStudyUploadFindFirst(...args) },
    study: { findUnique: (...args: unknown[]) => mockStudyFindUnique(...args) },
  },
}))

const SAMPLE_METADATA = {
  data: [
    {
      studyId: 1,
      studyUuid: "uuid-1",
      studyTitle: "Test Study",
      studyResults: [
        {
          id: 101,
          comment: "participant-1",
          componentResults: [{ path: "/foo", data: { size: 0 } }],
        },
      ],
    },
  ],
}

const SAMPLE_ENRICHED = [
  {
    id: 101,
    comment: "participant-1",
    componentResults: [{ path: "/foo", dataContent: null, data: { size: 0 } }],
  },
]

describe("jatosAccessService", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockStudyResearcherFindFirst.mockResolvedValue({ id: 1 })
    mockParticipantStudyFindUnique.mockResolvedValue({ pseudonym: "participant-1" })
    mockJatosStudyUploadFindFirst.mockResolvedValue({ jatosStudyId: 1 })
    mockStudyFindUnique.mockResolvedValue({ jatosStudyUUID: "uuid-1" })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("1. researcher flow", () => {
    it("enforces access check, calls token broker, and getResultsMetadata with token", async () => {
      const getTokenSpy = vi
        .spyOn(tokenBrokerModule, "getTokenForResearcher")
        .mockResolvedValue("researcher-token-xyz")
      const getMetadataSpy = vi
        .spyOn(getResultsMetadataModule, "getResultsMetadata")
        .mockResolvedValue(SAMPLE_METADATA as never)

      const result = await getResultsMetadataForResearcher({
        studyId: 10,
        userId: 42,
      })

      expect(mockStudyResearcherFindFirst).toHaveBeenCalledWith({
        where: { studyId: 10, userId: 42 },
      })
      expect(getTokenSpy).toHaveBeenCalledWith(42)
      expect(getMetadataSpy).toHaveBeenCalledWith(
        expect.objectContaining({ studyIds: expect.any(Array) }),
        { token: "researcher-token-xyz" }
      )
      expect(result).toEqual(SAMPLE_METADATA)
    })
  })

  describe("2. participant flow", () => {
    it("enforces participant access, calls getTokenForStudyService, and getResultsMetadata", async () => {
      const getTokenSpy = vi
        .spyOn(tokenBrokerModule, "getTokenForStudyService")
        .mockResolvedValue("service-token-abc")
      const getMetadataSpy = vi
        .spyOn(getResultsMetadataModule, "getResultsMetadata")
        .mockResolvedValue(SAMPLE_METADATA as never)

      const result = await checkParticipantCompletionForParticipant({
        studyId: 10,
        pseudonym: "participant-1",
        jatosStudyId: 1,
        userId: 100,
      })

      expect(mockParticipantStudyFindUnique).toHaveBeenCalledWith({
        where: { userId_studyId: { userId: 100, studyId: 10 } },
        select: { pseudonym: true },
      })
      expect(getTokenSpy).toHaveBeenCalledWith(1)
      expect(getMetadataSpy).toHaveBeenCalledWith({ studyIds: [1] }, { token: "service-token-abc" })
      expect(result).toEqual({ success: true, completed: true })
    })
  })

  describe("3. best-effort dashboard flow", () => {
    it("returns null and logs when getResultsMetadataForResearcherDashboard fails", async () => {
      vi.spyOn(tokenBrokerModule, "getTokenForResearcher").mockResolvedValue("token")
      vi.spyOn(getResultsMetadataModule, "getResultsMetadata").mockRejectedValue(
        new Error("JATOS unreachable")
      )
      const logSpy = vi.spyOn(loggerModule, "logJatosError").mockImplementation(() => {})

      const result = await getResultsMetadataForResearcherDashboard({
        studyId: 10,
        userId: 42,
        studyUuids: ["uuid-1"],
      })

      expect(result).toBeNull()
      expect(logSpy).toHaveBeenCalledWith(
        "[getResultsMetadataForResearcherDashboard] JATOS metadata fetch failed",
        expect.objectContaining({
          operation: "getResultsMetadataForResearcherDashboard",
          studyId: 10,
          userId: 42,
          error: expect.any(Error),
        })
      )
    })

    it("returns null for getResultsMetadataForParticipantDashboard on failure", async () => {
      vi.spyOn(tokenBrokerModule, "getTokenForStudyService").mockRejectedValue(
        new Error("Service account not provisioned")
      )
      const logSpy = vi.spyOn(loggerModule, "logJatosError").mockImplementation(() => {})

      const result = await getResultsMetadataForParticipantDashboard({
        userId: 100,
        jatosStudyIds: [1],
      })

      expect(result).toBeNull()
      expect(logSpy).toHaveBeenCalledWith(
        "[getResultsMetadataForParticipantDashboard] JATOS metadata fetch failed",
        expect.objectContaining({
          operation: "getResultsMetadataForParticipantDashboard",
          userId: 100,
          error: expect.any(Error),
        })
      )
    })
  })

  describe("4. access-denied flow", () => {
    it("throws when researcher is not authorized", async () => {
      mockStudyResearcherFindFirst.mockResolvedValueOnce(null)

      await expect(getResultsMetadataForResearcher({ studyId: 10, userId: 999 })).rejects.toThrow(
        "You are not authorized to access this study."
      )
    })

    it("returns error when participant not found or pseudonym mismatch", async () => {
      mockParticipantStudyFindUnique.mockResolvedValueOnce(null)

      const result = await checkParticipantCompletionForParticipant({
        studyId: 10,
        pseudonym: "participant-1",
        jatosStudyId: 1,
        userId: 100,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe("5. result-enrichment flow", () => {
    it("calls token broker, getResultsMetadata, getResultsData, parseJatosZip, matchJatosDataToMetadata", async () => {
      vi.spyOn(tokenBrokerModule, "getTokenForStudyService").mockResolvedValue("service-token")
      vi.spyOn(getResultsMetadataModule, "getResultsMetadata")
        .mockResolvedValueOnce(SAMPLE_METADATA as never)
        .mockResolvedValueOnce(SAMPLE_METADATA as never)
      vi.spyOn(getResultsDataModule, "getResultsData")
        .mockResolvedValueOnce({
          success: true,
          data: Buffer.from("zip"),
          contentType: "application/zip",
        })
        .mockResolvedValueOnce({
          success: true,
          data: Buffer.from("zip"),
          contentType: "application/zip",
        })
      vi.spyOn(parseJatosZipModule, "parseJatosZip").mockResolvedValue([
        { filename: "foo", content: "" },
      ])
      vi.spyOn(matchJatosDataToMetadataModule, "matchJatosDataToMetadata").mockReturnValue(
        SAMPLE_ENRICHED as never
      )

      const result = await getParticipantFeedback({
        studyId: 10,
        pseudonym: "participant-1",
        jatosStudyId: 1,
        userId: 100,
      })

      expect(result.success).toBe(true)
      expect(result.completed).toBe(true)
      expect(result.data?.enrichedResult).toBeDefined()
      expect(result.data?.allEnrichedResults).toHaveLength(1)
      expect(getResultsDataModule.getResultsData).toHaveBeenCalledWith(expect.any(Object), {
        token: "service-token",
      })
    })
  })

  describe("6. createPersonalStudyCodeForParticipant", () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const EXPECTED_RUN_URL = "https://jatos.example/publix/ps-abc123"

    beforeEach(() => {
      vi.spyOn(generateJatosRunUrlModule, "generateJatosRunUrl").mockReturnValue(EXPECTED_RUN_URL)
    })

    it("enforces participant access check and uses study-service token path", async () => {
      const getTokenSpy = vi
        .spyOn(tokenBrokerModule, "getTokenForStudyService")
        .mockResolvedValue("service-token")
      const fetchCodesSpy = vi
        .spyOn(fetchStudyCodesModule, "fetchStudyCodes")
        .mockResolvedValue(["ps-abc123"])

      await createPersonalStudyCodeForParticipant({
        studyId: 10,
        userId: 100,
        jatosStudyId: 5,
        type: "ps",
        comment: "participant-1",
        onSave,
      })

      expect(mockParticipantStudyFindUnique).toHaveBeenCalledWith({
        where: { userId_studyId: { userId: 100, studyId: 10 } },
        select: { pseudonym: true },
      })
      expect(getTokenSpy).toHaveBeenCalledWith(5)
      expect(fetchCodesSpy).toHaveBeenCalledWith(
        { studyId: 5, type: "ps", amount: 1, comment: "participant-1" },
        { token: "service-token" }
      )
    })

    it("calls fetchStudyCodes with expected params including batchId when provided", async () => {
      mockParticipantStudyFindUnique.mockResolvedValueOnce({ pseudonym: "participant-2" })
      vi.spyOn(tokenBrokerModule, "getTokenForStudyService").mockResolvedValue("service-token")
      const fetchCodesSpy = vi
        .spyOn(fetchStudyCodesModule, "fetchStudyCodes")
        .mockResolvedValue(["ps-xyz"])

      await createPersonalStudyCodeForParticipant({
        studyId: 10,
        userId: 100,
        jatosStudyId: 5,
        jatosBatchId: 99,
        type: "pm",
        comment: "participant-2",
        onSave,
      })

      expect(fetchCodesSpy).toHaveBeenCalledWith(
        { studyId: 5, type: "pm", amount: 1, batchId: 99, comment: "participant-2" },
        { token: "service-token" }
      )
    })

    it("throws when fetchStudyCodes returns empty list", async () => {
      vi.spyOn(tokenBrokerModule, "getTokenForStudyService").mockResolvedValue("service-token")
      vi.spyOn(fetchStudyCodesModule, "fetchStudyCodes").mockResolvedValue([])

      await expect(
        createPersonalStudyCodeForParticipant({
          studyId: 10,
          userId: 100,
          jatosStudyId: 5,
          type: "ps",
          comment: "participant-1",
          onSave,
        })
      ).rejects.toThrow("No study code found")

      expect(onSave).not.toHaveBeenCalled()
    })

    it("calls onSave with generated run URL and returns it", async () => {
      vi.spyOn(tokenBrokerModule, "getTokenForStudyService").mockResolvedValue("service-token")
      vi.spyOn(fetchStudyCodesModule, "fetchStudyCodes").mockResolvedValue(["ps-abc123"])

      const result = await createPersonalStudyCodeForParticipant({
        studyId: 10,
        userId: 100,
        jatosStudyId: 5,
        type: "ps",
        comment: "participant-1",
        onSave,
      })

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith(EXPECTED_RUN_URL)
      expect(result).toBe(EXPECTED_RUN_URL)
    })
  })

  describe("7. createPersonalStudyCodeForResearcher", () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const EXPECTED_RUN_URL = "https://jatos.example/publix/ps-researcher-code"

    beforeEach(() => {
      vi.spyOn(generateJatosRunUrlModule, "generateJatosRunUrl").mockReturnValue(EXPECTED_RUN_URL)
    })

    it("enforces researcher access check and uses researcher token path", async () => {
      const getTokenSpy = vi
        .spyOn(tokenBrokerModule, "getTokenForResearcher")
        .mockResolvedValue("researcher-token")
      const fetchCodesSpy = vi
        .spyOn(fetchStudyCodesModule, "fetchStudyCodes")
        .mockResolvedValue(["ps-researcher-code"])

      await createPersonalStudyCodeForResearcher({
        studyId: 10,
        userId: 42,
        jatosStudyId: 5,
        type: "ps",
        comment: "pilot-test",
        onSave,
      })

      expect(mockStudyResearcherFindFirst).toHaveBeenCalledWith({
        where: { studyId: 10, userId: 42 },
      })
      expect(getTokenSpy).toHaveBeenCalledWith(42)
      expect(fetchCodesSpy).toHaveBeenCalledWith(
        { studyId: 5, type: "ps", amount: 1, comment: "pilot-test" },
        { token: "researcher-token" }
      )
    })

    it("throws when fetchStudyCodes returns empty list", async () => {
      vi.spyOn(tokenBrokerModule, "getTokenForResearcher").mockResolvedValue("researcher-token")
      vi.spyOn(fetchStudyCodesModule, "fetchStudyCodes").mockResolvedValue([])

      await expect(
        createPersonalStudyCodeForResearcher({
          studyId: 10,
          userId: 42,
          jatosStudyId: 5,
          type: "ps",
          comment: "pilot",
          onSave,
        })
      ).rejects.toThrow("No study code found")

      expect(onSave).not.toHaveBeenCalled()
    })

    it("calls onSave with generated run URL and returns it", async () => {
      vi.spyOn(tokenBrokerModule, "getTokenForResearcher").mockResolvedValue("researcher-token")
      vi.spyOn(fetchStudyCodesModule, "fetchStudyCodes").mockResolvedValue(["ps-researcher-code"])

      const result = await createPersonalStudyCodeForResearcher({
        studyId: 10,
        userId: 42,
        jatosStudyId: 5,
        type: "ps",
        comment: "pilot",
        onSave,
      })

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith(EXPECTED_RUN_URL)
      expect(result).toBe(EXPECTED_RUN_URL)
    })
  })

  describe("8. downloadAllResultsForResearcher", () => {
    it("enforces researcher access check", async () => {
      vi.spyOn(tokenBrokerModule, "getTokenForResearcher").mockResolvedValue("researcher-token")
      mockJatosStudyUploadFindFirst.mockResolvedValue({ jatosStudyId: 7 })
      mockStudyFindUnique.mockResolvedValue({ jatosStudyUUID: "uuid-7" })
      vi.spyOn(getResultsDataModule, "getResultsData").mockResolvedValue({
        success: true,
        data: Buffer.from("zip-content"),
        contentType: "application/zip",
      })

      await downloadAllResultsForResearcher({ studyId: 10, userId: 42 })

      expect(mockStudyResearcherFindFirst).toHaveBeenCalledWith({
        where: { studyId: 10, userId: 42 },
      })
      expect(tokenBrokerModule.getTokenForResearcher).toHaveBeenCalledWith(42)
    })

    it("throws when study has no JATOS ID (missing upload or UUID)", async () => {
      vi.spyOn(tokenBrokerModule, "getTokenForResearcher").mockResolvedValue("researcher-token")
      mockJatosStudyUploadFindFirst.mockResolvedValue(null)

      await expect(downloadAllResultsForResearcher({ studyId: 10, userId: 42 })).rejects.toThrow(
        "Study does not have JATOS ID"
      )
    })

    it("returns expected payload when getResultsData succeeds", async () => {
      vi.spyOn(tokenBrokerModule, "getTokenForResearcher").mockResolvedValue("researcher-token")
      mockJatosStudyUploadFindFirst.mockResolvedValue({ jatosStudyId: 7 })
      mockStudyFindUnique.mockResolvedValue({ jatosStudyUUID: "uuid-7" })
      vi.spyOn(getResultsDataModule, "getResultsData").mockResolvedValue({
        success: true,
        data: Buffer.from("zip-content"),
        contentType: "application/zip",
      })

      const result = await downloadAllResultsForResearcher({ studyId: 10, userId: 42 })

      expect(result).toEqual({
        filename: "study_7_results.zip",
        mimeType: "application/zip",
        base64: Buffer.from("zip-content").toString("base64"),
      })
    })

    it("throws when getResultsData returns success: false", async () => {
      vi.spyOn(tokenBrokerModule, "getTokenForResearcher").mockResolvedValue("researcher-token")
      mockJatosStudyUploadFindFirst.mockResolvedValue({ jatosStudyId: 7 })
      mockStudyFindUnique.mockResolvedValue({ jatosStudyUUID: "uuid-7" })
      vi.spyOn(getResultsDataModule, "getResultsData").mockResolvedValue({
        success: false,
      } as never)

      await expect(downloadAllResultsForResearcher({ studyId: 10, userId: 42 })).rejects.toThrow(
        "Failed to fetch results from JATOS"
      )
    })
  })
})
