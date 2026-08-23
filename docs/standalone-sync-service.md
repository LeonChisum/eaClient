# Standalone EA-sync service

This document describes running this repo as a minimal, standalone service whose only job is:

1. Connect to a Madden league through EA's own account login (the "WAL"/Blaze login flow), and
2. Push that league's exported data straight through to **your own application** over HTTP.

This deployment mode never persists Madden league content (teams, standings, stats, rosters). It keeps only its own small connection state - EA OAuth tokens/session and which destination URL(s) a league should push to - and forwards everything else on to you. Your app owns and stores the actual league data on its side.

The Discord bot, Twitch notifier, YouTube notifier, and Discord-guild-linking features of the full snallabot service are not part of this deployment mode.

## Deploying

Required env vars (see `.base.env` for the full annotated list):

- `DEPLOYMENT_URL` - the public URL this service is reachable at.
- `SERVICE_ACCOUNT` or `SERVICE_ACCOUNT_FILE` - credentials for a Firestore project. This is only used to store EA tokens and destination config for each connected league - never league content. A small, dedicated Firestore project for this service alone is recommended over pointing it at your main application's database.
- `SYNC_API_KEY` - a secret you generate. Required for the sync-trigger/config endpoints below to accept any requests at all (they fail closed without it).

Discord/Twitch/YouTube/Mongo env vars are not needed - none of that code is mounted in this deployment.

```sh
npm install
npm run build
npm run start
```

Also run the token refresher as a second long-running process, so EA tokens stay valid without needing a fresh browser login every few hours:

```sh
npm run ea-refresher
```

## One-time setup per league

A human still has to complete EA's own login once per league - this can't be automated, since EA's OAuth flow doesn't offer a headless/service-account login. Visit `{DEPLOYMENT_URL}/dashboard`, log in with the EA account, and select the league. This stores the league's EA tokens; from then on this service keeps them refreshed automatically. The league starts with **zero** export destinations - it won't push anything anywhere until your app registers itself (below).

## Triggering a sync from your app

```
POST {DEPLOYMENT_URL}/dashboard/league/{leagueId}/export
Authorization: Bearer {SYNC_API_KEY}
Content-Type: application/json

{ "exportOption": "ALL" }
```

Returns `{ "taskId": "..." }`. Valid `exportOption` values come from `exportOptions` in `src/dashboard/ea_constants.ts` (e.g. current week, surrounding weeks, all weeks).

Poll for completion:

```
POST {DEPLOYMENT_URL}/dashboard/league/exportStatus
Authorization: Bearer {SYNC_API_KEY}
Content-Type: application/json

{ "taskId": "..." }
```

## Registering your app as a destination

```
POST {DEPLOYMENT_URL}/dashboard/league/{leagueId}/updateExport
Authorization: Bearer {SYNC_API_KEY}
Content-Type: application/json

{
  "url": "https://your-app.example.com/ea-ingest",
  "secret": "a-long-random-string-you-generate",
  "leagueInfo": true,
  "weeklyStats": true,
  "rosters": true,
  "extraData": false,
  "autoUpdate": true,
  "editable": true
}
```

`secret` is optional but strongly recommended - see signing below. Remove a destination with the matching `POST /dashboard/league/{leagueId}/deleteExport` (`{"url": "..."}`), same auth header.

## What gets POSTed to your app

Once registered, a triggered export makes POST requests to your `url` with these paths appended (mirrors `docs/madden/export_api.md`):

- `/{platform}/{leagueId}/leagueteams`
- `/{platform}/{leagueId}/standings`
- `/{platform}/{leagueId}/week/{stage}/{week}/schedules` (and `punting`, `teamstats`, `passing`, `kicking`, `rushing`, `defense`, `receiving`)
- `/{platform}/{leagueId}/team/{teamId}/roster`
- `/{platform}/{leagueId}/freeagents/roster`
- `/{platform}/{leagueId}/extra`

`platform` is the console (e.g. `ps5`, `xbsx`, `pc`), `stage` is `pre` or `reg`. Each is a `POST` with a JSON body (`Content-Type: application/json`) - the payload shapes are documented in `docs/madden/export_api.md`. Only the categories you enabled (`leagueInfo`, `weeklyStats`, `rosters`, `extraData`) get pushed.

## Verifying a push actually came from this service

If you set a `secret` on the destination, every request to it includes:

- `X-Snallabot-Timestamp`: epoch milliseconds when the request was signed
- `X-Snallabot-Signature`: `sha256=<hex hmac>`, where the HMAC is `HMAC-SHA256(secret, "{timestamp}.{raw request body}")`

To verify on your side: recompute the HMAC over the exact same string using your stored `secret`, compare it to `X-Snallabot-Signature` using a constant-time comparison, and reject the request if the timestamp is more than a few minutes old (guards against replay). No signature is sent if the destination has no `secret` configured.
