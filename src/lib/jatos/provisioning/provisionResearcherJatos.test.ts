import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { provisionResearcherJatos } from "./provisionResearcherJatos"
import * as createJatosUserModule from "../api/admin/createJatosUser"

const mockFindUnique = vi.fn()
const mockCreate = vi.fn()

vi.mock("db", () => ({
  default: {
    researcherJatos: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

describe("provisionResearcherJatos", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates JATOS user and ResearcherJatos when not yet provisioned", async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    const createSpy = vi
      .spyOn(createJatosUserModule, "createJatosUser")
      .mockResolvedValueOnce({ id: 101, username: "mlp-researcher-42" })
    mockCreate.mockResolvedValueOnce({
      id: 1,
      userId: 42,
      jatosUserId: 101,
    })

    const result = await provisionResearcherJatos(42)

    expect(result).toEqual({ jatosUserId: 101 })
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { userId: 42 },
      select: { jatosUserId: true },
    })
    expect(createSpy).toHaveBeenCalledWith({
      username: "mlp-researcher-42",
      name: "MLP Researcher 42",
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: 42, jatosUserId: 101 },
    })
  })

  it("returns existing jatosUserId when already provisioned (idempotent)", async () => {
    mockFindUnique.mockResolvedValueOnce({ jatosUserId: 99 })
    const createSpy = vi.spyOn(createJatosUserModule, "createJatosUser")

    const result = await provisionResearcherJatos(42)

    expect(result).toEqual({ jatosUserId: 99 })
    expect(mockFindUnique).toHaveBeenCalledTimes(1)
    expect(createSpy).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
