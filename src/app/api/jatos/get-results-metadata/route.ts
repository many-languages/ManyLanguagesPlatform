import { getResultsMetadata } from "@/src/app/jatos/utils/getResultsMetadata"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await getResultsMetadata(body)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error fetching metadata:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
