import { NextResponse } from "next/server"
import { getStudyProperties } from "@/src/app/jatos/utils/getStudyProperties"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studyId = searchParams.get("studyId")

    if (!studyId) {
      return NextResponse.json({ error: "Missing studyId" }, { status: 400 })
    }

    const properties = await getStudyProperties(studyId)
    return NextResponse.json(properties) // ✅ no `.data` wrapper
  } catch (error: any) {
    console.error("Error fetching JATOS properties:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
