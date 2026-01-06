"use server"

import { getAllTestResultsRsc } from "@/src/app/(app)/studies/[studyId]/utils/getAllTestResults"
import { syncStudyVariablesRsc } from "@/src/app/(app)/studies/[studyId]/variables/mutations/syncStudyVariables"
import { extractVariables } from "@/src/app/(app)/studies/[studyId]/variables/utils/extractVariable"

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

    // Extract variables from the test result
    const extractionResult = extractVariables(latestTestResult)

    if (extractionResult.variables.length === 0) {
      return {
        success: false,
        variableCount: 0,
        error: "No variables found in test results.",
      }
    }

    // Sync variables to database (only primitives for now, arrays/objects can be added later)
    const primitiveVariables = extractionResult.variables.filter(
      (v) => v.type === "string" || v.type === "number" || v.type === "boolean"
    )

    await syncStudyVariablesRsc({
      studyId,
      variables: primitiveVariables.map((v) => ({
        name: v.variableName,
        label: v.variableName,
        type: v.type as "string" | "number" | "boolean",
        example:
          typeof v.exampleValue === "string" ? v.exampleValue : JSON.stringify(v.allValues[0]),
      })),
    })

    return {
      success: true,
      variableCount: primitiveVariables.length,
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
