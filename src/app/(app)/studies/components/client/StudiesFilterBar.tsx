"use client"

import { Route } from "next"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useTransition } from "react"

function FilterToggle({ label, paramKey }: { label: string; paramKey: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const checked = sp.get(paramKey) === "1"

  const setChecked = (value: boolean) => {
    const next = new URLSearchParams(sp)
    if (value) next.set(paramKey, "1")
    else next.delete(paramKey)
    next.delete("page")

    const qs = next.toString()
    const href = (qs ? `${pathname}?${qs}` : pathname) as Route

    // React 19 / Next.js 15 best practice:
    // Wrap router navigation in startTransition to keep the UI responsive
    // and provide a pending state. Add { scroll: false } to maintain scroll position.
    startTransition(() => {
      router.replace(href, { scroll: false })
    })
  }

  return (
    <label className={`label cursor-pointer gap-2 ${isPending ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        className="toggle toggle-sm"
        checked={checked}
        disabled={isPending}
        onChange={(e) => setChecked(e.target.checked)}
      />
      <span className="label-text">{label}</span>
    </label>
  )
}

function FilterBarContent() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <FilterToggle label="Active only" paramKey="active" />
      <FilterToggle label="Setup complete only" paramKey="setupComplete" />
      <FilterToggle label="Include archived" paramKey="showArchived" />
    </div>
  )
}

export default function StudiesFilterBar() {
  // Wrapping useSearchParams in Suspense is a strict requirement/best practice
  // in Next.js App Router to prevent de-opting the entire route to client rendering.
  return (
    <Suspense
      fallback={
        <div className="flex flex-wrap items-center gap-4 opacity-50">
          <div className="w-24 h-6 bg-base-300 rounded animate-pulse" />
          <div className="w-24 h-6 bg-base-300 rounded animate-pulse" />
          <div className="w-24 h-6 bg-base-300 rounded animate-pulse" />
        </div>
      }
    >
      <FilterBarContent />
    </Suspense>
  )
}
