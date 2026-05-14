"use client"

import { useEffect } from "react"
import { Inter } from "next/font/google"
import "./global.css"
import { Alert } from "@/src/components/ui/Alert"

const inter = Inter({ subsets: ["latin"] })

/**
 * Catches errors in the root layout (and unhandled errors that bubble past `error.tsx`).
 * Next.js replaces the root layout when this boundary is active — this file must define
 * `<html>` and `<body>` and import global styles. See https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GlobalError]", error)
  }, [error])

  const showDetail = process.env.NODE_ENV === "development" && Boolean(error.message)

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full bg-base-100 text-base-content`}>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
          <Alert variant="error">
            <span className="font-semibold">Something went wrong</span>
            <p className="mt-2 text-sm opacity-90">
              The application hit an unexpected error. You can try again or return home.
            </p>
            {showDetail ? (
              <p className="mt-2 text-xs opacity-80 font-mono break-all">{error.message}</p>
            ) : null}
          </Alert>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-error" onClick={() => reset()}>
              Try again
            </button>
            <a href="/" className="btn btn-outline">
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
