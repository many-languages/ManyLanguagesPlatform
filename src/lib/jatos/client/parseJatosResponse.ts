import type { z } from "zod"
import { JatosTransportError } from "../errors"

export function parseJatosResponse<T>(operation: string, value: unknown, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new JatosTransportError(`Invalid shape in ${operation} response`, operation, parsed.error)
  }

  return parsed.data
}

export function parseJatosTextResponse<T>(
  operation: string,
  text: string,
  schema: z.ZodType<T>
): T {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (cause) {
    throw new JatosTransportError(`Invalid JSON in ${operation} response`, operation, cause)
  }

  return parseJatosResponse(operation, json, schema)
}
