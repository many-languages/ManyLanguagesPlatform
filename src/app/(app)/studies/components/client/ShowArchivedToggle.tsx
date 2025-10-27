"use client"

import { Route } from "next"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export default function ShowArchivedToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const checked = sp.get("showArchived") === "1"

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = new URLSearchParams(sp)
    if (e.target.checked) next.set("showArchived", "1")
    else next.delete("showArchived")
    // preserve page=0 when toggling
    next.delete("page")

    const qs = next.toString()
    const href = (qs ? `${pathname}?${qs}` : pathname) as Route
    router.replace(href)
  }

  return (
    <label className="label cursor-pointer gap-2 mb-2">
      <span className="label-text">Show archived</span>
      <input type="checkbox" className="toggle" checked={checked} onChange={onChange} />
    </label>
  )
}
