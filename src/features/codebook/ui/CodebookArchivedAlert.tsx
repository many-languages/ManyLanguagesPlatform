import { Alert } from "@/src/components/ui/Alert"

interface CodebookArchivedAlertProps {
  message: string
}

export default function CodebookArchivedAlert({ message }: CodebookArchivedAlertProps) {
  return (
    <Alert variant="info" className="mb-4">
      <p>{message}</p>
    </Alert>
  )
}
