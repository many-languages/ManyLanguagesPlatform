import { afterEach, describe, expect, it } from "vitest"
import { generateJatosRunUrl, jatosRunUrlSchema } from "./jatosRunUrlSchema"

describe("jatosRunUrlSchema", () => {
  const originalBase = process.env.NEXT_PUBLIC_JATOS_BASE

  afterEach(() => {
    if (originalBase === undefined) {
      delete process.env.NEXT_PUBLIC_JATOS_BASE
    } else {
      process.env.NEXT_PUBLIC_JATOS_BASE = originalBase
    }
  })

  it("accepts URLs produced by generateJatosRunUrl", () => {
    process.env.NEXT_PUBLIC_JATOS_BASE = "http://jatos.test"
    const url = generateJatosRunUrl("abc123")
    expect(jatosRunUrlSchema.safeParse(url).success).toBe(true)
  })

  it("accepts base URLs with a trailing slash", () => {
    process.env.NEXT_PUBLIC_JATOS_BASE = "http://jatos.test/"
    const url = generateJatosRunUrl("abc123")
    expect(jatosRunUrlSchema.safeParse(url).success).toBe(true)
  })

  it("rejects URLs from another host", () => {
    process.env.NEXT_PUBLIC_JATOS_BASE = "http://jatos.test"
    const result = jatosRunUrlSchema.safeParse("http://evil.test/publix/abc123")
    expect(result.success).toBe(false)
  })

  it("rejects non-publix JATOS paths", () => {
    process.env.NEXT_PUBLIC_JATOS_BASE = "http://jatos.test"
    const result = jatosRunUrlSchema.safeParse("http://jatos.test/admin/studies")
    expect(result.success).toBe(false)
  })
})
