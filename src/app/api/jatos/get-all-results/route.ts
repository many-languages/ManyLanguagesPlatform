import { NextRequest, NextResponse } from "next/server"

const JATOS_BASE = process.env.JATOS_BASE
const JATOS_TOKEN = process.env.JATOS_TOKEN

export async function POST(req: NextRequest) {
  try {
    // Try to parse JSON body (if present)
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    // Collect query parameters (support multiple values per key)
    const url = new URL(req.url)
    const params = Object.fromEntries(url.searchParams.entries())

    // Merge JSON body and query parameters for flexibility
    const mergedPayload = {
      ...body,
      ...Object.entries(params).reduce((acc, [key, value]) => {
        if (acc[key]) {
          acc[key] = Array.isArray(acc[key]) ? [...acc[key], value] : [acc[key], value]
        } else {
          acc[key] = value
        }
        return acc
      }, {} as Record<string, any>),
    }

    const jatosUrl = `${JATOS_BASE}/jatos/api/v1/results`

    const response = await fetch(jatosUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JATOS_TOKEN}`,
      },
      body: JSON.stringify(mergedPayload),
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: `JATOS API error: ${response.status}`, details: text },
        { status: response.status }
      )
    }

    // Stream ZIP file back to client
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="jatos-results.zip"`,
      },
    })
  } catch (error: any) {
    console.error("Error fetching JATOS results:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
