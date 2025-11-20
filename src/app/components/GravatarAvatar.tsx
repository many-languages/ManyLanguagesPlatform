"use client"

import { useEffect, useState } from "react"
import Gravatar from "react-gravatar"

interface GravatarAvatarProps {
  email: string
  size?: number
}

export default function GravatarAvatar({ email, size = 40 }: GravatarAvatarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return placeholder during SSR to prevent hydration mismatch
    return <div className="w-10 h-10 rounded-full bg-base-300" />
  }

  return <Gravatar email={email} size={size} style={{ borderRadius: "50%" }} default="retro" />
}
