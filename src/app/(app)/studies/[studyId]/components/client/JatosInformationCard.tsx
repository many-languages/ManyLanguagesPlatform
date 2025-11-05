import Card from "@/src/app/components/Card"
import { EmptyState } from "@/src/app/components/EmptyState"
import type { JatosStudyProperties } from "@/src/types/jatos"

interface JatosInformationCardProps {
  properties: JatosStudyProperties | null
}

export default function JatosInformationCard({ properties }: JatosInformationCardProps) {
  if (!properties) {
    return (
      <Card title="JATOS Information">
        <EmptyState message="JATOS study properties could not be loaded." className="p-0 mt-2" />
      </Card>
    )
  }

  const components = properties.components || []
  const batches = properties.batches || []

  return (
    <Card title="JATOS Information">
      <p className="italic mb-2">
        This card contains live information about the study instance on the JATOS server.
      </p>

      <div className="space-y-1">
        <p>
          <span className="font-semibold">Study ID:</span> {properties.id}
        </p>
        <p>
          <span className="font-semibold">UUID:</span> {properties.uuid}
        </p>
        <p>
          <span className="font-semibold">Title:</span> {properties.title}
        </p>
      </div>

      {components.length > 0 ? (
        <>
          <h3 className="font-semibold mt-4 mb-1">Components:</h3>
          <ul className="list-disc ml-5 space-y-1">
            {components.map((c) => (
              <li key={c.id}>
                <span className="font-semibold">{c.title}</span> (<code>{c.htmlFilePath}</code>)
                {c.comments && <> — {c.comments}</>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState message="No components found for this study." className="p-0 mt-2" />
      )}

      {batches.length > 0 && (
        <>
          <h3 className="font-semibold mt-4 mb-1">Batches:</h3>
          <ul className="list-disc ml-5 space-y-1">
            {batches.map((b) => (
              <li key={b.id}>
                <span className="font-semibold">{b.title}</span>{" "}
                {b.active ? "(active)" : "(inactive)"}
                <br />
                <span className="font-semibold">Batch ID:</span> {b.id}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
