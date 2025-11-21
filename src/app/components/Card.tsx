import { ReactNode, useId } from "react"
import { ChevronDownIcon } from "@heroicons/react/24/outline"
import clsx from "clsx"

interface CardProps {
  title: string
  children?: ReactNode
  tooltipContent?: string
  actions?: ReactNode
  className?: string
  collapsible?: boolean
  bgColor?: string
  bodyClassName?: string
  actionsWrapperClassName?: string
  defaultOpen?: boolean
}

const Card = ({
  title,
  children,
  actions,
  className,
  collapsible = false,
  bgColor = "bg-base-200",
  bodyClassName,
  actionsWrapperClassName,
  defaultOpen = true,
}: CardProps) => {
  const collapseId = useId()
  const renderActions = () => {
    if (!actions) return null

    return (
      <div className={clsx("card-actions justify-end", actionsWrapperClassName)}>{actions}</div>
    )
  }

  if (collapsible) {
    return (
      <div
        className={clsx(
          "card base-content border mt-2 shadow-sm rounded-box border-base-300 card-no-outline",
          bgColor,
          className
        )}
      >
        <input
          type="checkbox"
          id={collapseId}
          className="peer sr-only focus:outline-none focus-visible:outline-none"
          defaultChecked={defaultOpen}
        />
        <label
          htmlFor={collapseId}
          className="flex items-center justify-between cursor-pointer px-6 py-4 text-xl font-medium gap-3 peer-checked:[&_svg]:rotate-180"
        >
          <span>{title}</span>
          <ChevronDownIcon className="h-5 w-5 transition-transform duration-200" />
        </label>
        <div className="border-base-300 px-6 py-4 flex flex-col min-h-0 gap-3 hidden peer-checked:flex">
          <div className={clsx("card-body flex flex-col gap-3 flex-1 min-h-0 p-0", bodyClassName)}>
            {children}
          </div>
          {renderActions()}
        </div>
      </div>
    )
  }

  // Regular card structure
  return (
    <div className={clsx("card base-content border-base-300 mt-2 shadow-sm", bgColor, className)}>
      <div className={clsx("card-body gap-3", bodyClassName)}>
        <div className="card-title">{title}</div>
        {children}
        {renderActions()}
      </div>
    </div>
  )
}

export default Card
