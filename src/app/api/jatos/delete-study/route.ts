import { deleteJatosStudy } from "@/src/app/jatos/utils/deleteStudy"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing required parameter: id" }, { status: 400 })
    }

    const result = await deleteJatosStudy(id)
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting JATOS study:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
