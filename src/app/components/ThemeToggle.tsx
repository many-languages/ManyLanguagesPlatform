"use client"

import { SunIcon, MoonIcon } from "@heroicons/react/24/outline"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use resolvedTheme which is the actual theme value after hydration
  const currentTheme = resolvedTheme || theme || "light"

  if (!mounted) {
    // Return placeholder matching the blocking script's default
    return (
      <button className="btn btn-ghost btn-circle" aria-label="Toggle theme">
        <MoonIcon className="h-5 w-5" />
      </button>
    )
  }

  const toggleTheme = () => {
    setTheme(currentTheme === "light" ? "dark" : "light")
  }

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost btn-circle"
      aria-label={`Switch to ${currentTheme === "light" ? "dark" : "light"} mode`}
    >
      {currentTheme === "light" ? (
        <MoonIcon className="h-5 w-5" />
      ) : (
        <SunIcon className="h-5 w-5" />
      )}
    </button>
  )
}
