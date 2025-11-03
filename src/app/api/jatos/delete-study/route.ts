/**
 * JATOS API Route: Delete Study
 *
 * Deletes a study from the JATOS server.
 * This route wraps the server-side lib function for client-side usage.
 *
 * @route DELETE /api/jatos/delete-study
 * @queryParams id (JATOS study UUID)
 * @returns Deletion result
 */
import { deleteJatosStudy } from "@/src/lib/jatos/api/deleteStudy"
import { NextRequest, NextResponse } from "next/server"
import type { JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(req: NextRequest): Promise<NextResponse<unknown | JatosApiError>> {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")

    if (!id) {
      const errorResponse: JatosApiError = { error: "Missing required parameter: id" }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const result = await deleteJatosStudy(id)
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting JATOS study:", error)
    const errorResponse: JatosApiError = {
      error: error.message || "Failed to delete study",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
