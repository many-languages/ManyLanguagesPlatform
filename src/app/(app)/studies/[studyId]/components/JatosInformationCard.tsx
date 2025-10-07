"use client"

import { useEffect, useState } from "react"
import Card from "src/app/components/Card"
import toast from "react-hot-toast"

interface JatosInformationCardProps {
  jatosStudyUUID: string
}

interface JatosStudyProperties {
  id: number
  title: string
  uuid: string
  components?: {
    id: number
    uuid: string
    title: string
    htmlFilePath: string
    position: number
    comments?: string
  }[]
  batches?: {
    id: number
    title: string
    active: boolean
  }[]
}

export default function JatosInformationCard({ jatosStudyUUID }: JatosInformationCardProps) {
  const [jatosInfo, setJatosInfo] = useState<JatosStudyProperties | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchJatosProperties = async () => {
      try {
        const res = await fetch(`/api/jatos/get-study-properties?studyId=${jatosStudyUUID}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed to fetch JATOS properties")
        setJatosInfo(json.data)
      } catch (err: any) {
        console.error("Error fetching JATOS study properties:", err)
        toast.error("Could not load JATOS study info")
      } finally {
        setLoading(false)
      }
    }

    fetchJatosProperties()
  }, [jatosStudyUUID])

  if (loading) {
    return <Card title="JATOS Information">Loading...</Card>
  }

  if (!jatosInfo) {
    return <Card title="JATOS Information">No JATOS information available.</Card>
  }

  const components = jatosInfo.components || []
  const batches = jatosInfo.batches || []
  // const jatosBatchId = batches.length > 0 ? batches[0].id : null
  // console.log(jatosBatchId)
  return (
    <Card title="JATOS Information">
      <p className="italic">
        This card contains live information about the study instance on the JATOS server.
      </p>
      <p>
        <span className="font-semibold">Study ID:</span> {jatosInfo.id}
      </p>
      <p>
        <span className="font-semibold">UUID:</span> {jatosInfo.uuid}
      </p>
      <p>
        <span className="font-semibold">Title:</span> {jatosInfo.title}
      </p>

      {components.length > 0 ? (
        <>
          <h3 className="font-semibold mt-4 mb-1">Components:</h3>
          <ul className="list-disc ml-5">
            {components.map((c) => (
              <li key={c.id}>
                <span className="font-semibold">{c.title}</span> (<code>{c.htmlFilePath}</code>)
                {c.comments && <> — {c.comments}</>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-warning">No components found for this study.</p>
      )}

      {batches.length > 0 && (
        <>
          <h3 className="font-semibold mt-4 mb-1">Batches:</h3>
          <ul className="list-disc ml-5">
            {batches.map((b) => (
              <li key={b.id}>
                <span className="font-semibold">{b.title}</span>{" "}
                {b.active ? "(active)" : "(inactive)"}
                <br />
                <span className="font-semibold">Batch id:</span>
                {b.id}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
