"use client"

import { useEffect } from "react"
import toast from "react-hot-toast"

export default function Error({ error }: { error: Error }) {
  useEffect(() => {
    console.error(error)
    toast.error("Could not load study")
  }, [error])

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-center mt-8">Something went wrong</h1>
    </main>
  )
}
