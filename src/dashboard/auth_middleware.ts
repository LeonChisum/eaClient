import { Next, ParameterizedContext } from "koa"

// Guards the sync-trigger/config endpoints (export, exportStatus, updateExport,
// deleteExport, unlink) that are meant to be called only by the operator's own
// backend, not the public internet. Fails closed: if SYNC_API_KEY isn't
// configured, requests are rejected rather than silently allowed through -
// these routes previously had no auth at all.
export function requireApiKey() {
  return async (ctx: ParameterizedContext, next: Next) => {
    const key = process.env.SYNC_API_KEY
    if (!key) {
      ctx.status = 500
      ctx.body = { message: "SYNC_API_KEY is not configured on this deployment" }
      return
    }
    const authHeader = ctx.get("Authorization")
    const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined
    if (bearerKey === key) {
      await next()
      return
    }
    ctx.status = 401
    ctx.body = { message: "unauthorized" }
  }
}
