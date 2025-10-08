import { getResultsMetadata } from "@/src/app/jatos/utils/getResultsMetadata"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const params = Object.fromEntries(url.searchParams.entries())

    const result = await getResultsMetadata(params)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error fetching metadata:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
