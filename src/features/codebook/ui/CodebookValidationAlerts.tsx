import { Alert } from "@/src/components/ui/Alert"
import type { CodebookValidationAlert } from "../domain/codebookValidation"

interface CodebookValidationAlertsProps {
  alerts: CodebookValidationAlert[]
}

export default function CodebookValidationAlerts({ alerts }: CodebookValidationAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <>
      {alerts.map((alert) => {
        if (alert.kind === "invalidKeys") {
          return (
            <Alert key="invalidKeys" variant={alert.variant}>
              <div className="space-y-2">
                <p>
                  This codebook no longer matches the latest extraction. Please review and save the
                  codebook again to complete Step 5.
                </p>
                {alert.missingKeys.length > 0 && (
                  <div>
                    <div className="font-semibold">Missing keys</div>
                    <div className="text-sm">{alert.missingKeys.join(", ")}</div>
                  </div>
                )}
                {alert.extraKeys.length > 0 && (
                  <div>
                    <div className="font-semibold">Additional keys</div>
                    <div className="text-sm">{alert.extraKeys.join(", ")}</div>
                  </div>
                )}
              </div>
            </Alert>
          )
        }

        return (
          <Alert key="softWarning" variant={alert.variant}>
            A new extraction was approved for this study version. The variables match your existing
            codebook, but we recommend reviewing it again.
          </Alert>
        )
      })}
    </>
  )
}
