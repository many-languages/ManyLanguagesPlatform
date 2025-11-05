import { ReactNode } from "react"
import clsx from "clsx"

interface CardProps {
  title: string
  children?: ReactNode
  tooltipContent?: string
  actions?: ReactNode
  className?: string
  collapsible?: boolean
}

const Card = ({ title, children, actions, className, collapsible = false }: CardProps) => {
  if (collapsible) {
    // Collapsible card structure
    return (
      <div className={clsx("collapse collapse-arrow bg-base-200 mt-2 shadow-sm", className)}>
        <input type="checkbox" className="peer" defaultChecked />
        <div className="collapse-title text-xl font-medium cursor-pointer">{title}</div>
        <div className="collapse-content">
          <div className="card-body">
            {children}
            {actions && <div className="card-actions justify-end">{actions}</div>}
          </div>
        </div>
      </div>
    )
  }

  // Regular card structure
  return (
    <div
      className={clsx("card bg-base-200 base-content border-base-300 mt-2 shadow-sm", className)}
    >
      <div className="card-body">
        <div className="card-title">{title}</div>
        {children}
        {actions && <div className="card-actions justify-end">{actions}</div>}
      </div>
    </div>
  )
}

export default Card
