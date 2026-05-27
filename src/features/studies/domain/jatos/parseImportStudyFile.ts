/** Max .jzip size for POST /api/jatos/import */
export const JATOS_IMPORT_MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** Node/undici multipart entries are Blob-like; avoid `instanceof File` alone. */
export function isFormDataStudyUpload(value: FormDataEntryValue | null): value is File {
  if (value == null || typeof value === "string") return false
  return (
    typeof value.size === "number" &&
    typeof value.arrayBuffer === "function" &&
    "name" in value &&
    typeof (value as File).name === "string"
  )
}

export function parseImportStudyFileFromFormData(
  value: FormDataEntryValue | null
): { success: true; file: File } | { success: false; error: string } {
  if (value == null) {
    return { success: false, error: "Missing study file (.jzip)." }
  }
  if (typeof value === "string") {
    return { success: false, error: "Invalid study file field." }
  }
  if (!isFormDataStudyUpload(value)) {
    return { success: false, error: "Study file must be a .jzip upload." }
  }

  const file = value as File
  const name = file.name.trim()
  if (!name.toLowerCase().endsWith(".jzip")) {
    return {
      success: false,
      error: name
        ? `Expected a .jzip file (got "${name}").`
        : "Expected a .jzip file (filename missing).",
    }
  }
  if (file.size === 0) {
    return { success: false, error: "Study file is empty." }
  }
  if (file.size > JATOS_IMPORT_MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File is too large (${formatBytes(file.size)}). Maximum size is ${formatBytes(
        JATOS_IMPORT_MAX_FILE_SIZE
      )}.`,
    }
  }

  return { success: true, file }
}
