import Link from "next/link"
import DOMPurify from "dompurify"
import { RouteData } from "../../types"
import { isRouteData } from "../../utils/isRouteData"
import { resolveRouteHref } from "../../utils/resolveRouteHref"

interface NotificatioMessageProps {
  message: string
  routeData: RouteData | null
}

export default function NotificatioMessage({ message, routeData }: NotificatioMessageProps) {
  const cleanMessage = DOMPurify.sanitize(message)

  if (isRouteData(routeData)) {
    const href = resolveRouteHref(routeData)
    return (
      <Link href={href as any} className="hover:underline text-primary">
        <div dangerouslySetInnerHTML={{ __html: cleanMessage }}></div>
      </Link>
    )
  }

  return <div dangerouslySetInnerHTML={{ __html: cleanMessage }}></div>
}
