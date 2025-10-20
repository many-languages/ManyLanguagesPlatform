export default async function uploadJatosFile(file: File) {
  const fd = new FormData()
  fd.append("studyFile", file, file.name)

  const res = await fetch("/api/jatos/import", {
    method: "POST",
    body: fd,
  })

  const data = await res.json()

  // Handle existing study (409)
  if (res.status === 409) {
    return {
      error: data.error,
      studyExists: true,
      jatosStudyId: data.jatosStudyId,
      jatosStudyUUID: data.jatosStudyUUID,
      jatosFileName: data.jatosFileName,
      currentStudyTitle: data.currentStudyTitle,
      uploadedStudyTitle: data.uploadedStudyTitle,
    }
  }

  if (!res.ok) {
    throw new Error(data?.error || `JATOS import failed with status ${res.status}`)
  }

  return {
    jatosStudyId: data.jatosStudyId,
    jatosStudyUUID: data.jatosStudyUUID,
    jatosFileName: data.jatosFileName,
  }
}
