"use client"

import { useEffect, useMemo, useTransition } from "react"
import type React from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import clsx from "clsx"

interface NavigationButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  href: Route | string
  /**
   * Message shown while navigation is pending.
   * Defaults to the non-loading children.
   */
  pendingText?: React.ReactNode
  /**
   * Set to false to opt out of automatic route prefetching.
   */
  prefetch?: boolean
}

export function NavigationButton({
  href,
  pendingText,
  prefetch = true,
  children,
  className,
  disabled,
  ...props
}: NavigationButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const targetHref = useMemo(() => href as Route, [href])

  useEffect(() => {
    if (!prefetch) return
    router.prefetch?.(targetHref)
  }, [prefetch, router, targetHref])

  const handleClick = () => {
    if (isPending || disabled) return

    startTransition(() => {
      router.push(targetHref)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx("btn", className, {
        "pointer-events-none cursor-progress": isPending,
      })}
      disabled={disabled}
      aria-busy={isPending}
      aria-disabled={isPending || disabled}
      aria-live="polite"
      {...props}
    >
      {isPending ? (
        <>
          <span>{pendingText ?? children}</span>
          <span className="loading loading-dots loading-xs ml-1"></span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
