import { NextRequest } from "next/server"
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { describe, expect, it } from "vitest"
import { CURRENT_PATH_HEADER } from "@/src/lib/auth/loginUrl"
import { config, middleware } from "./middleware"

/** Next exposes headers set via `NextResponse.next({ request: { headers } })` under this prefix. */
const forwardedHeader = (res: Response, name: string) =>
  res.headers.get(`x-middleware-request-${name}`)

describe("middleware: requested path for login redirects", () => {
  it("forwards the path and query of a page request", () => {
    const res = middleware(new NextRequest("http://localhost:3000/admin/invitations"))
    expect(forwardedHeader(res, CURRENT_PATH_HEADER)).toBe("/admin/invitations")

    const withQuery = middleware(new NextRequest("http://localhost:3000/studies?page=2&view=mine"))
    expect(forwardedHeader(withQuery, CURRENT_PATH_HEADER)).toBe("/studies?page=2&view=mine")
  })

  it("drops Next's internal _rsc param but keeps the real query", () => {
    const res = middleware(new NextRequest("http://localhost:3000/studies/5?tab=data&_rsc=abc12"))
    expect(forwardedHeader(res, CURRENT_PATH_HEADER)).toBe("/studies/5?tab=data")
  })

  it("overwrites a value supplied by the client", () => {
    const res = middleware(
      new NextRequest("http://localhost:3000/dashboard", {
        headers: { [CURRENT_PATH_HEADER]: "/spoofed" },
      })
    )
    expect(forwardedHeader(res, CURRENT_PATH_HEADER)).toBe("/dashboard")
  })

  it("keeps the existing request headers (e.g. the session cookie) intact", () => {
    const res = middleware(
      new NextRequest("http://localhost:3000/dashboard", {
        headers: { cookie: "app-dir_sSessionToken=abc" },
      })
    )
    expect(forwardedHeader(res, "cookie")).toBe("app-dir_sSessionToken=abc")
  })
})

describe("middleware matcher", () => {
  const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url })

  it("runs for protected page routes", () => {
    for (const url of [
      "/dashboard",
      "/studies",
      "/studies/12/setup/step1",
      "/admin/invitations",
      "/admin/dashboard",
      "/explore",
      "/profile/edit",
    ]) {
      expect(matches(url), url).toBe(true)
    }
  })

  it("still runs for the rate-limited API routes", () => {
    for (const url of ["/api/rpc/login", "/api/jatos/import", "/api/cron/study-status"]) {
      expect(matches(url), url).toBe(true)
    }
  })

  it("skips Next internals, static files, and other API routes", () => {
    for (const url of [
      "/_next/static/chunks/main.js",
      "/_next/image",
      "/favicon.ico",
      "/api/other",
    ]) {
      expect(matches(url), url).toBe(false)
    }
  })
})
