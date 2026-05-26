/**
 * POST /api/jatos/import — HTTP error JSON and client-side error type.
 *
 * - **ingress** — FormData / request validation before any JATOS call
 * - **auth** — missing session
 * - **jatos** — failure inside import (JATOS HTTP, transport, mapped by mapJatosErrorToUserMessage)
 * - **conflict** — DB unique constraint (e.g. duplicate jatosStudyUUID)
 */

import { NextResponse } from "next/server"
import { isJatosApiError, mapJatosErrorToUserMessage } from "../errors"

export type JatosImportRouteErrorKind = "ingress" | "auth" | "jatos" | "conflict"

export interface JatosImportRouteErrorJson {
  error: string
  kind: JatosImportRouteErrorKind
  jatosStudyUUID?: string
}

export class JatosImportRouteError extends Error {
  readonly kind: JatosImportRouteErrorKind
  readonly status: number

  constructor(message: string, kind: JatosImportRouteErrorKind, status: number) {
    super(message)
    this.name = "JatosImportRouteError"
    this.kind = kind
    this.status = status
  }
}

export function isJatosImportRouteError(value: unknown): value is JatosImportRouteError {
  return value instanceof JatosImportRouteError
}

const KINDS: JatosImportRouteErrorKind[] = ["ingress", "auth", "jatos", "conflict"]

export function parseJatosImportRouteErrorJson(
  body: unknown,
  status: number
): JatosImportRouteError {
  if (body && typeof body === "object" && "error" in body) {
    const record = body as Record<string, unknown>
    const message = typeof record.error === "string" ? record.error : "Import failed."
    const kind = KINDS.includes(record.kind as JatosImportRouteErrorKind)
      ? (record.kind as JatosImportRouteErrorKind)
      : status === 401
      ? "auth"
      : "jatos"
    return new JatosImportRouteError(message, kind, status)
  }
  return new JatosImportRouteError(`Import failed (${status}).`, "jatos", status)
}

/** User-facing form message: ingress/auth pass through; JATOS-mapped errors get a short prefix. */
export function messageForJatosImportFailure(error: unknown): string {
  if (isJatosImportRouteError(error)) {
    if (error.kind === "ingress" || error.kind === "auth") {
      return error.message
    }
    if (error.kind === "conflict") {
      return error.message
    }
    return `Import failed: ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Import failed. Please try again."
}

export function jatosImportIngressErrorResponse(message: string, status = 400) {
  return NextResponse.json(
    { error: message, kind: "ingress" } satisfies JatosImportRouteErrorJson,
    {
      status,
    }
  )
}

export function jatosImportAuthErrorResponse() {
  return NextResponse.json(
    { error: "Not authenticated", kind: "auth" } satisfies JatosImportRouteErrorJson,
    { status: 401 }
  )
}

export function jatosImportConflictErrorResponse(message: string, jatosStudyUUID?: string) {
  const body: JatosImportRouteErrorJson = {
    error: message,
    kind: "conflict",
    ...(jatosStudyUUID ? { jatosStudyUUID } : {}),
  }
  return NextResponse.json(body, { status: 409 })
}

export function jatosImportJatosFailureResponse(error: unknown) {
  const safeError = mapJatosErrorToUserMessage(error)
  const status =
    isJatosApiError(error) && error.status >= 400 && error.status <= 599 ? error.status : 500

  return NextResponse.json(
    { error: safeError, kind: "jatos" } satisfies JatosImportRouteErrorJson,
    {
      status,
    }
  )
}
