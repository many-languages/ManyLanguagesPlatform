"use client"

import { ReactNode } from "react"
import clsx from "clsx"
import { v4 as uuidv4 } from "uuid"
import dynamic from "next/dynamic"

const Tooltip = dynamic(() => import("react-tooltip").then((mod) => mod.Tooltip))

interface CollapseCardProps {
  title: ReactNode
  children?: ReactNode
  tooltipContent?: string
  actions?: ReactNode
  className?: string
}

const CollapseCard = ({
  title,
  children,
  tooltipContent,
  actions,
  className,
}: CollapseCardProps) => {
  // Generate a unique ID if tooltipContent is provided
  const tooltipId = tooltipContent ? uuidv4() : undefined

  return (
    <div
      className={clsx(
        "collapse collapse-arrow bg-base-300 overflow-hidden transition-all duration-300 ease-in-out",
        className
      )}
    >
      <input type="checkbox" data-tooltip-id={tooltipId} className="peer" />
      <div
        className="collapse-title text-xl font-medium bg-primary 
      text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content"
      >
        <div className="card-title">{title}</div>
        {tooltipContent && (
          <Tooltip id={tooltipId} place="top">
            {tooltipContent}
          </Tooltip>
        )}
      </div>

      <div className="collapse-content bg-primary text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content">
        {children}
        {actions && <div className="card-actions justify-end">{actions}</div>}
      </div>
    </div>
  )
}

export default CollapseCard
