import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Simple in-memory rate limiter for MVP mitigation.
// Note: In a multi-node or serverless deployment, use Redis (e.g. @upstash/ratelimit).
// Here, we rely on the Node.js process (which runs Next.js server) keeping state.
interface RateLimitContext {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitContext>()

// Configuration
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 100 // 100 requests per minute

// Clean up expired entries every 5 minutes to prevent memory leaks
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 5 * 60 * 1000

function cleanupMap() {
  const now = Date.now()
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key)
      }
    }
    lastCleanup = now
  }
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Apply rate limit to sensitive endpoints and all RPC calls
  const isSensitive =
    path.startsWith("/api/rpc") ||
    path.startsWith("/api/jatos/import") ||
    path.startsWith("/api/cron/study-status")

  if (isSensitive) {
    // Attempt to get client IP from headers (Next.js 15+ removes request.ip)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      "unknown-ip"

    const now = Date.now()
    cleanupMap()

    const windowData = rateLimitMap.get(ip)

    if (!windowData || now > windowData.resetTime) {
      // First request or window expired
      rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    } else {
      windowData.count++
      if (windowData.count > MAX_REQUESTS) {
        return new NextResponse(
          JSON.stringify({ error: "Too Many Requests. Please try again later." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": Math.ceil((windowData.resetTime - now) / 1000).toString(),
            },
          }
        )
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/rpc/:path*", "/api/jatos/import", "/api/cron/study-status"],
}
