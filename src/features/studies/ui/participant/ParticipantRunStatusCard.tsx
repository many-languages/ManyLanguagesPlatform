import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid"

type ParticipantRunStatusTone = "success" | "warning"

// Full class names so Tailwind can see them
const TONE_STYLES: Record<ParticipantRunStatusTone, { box: string; icon: string; title: string }> =
  {
    success: {
      box: "bg-success/10 border-success/20",
      icon: "text-success",
      title: "text-success",
    },
    warning: {
      box: "bg-warning/10 border-warning/20",
      icon: "text-warning",
      title: "text-warning",
    },
  }

interface ParticipantRunStatusCardProps {
  tone: ParticipantRunStatusTone
  title: string
  message: string
}

/** Centered status box shown on the participant study page once a run has ended. */
export default function ParticipantRunStatusCard({
  tone,
  title,
  message,
}: ParticipantRunStatusCardProps) {
  const styles = TONE_STYLES[tone]
  const Icon = tone === "success" ? CheckCircleIcon : ExclamationTriangleIcon

  return (
    <div
      className={`flex flex-col items-center justify-center mt-4 p-6 rounded-lg border ${styles.box}`}
    >
      <Icon className={`h-12 w-12 mb-3 ${styles.icon}`} />
      <h3 className={`text-lg font-semibold mb-1 ${styles.title}`}>{title}</h3>
      <p className="text-sm text-base-content/70 text-center max-w-md">{message}</p>
    </div>
  )
}
