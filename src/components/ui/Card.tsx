"use client"

import { ChangeEvent, ReactNode, useId } from "react"
import { ChevronDownIcon } from "@heroicons/react/24/outline"
import clsx from "clsx"

interface CardProps {
  title: string | ReactNode
  children?: ReactNode
  tooltipContent?: string
  actions?: ReactNode
  className?: string
  collapsible?: boolean
  bgColor?: string
  /** Border color utility (e.g. border-base-300, border-info/20). */
  borderColorClass?: string
  bodyClassName?: string
  actionsWrapperClassName?: string
  /** Where to render `actions`. Collapsible cards honor this for header vs footer placement. */
  actionsPlacement?: "header" | "footer"
  /** Uncontrolled initial open state (collapsible only). Ignored when `onOpenChange` is set. */
  defaultOpen?: boolean
  /** Controlled open state (collapsible only). Use with `onOpenChange`. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Card = ({
  title,
  children,
  actions,
  className,
  collapsible = false,
  bgColor = "bg-base-200",
  borderColorClass = "border-base-300",
  bodyClassName,
  actionsWrapperClassName,
  actionsPlacement = "footer",
  defaultOpen = true,
  open,
  onOpenChange,
}: CardProps) => {
  const collapseId = useId()
  const isControlled = onOpenChange !== undefined

  const handleCollapseChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOpenChange?.(event.target.checked)
  }

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
          "card base-content border mt-2 shadow-sm rounded-box card-no-outline",
          borderColorClass,
          bgColor,
          className
        )}
      >
        <input
          type="checkbox"
          id={collapseId}
          className="peer sr-only focus:outline-none focus-visible:outline-none"
          {...(isControlled
            ? { checked: open ?? false, onChange: handleCollapseChange }
            : { defaultChecked: defaultOpen })}
        />
        <div className="flex items-center gap-3 px-6 py-4 peer-checked:[&_.card-collapse-chevron]:rotate-180">
          <label htmlFor={collapseId} className="min-w-0 flex-1 cursor-pointer text-xl font-medium">
            {typeof title === "string" ? <span>{title}</span> : title}
          </label>
          <div className="flex shrink-0 items-center gap-6">
            {actions && actionsPlacement === "header" ? (
              <div
                className={actionsWrapperClassName}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {actions}
              </div>
            ) : null}
            <label htmlFor={collapseId} className="cursor-pointer">
              <ChevronDownIcon className="card-collapse-chevron h-5 w-5 transition-transform duration-200" />
            </label>
          </div>
        </div>
        <div className="border-base-300 px-6 pb-4 flex flex-col min-h-0 gap-3 hidden peer-checked:flex">
          <div className={clsx("card-body flex flex-col gap-3 flex-1 min-h-0 p-0", bodyClassName)}>
            {children}
          </div>
          {actionsPlacement === "footer" && renderActions()}
        </div>
      </div>
    )
  }

  return (
    <div
      className={clsx(
        "card base-content border mt-2 shadow-sm rounded-box",
        borderColorClass,
        bgColor,
        className
      )}
    >
      <div className={clsx("card-body gap-3", bodyClassName)}>
        {actions && actionsPlacement === "header" ? (
          <div className="flex items-start justify-between gap-3">
            <div className="text-xl font-medium min-w-0 flex-1">
              {typeof title === "string" ? <span>{title}</span> : title}
            </div>
            <div className={clsx("shrink-0", actionsWrapperClassName)}>{actions}</div>
          </div>
        ) : (
          <div className="text-xl font-medium">{title}</div>
        )}
        {children}
        {actionsPlacement === "footer" && renderActions()}
      </div>
    </div>
  )
}

export default Card
