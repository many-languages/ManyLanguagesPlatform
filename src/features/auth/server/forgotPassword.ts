import { generateToken, hash256 } from "@blitzjs/auth"
import db from "db"
import { forgotPasswordMailer } from "mailers/forgotPasswordMailer"
import { ForgotPassword } from "../validations"

const RESET_PASSWORD_TOKEN_EXPIRATION_IN_HOURS = 4
const PASSWORD_RESET_DELIVERY_ERROR_MESSAGE =
  "We couldn't send the password reset email. Please reach out to the developers for help."

export class PasswordResetDeliveryError extends Error {
  name = "PasswordResetDeliveryError"

  constructor(message: string = PASSWORD_RESET_DELIVERY_ERROR_MESSAGE) {
    super(message)
    this.message = message
  }
}

export async function requestPasswordReset(input: { email: string }) {
  const { email } = ForgotPassword.parse(input)
  const user = await db.user.findFirst({ where: { email } })

  const token = generateToken()
  const hashedToken = hash256(token)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + RESET_PASSWORD_TOKEN_EXPIRATION_IN_HOURS)

  if (user) {
    await db.token.deleteMany({ where: { type: "RESET_PASSWORD", userId: user.id } })
    const savedToken = await db.token.create({
      data: {
        user: { connect: { id: user.id } },
        type: "RESET_PASSWORD",
        expiresAt,
        hashedToken,
        sentTo: user.email,
      },
    })

    try {
      await forgotPasswordMailer({ to: user.email, token }).send()
    } catch (error) {
      await db.token.deleteMany({ where: { id: savedToken.id } })
      console.error("Failed to deliver password reset email", {
        error,
        userId: user.id,
      })
      throw new PasswordResetDeliveryError()
    }
  } else {
    await new Promise((resolve) => setTimeout(resolve, 750))
  }
}
