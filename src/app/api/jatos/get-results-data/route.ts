import { getResultsData } from "@/src/lib/jatos/api/getResultsData"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const params = Object.fromEntries(url.searchParams.entries())

    const result = await getResultsData(params)

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": "inline; filename=jatos-results.zip",
      },
    })
  } catch (error: any) {
    console.error("Error fetching results data:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
