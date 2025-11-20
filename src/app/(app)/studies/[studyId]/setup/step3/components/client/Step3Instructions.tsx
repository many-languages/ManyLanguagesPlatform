"use client"

import Card from "@/src/app/components/Card"

interface Step3InstructionsProps {
  pilotCompleted: boolean | null
  jatosRunUrl: string | null
  hasJatosSetup: boolean // study.jatosStudyId && study.jatosBatchId
}

export default function Step3Instructions({
  pilotCompleted,
  jatosRunUrl,
  hasJatosSetup,
}: Step3InstructionsProps) {
  return (
    <Card
      title={pilotCompleted === true ? "Want to run more tests?" : "How to test your study?"}
      collapsible
      bgColor="bg-base-300"
      className="mb-6"
    >
      {pilotCompleted === true ? (
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Run a study multiple times by using the button below or this link:{" "}
            <a
              href={jatosRunUrl || ""}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary break-all"
            >
              {jatosRunUrl}
            </a>
          </li>
          {hasJatosSetup && (
            <li>Generate a new test link using the "Generate Test Link" button below</li>
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
            <li>Click "Generate Test Link" below to create a test link</li>
          )}
          <li>Complete the entire survey as a test participant</li>
          <li>Click "Check Pilot Status" to verify completion</li>
        </ol>
      )}
    </Card>
  )
}
