import Link from "next/link"
import DOMPurify from "isomorphic-dompurify"
import { RouteData } from "../../types"
import { isRouteData } from "../../utils/isRouteData"
import { resolveRouteHref } from "../../utils/resolveRouteHref"

interface NotificatioMessageProps {
  message: string
  routeData: RouteData | null
}

export default function NotificatioMessage({ message, routeData }: NotificatioMessageProps) {
  const cleanMessage = DOMPurify.sanitize(message)
  const closeDropdown = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  if (isRouteData(routeData)) {
    const href = resolveRouteHref(routeData)
    return (
      <Link href={href as any} className="hover:underline text-primary" onClick={closeDropdown}>
        <div dangerouslySetInnerHTML={{ __html: cleanMessage }}></div>
      </Link>
    )
  }

  return (
    <div
      className="hover:underline text-primary cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={closeDropdown}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          closeDropdown()
        }
      }}
      dangerouslySetInnerHTML={{ __html: cleanMessage }}
    ></div>
  )
}
