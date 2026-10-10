# Cloud, Discord, Community Votes, and LFG Setup

## Supabase

1. Create a Supabase project and copy its project URL, anon key, and service-role key into `.env.local` using `.env.example` as the template.
2. In Supabase Authentication settings, enable **Allow anonymous sign-ins**. The browser creates a Supabase anonymous user and keeps its session. The local nickname/BattleTag profile remains a display profile, not a password account.
3. Run `supabase/migrations/202610100001_dashboard_features.sql` and then `supabase/migrations/202610110001_lfg_recruitment_fields.sql` in order (or apply both with the Supabase CLI).
4. Restart Next.js after changing environment variables.

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`, commit a real value, or expose it in client code. Public reads use the anon key; API mutations verify the Supabase JWT and use the service-role client on the server. RLS allows public reads and denies anonymous table writes.

Cloud squad links store the entered BattleTags and mode in a public row. Anyone with the UUID URL can read the squad and trigger a fresh public-stat lookup. Share links only with people allowed to see those BattleTags.

Community votes are limited to one vote per Supabase anonymous user and hero; a later vote replaces that user's previous vote. Community scores receive a confidence-weighted blend capped at 25% of the algorithm score, so a small number of votes cannot dominate the meta tier. Anonymous Supabase identities are pseudonymous and can be reset by clearing browser data; they are not proof of a real-world identity.

LFG recruitment rows include purpose, role, target tier, team capacity, BattleTag, and optional Discord contact. Applicants live in an RLS-protected table and are not returned to other users; the API returns only aggregate counts and the current viewer's own application state. A row-locking Postgres function prevents applying twice or exceeding capacity. The migration adds `lfg_posts` to Supabase Realtime when that publication is available; the page also polls every 20 seconds as a fallback.

## Discord

### Channel webhook reports

Create a Discord channel webhook and set `DISCORD_WEBHOOK_URL` in `.env.local`. The report button sends the squad BattleTags to the server, which re-fetches current OverFast stats and recomputes OW-Scores and meta fit before posting the embed. The webhook URL is only read by the server route. No `discord.js` package is required: the app uses Discord's signed HTTP Interactions endpoint and the standard `fetch` API.

### `/squad` command

1. Create a Discord application and bot in the Discord Developer Portal.
2. Set `DISCORD_APPLICATION_ID` and temporarily provide `DISCORD_BOT_TOKEN` in the shell used for command registration. Do not commit either secret.
3. Run `npm run discord:register` once to register the global `/squad battletag:<tag>` command.
4. Deploy the app to a public HTTPS URL. In the Developer Portal, set the Interactions Endpoint URL to `https://YOUR_DOMAIN/api/discord/interactions` and copy the application's public key into `DISCORD_PUBLIC_KEY`.
5. Invite the application to your server with the `applications.commands` scope.

The interaction route verifies Discord's Ed25519 request signature and responds ephemerally with a player OW-Score, competitive rank, and coaching summary. It uses Discord Interactions rather than maintaining a long-running Gateway bot process; traditional prefix commands such as `!전적` require such a process and are not supported by this App Router deployment.

## Environment

Copy `.env.example` to `.env.local` and replace all placeholders. `DISCORD_BOT_TOKEN` is only needed while registering commands; it is not used to serve interactions. `DISCORD_PUBLIC_KEY` and `DISCORD_WEBHOOK_URL` are server-only values.
