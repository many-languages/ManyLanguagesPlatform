import nodemailer from "nodemailer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import { ServerClient } from "postmark"

type SendEmailPayload = {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

const emailEnabled = process.env.EMAIL_ENABLED === "true"
const defaultFrom = process.env.EMAIL_FROM_ADDRESS

let smtpTransport: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null
let postmarkClient: ServerClient | null = null

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport

  const host = process.env.SMTP_HOST || "mailhog"
  const port = Number(process.env.SMTP_PORT || 1025)
  const secure = process.env.SMTP_SECURE === "true"
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD

  smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  })

  return smtpTransport
}

function getPostmarkClient() {
  if (postmarkClient) return postmarkClient

  const token = process.env.POSTMARK_SERVER_TOKEN
  if (!token) {
    throw new Error("POSTMARK_SERVER_TOKEN must be set when EMAIL_PROVIDER=postmark")
  }

  postmarkClient = new ServerClient(token)
  return postmarkClient
}

async function sendWithSmtp(payload: Required<SendEmailPayload>) {
  const transport = getSmtpTransport()

  await transport.sendMail({
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  })
}

async function sendWithPostmark(payload: Required<SendEmailPayload>) {
  const client = getPostmarkClient()
  await client.sendEmail({
    From: payload.from,
    To: payload.to,
    Subject: payload.subject,
    HtmlBody: payload.html,
    TextBody: payload.text || "",
    MessageStream: process.env.POSTMARK_MESSAGE_STREAM || "outbound",
  })
}

export async function sendEmail(payload: SendEmailPayload) {
  if (!emailEnabled) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail] EMAIL_ENABLED=false, skipped mail to ${payload.to}`)
    }
    return { skipped: true as const }
  }

  const from = payload.from || defaultFrom
  if (!from) {
    throw new Error("EMAIL_FROM_ADDRESS must be configured when EMAIL_ENABLED=true")
  }

  const normalizedPayload: Required<SendEmailPayload> = {
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text ?? "",
    from,
  }

  const provider = (process.env.EMAIL_PROVIDER || "mailhog").toLowerCase()

  switch (provider) {
    case "postmark":
      await sendWithPostmark(normalizedPayload)
      break
    case "mailhog":
    case "smtp":
      await sendWithSmtp(normalizedPayload)
      break
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER "${provider}"`)
  }

  return { sent: true as const }
}
