"use client"

import Card from "@/src/components/ui/Card"

interface Step3InstructionsProps {
  pilotCompleted: boolean | null
  jatosRunUrl: string | null
  hasJatosSetup: boolean
}

export default function Step3Instructions({
  pilotCompleted,
  jatosRunUrl,
  hasJatosSetup,
}: Step3InstructionsProps) {
  return (
    <Card
      title={pilotCompleted === true ? "Want to run more pilots?" : "How to pilot your study?"}
      collapsible
      bgColor="bg-base-100"
      className="mb-6"
    >
      {pilotCompleted === true ? (
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Run the pilot again by using the button below or this link:{" "}
            <a
              href={jatosRunUrl || ""}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary break-all"
            >
              {jatosRunUrl}
            </a>
          </li>
          <li>
            The pilot link can be used as many times as you like, even if your study allows only a
            single run per participant. Every completed pilot run is included when variables are
            extracted in the next step.
          </li>
          {hasJatosSetup && (
            <li>
              You do not need a new link to run more pilots. Use &quot;Generate Pilot Link&quot; and
              give the link a name if you want to tell groups of pilot runs apart in the Inspector,
              for example when you try different response behaviors.
            </li>
          )}
        </ol>
      ) : (
        <ol className="list-decimal list-inside space-y-2 text-sm">
          {jatosRunUrl ? (
            <li>
              Run study by clicking the button below or use this link:{" "}
              <a
                href={jatosRunUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary break-all"
              >
                {jatosRunUrl}
              </a>
            </li>
          ) : (
            <li>Click &quot;Generate Pilot Link&quot; below to create a pilot link</li>
          )}
          <li>Complete the entire survey as a pilot participant</li>
          <li>Click &quot;Check Pilot Status&quot; to verify completion</li>
        </ol>
      )}
    </Card>
  )
}
