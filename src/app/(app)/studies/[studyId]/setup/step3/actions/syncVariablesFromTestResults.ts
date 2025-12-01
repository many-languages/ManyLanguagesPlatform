"use server"

import { getAllTestResultsRsc } from "@/src/app/(app)/studies/[studyId]/utils/getAllTestResults"
import { syncStudyVariablesRsc } from "@/src/app/(app)/studies/[studyId]/variables/mutations/syncStudyVariables"
import { extractAvailableVariables } from "@/src/app/(app)/studies/[studyId]/variables/utils/extractVariable"

/**
 * Server Action to sync variables from test results when step 3 is completed.
 * Can be called from client components or server components.
 */
export async function syncVariablesFromTestResultsAction(
  studyId: number
): Promise<{ success: boolean; variableCount: number; error?: string }> {
  try {
    // Get all test results
    const testResults = await getAllTestResultsRsc(studyId)

    if (testResults.length === 0) {
      return {
        success: false,
        variableCount: 0,
        error: "No test results found. Please complete a test run first.",
      }
    }

    // Use the latest test result (first one since sorted by id descending)
    const latestTestResult = testResults[0]

    // Extract variables from the test result (with examples for syncing)
    const extractedVariables = extractAvailableVariables(latestTestResult, { includeExample: true })

    if (extractedVariables.length === 0) {
      return {
        success: false,
        variableCount: 0,
        error: "No variables found in test results.",
      }
    }

    // Sync variables to database
    await syncStudyVariablesRsc({
      studyId,
      variables: extractedVariables.map((v) => ({
        name: v.name,
        label: v.name,
        type: v.type, // Already "string" | "number" | "boolean"
        example: typeof v.example === "string" ? v.example : JSON.stringify(v.example),
      })),
    })

    return {
      success: true,
      variableCount: extractedVariables.length,
    }
  } catch (error) {
    console.error("Failed to sync variables from test results:", error)
    return {
      success: false,
      variableCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
