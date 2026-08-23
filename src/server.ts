import Koa from "koa"
import bodyParser from "@koa/bodyparser"
import serve from "koa-static"
import path from "path"
import debugRouter from "./debug/routes"
import dashboard from "./dashboard/routes"

// This is the trimmed-down "standalone EA sync" deployment of snallabot:
// only the EA OAuth dashboard/export-trigger API and health/metrics are mounted.
// The Discord bot, Twitch notifier, Discord-guild-linking, and the passive
// Madden Companion App ingestion webhook (which wrote league content into
// this service's own DB) are intentionally not mounted here - this service
// never persists league content, it only connects to EA and pushes exported
// data on to externally-configured destinations.
const app = new Koa()

app
  .use(serve(path.join(__dirname, 'public')))
  .use(bodyParser({ enableTypes: ["json", "form"], encoding: "utf-8", jsonLimit: "100mb" }))
  .use(async (ctx, next) => {
    try {
      await next()
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = {
        message: err.message
      };
    }
  })
  .use(debugRouter.routes())
  .use(debugRouter.allowedMethods())
  .use(dashboard.routes())
  .use(dashboard.allowedMethods())

export default app
