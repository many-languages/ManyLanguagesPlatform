import { rpcAppHandler } from "@blitzjs/rpc"
import type { NextRequest } from "next/server"
import { serialize } from "superjson"
import { withBlitzAuth } from "src/app/blitz-server"

type RouteHandler = (req: NextRequest, ctx: unknown) => Promise<Response>

const rpc = rpcAppHandler()

/** Blitz's App Router RPC handler always calls `req.json()`; empty bodies throw. */
const emptySerialized = serialize({})
const emptyPostBody = JSON.stringify({
  params: emptySerialized.json,
  meta: { params: emptySerialized.meta },
})

async function normalizeRpcRequest(req: Request): Promise<Request> {
  if (req.method === "HEAD") return req
  const text = await req.text()
  if (text.trim()) {
    return new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: text,
    })
  }
  const fallback = req.method === "POST" ? emptyPostBody : "{}"
  return new Request(req.url, {
    method: req.method,
    headers: req.headers,
    body: fallback,
  })
}

const handlers = withBlitzAuth({
  GET: (req, segmentData, ctx) =>
    normalizeRpcRequest(req).then((r) => rpc.GET(r, segmentData, ctx)),
  HEAD: rpc.HEAD,
  POST: (req, segmentData, ctx) =>
    normalizeRpcRequest(req).then((r) => rpc.POST(r, segmentData, ctx)),
})

export const GET = handlers.GET as unknown as RouteHandler
export const HEAD = handlers.HEAD as unknown as RouteHandler
export const POST = handlers.POST as unknown as RouteHandler
