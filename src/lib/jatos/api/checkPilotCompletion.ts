export async function checkPilotCompletion(jatosStudyUUID: string): Promise<boolean> {
  try {
    const res = await fetch("/api/jatos/get-results-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studyUuids: [jatosStudyUUID] }),
    })

    if (!res.ok) return false

    const metadata = await res.json()

    // Add debugging
    console.log("🔍 Pilot check metadata:", JSON.stringify(metadata, null, 2))
    console.log("🔍 Looking for studyUUID:", jatosStudyUUID)

    const hasCompletedPilot = metadata.data?.some((study: any) => {
      console.log("🔍 Checking study:", study.studyUuid, "results:", study.studyResults?.length)

      return study.studyResults?.some((result: any) => {
        console.log("🔍 Checking result:", {
          studyState: result.studyState,
          workerType: result.workerType,
          comment: result.comment,
        })

        const isFinished = result.studyState === "FINISHED"
        const isPersonalWorker =
          result.workerType === "PersonalMultiple" || result.workerType === "PersonalSingle"

        console.log("🔍 Result check:", { isFinished, isPersonalWorker })

        return isFinished && isPersonalWorker
      })
    })

    console.log("🔍 Final result:", hasCompletedPilot)
    return hasCompletedPilot || false
  } catch (error) {
    console.error("Error checking pilot completion:", error)
    return false
  }
}
