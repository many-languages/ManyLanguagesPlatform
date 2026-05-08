import { rpcAppHandler } from "@blitzjs/rpc"
import { serialize } from "superjson"
import { withBlitzAuth } from "src/app/blitz-server"

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

export const { GET, HEAD, POST } = withBlitzAuth({
  GET: (req, segmentData, ctx) =>
    normalizeRpcRequest(req).then((r) => rpc.GET(r, segmentData, ctx)),
  HEAD: rpc.HEAD,
  POST: (req, segmentData, ctx) =>
    normalizeRpcRequest(req).then((r) => rpc.POST(r, segmentData, ctx)),
})
