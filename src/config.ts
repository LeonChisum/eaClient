if (!process.env.DEPLOYMENT_URL) {
  throw new Error(`Missing Deployment URL for bot, for local this would be localhost:PORT`)
}
let deployment = ""
if (process.env.DEPLOYMENT_URL.startsWith("localhost")) {
  deployment = "http://" + process.env.DEPLOYMENT_URL
} else if (!process.env.DEPLOYMENT_URL.startsWith("http")) {
  deployment = "https://" + process.env.DEPLOYMENT_URL
} else {
  deployment = process.env.DEPLOYMENT_URL
}
export const DEPLOYMENT_URL = deployment

let queueConcurrency = 1
if (process.env.QUEUE_CONCURRENCY) {
  queueConcurrency = Number(process.env.QUEUE_CONCURRENCY)
}
export const QUEUE_CONCURRENCY = queueConcurrency

// Origins allowed to be used as a `return_to` value in the EA-connect dashboard
// flow (see dashboard/routes.ts). Fails closed - an empty/unset list means no
// return_to is ever honored, same "no default, must opt in" posture as
// SYNC_API_KEY. Comma-separated, e.g. "https://leaguecard.example.com".
export const ALLOWED_RETURN_TO_ORIGINS = (process.env.ALLOWED_RETURN_TO_ORIGINS || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean)
