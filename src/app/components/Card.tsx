import { ReactNode } from "react"
import clsx from "clsx"

interface CardProps {
  title: string
  children?: ReactNode
  tooltipContent?: string
  actions?: ReactNode
  className?: string
  collapsible?: boolean
  bgColor?: string
}

const Card = ({
  title,
  children,
  actions,
  className,
  collapsible = false,
  bgColor = "bg-base-200",
}: CardProps) => {
  if (collapsible) {
    // Collapsible card structure
    return (
      <div className={clsx("collapse collapse-arrow mt-2 shadow-sm", bgColor, className)}>
        <input type="checkbox" className="peer" defaultChecked />
        <div className="collapse-title text-xl font-medium cursor-pointer">{title}</div>
        <div className="collapse-content">
          <div className="card-body gap-3 pt-0">
            {children}
            {actions && <div className="card-actions justify-end">{actions}</div>}
          </div>
        </div>
      </div>
    )
  }

  // Regular card structure
  return (
    <div className={clsx("card base-content border-base-300 mt-2 shadow-sm", bgColor, className)}>
      <div className="card-body gap-3">
        <div className="card-title">{title}</div>
        {children}
        {actions && <div className="card-actions justify-end">{actions}</div>}
      </div>
    </div>
  )
}

export default Card
