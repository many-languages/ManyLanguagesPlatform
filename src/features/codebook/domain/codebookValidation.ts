export type CodebookValidationStatus = "VALID" | "INVALID" | "NO_CODEBOOK" | "NO_EXTRACTION" | null

export type CodebookValidationSnapshot = {
  status?: CodebookValidationStatus
  missingKeys?: string[] | null
  extraKeys?: string[] | null
  updatedAt?: Date | string | null
} | null

export type CodebookInvalidKeysAlert = {
  kind: "invalidKeys"
  variant: "warning"
  missingKeys: string[]
  extraKeys: string[]
}

export type CodebookSoftWarningAlert = {
  kind: "softWarning"
  variant: "info"
}

export type CodebookValidationAlert = CodebookInvalidKeysAlert | CodebookSoftWarningAlert

function normalizeKeyList(keys: string[] | null | undefined): string[] {
  return Array.isArray(keys) ? keys : []
}

export function getCodebookValidationAlerts(params: {
  codebook: CodebookValidationSnapshot
  approvedExtractionId: number | null
  approvedExtractionApprovedAt: Date | string | null
}): CodebookValidationAlert[] {
  const { codebook, approvedExtractionId, approvedExtractionApprovedAt } = params
  const alerts: CodebookValidationAlert[] = []

  const missingKeys = normalizeKeyList(codebook?.missingKeys)
  const extraKeys = normalizeKeyList(codebook?.extraKeys)
  const validationStatus = codebook?.status ?? null

  if (validationStatus === "INVALID" && (missingKeys.length > 0 || extraKeys.length > 0)) {
    alerts.push({
      kind: "invalidKeys",
      variant: "warning",
      missingKeys,
      extraKeys,
    })
  }

  const codebookUpdatedAt = codebook?.updatedAt ? new Date(codebook.updatedAt) : null
  const approvedExtractionAt = approvedExtractionApprovedAt
    ? new Date(approvedExtractionApprovedAt)
    : null

  if (
    validationStatus === "VALID" &&
    approvedExtractionId !== null &&
    approvedExtractionAt !== null &&
    codebookUpdatedAt !== null &&
    codebookUpdatedAt < approvedExtractionAt
  ) {
    alerts.push({ kind: "softWarning", variant: "info" })
  }

  return alerts
}
