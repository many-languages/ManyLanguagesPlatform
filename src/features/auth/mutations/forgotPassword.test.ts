import { vi, describe, it, beforeAll, expect } from "vitest"
import db, { UserRole } from "db"
import { hash256 } from "@blitzjs/auth"
import forgotPassword from "./forgotPassword"
import { Ctx } from "@blitzjs/next"
import { PasswordResetDeliveryError } from "../server/forgotPassword"

beforeAll(async () => {
  await db.$reset()
})

let generatedToken = "plain-token"
vi.mock("@blitzjs/auth", async () => {
  const auth = await vi.importActual<Record<string, unknown>>("@blitzjs/auth")!
  return {
    ...auth,
    generateToken: () => generatedToken,
  }
})

describe("forgotPassword mutation", () => {
  it("does not throw error if user doesn't exist", async () => {
    await expect(forgotPassword({ email: "no-user@email.com" }, {} as Ctx)).resolves.not.toThrow()
  })

  it("works correctly", async () => {
    generatedToken = "plain-token"

    const user = await db.user.create({
      data: {
        email: "user@example.com",
        role: UserRole.PARTICIPANT,
        tokens: {
          create: {
            type: "RESET_PASSWORD",
            hashedToken: "token",
            expiresAt: new Date(),
            sentTo: "user@example.com",
          },
        },
      },
      include: { tokens: true },
    })

    await forgotPassword({ email: user.email }, {} as Ctx)

    const tokens = await db.token.findMany({ where: { userId: user.id } })
    const token = tokens[0]
    if (!user.tokens[0]) throw new Error("Missing user token")
    if (!token) throw new Error("Missing token")

    expect(tokens.length).toBe(1)
    expect(token.id).not.toBe(user.tokens[0].id)
    expect(token.type).toBe("RESET_PASSWORD")
    expect(token.sentTo).toBe(user.email)
    expect(token.hashedToken).toBe(hash256(generatedToken))
    expect(token.expiresAt > new Date()).toBe(true)
  })

  it("deletes the reset token and throws a controlled error if email delivery fails", async () => {
    generatedToken = "plain-token-mail-fail"

    const user = await db.user.create({
      data: {
        email: "mail-fail@example.com",
        role: UserRole.PARTICIPANT,
      },
    })

    const mailerModule = await import("mailers/forgotPasswordMailer")
    const mailerSpy = vi
      .spyOn(mailerModule, "forgotPasswordMailer")
      .mockReturnValue({ send: vi.fn().mockRejectedValue(new Error("SMTP down")) })

    try {
      await forgotPassword({ email: user.email }, {} as Ctx)
      throw new Error("Expected forgotPassword to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(PasswordResetDeliveryError)
      expect((error as Error).message).toBe(
        "We couldn't send the password reset email. Please reach out to the developers for help."
      )
    }

    const tokens = await db.token.findMany({ where: { userId: user.id } })
    expect(tokens).toHaveLength(0)

    mailerSpy.mockRestore()
  })
})
