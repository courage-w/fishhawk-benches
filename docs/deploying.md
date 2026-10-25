# Deploying

The site is hosted on **Vercel**, imported from this GitHub repo. Every push to `main` deploys
production; other branches get preview URLs.

## Environment variables

Set these in Vercel → Settings → Environment Variables (never in a committed file).

| Name | Needed for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Optional | The https origin. On Vercel it defaults to the project's production domain (`VERCEL_PROJECT_PRODUCTION_URL`), so you only need it elsewhere. |
| `RESEND_API_KEY` | Contact form | Secret. Sending-only key from resend.com. |
| `CONTACT_TO_EMAIL` | Contact form | Inbox for messages. Without a verified domain, must be the Resend account's email. |
| `CONTACT_FROM_EMAIL` | Contact form | `FishHawk Benches <onboarding@resend.dev>` until a domain is verified in Resend. |
| `CONTACT_DELIVERY` | Optional | `resend` (default) or `log` for local testing. |
| `CONTACT_RATE_LIMIT` | Optional | Messages per visitor per 15 min (default 5). |
| `SHOW_DRAFTS` | Optional | `true` shows drafts in `npm run dev` only. |

Without the contact variables the site still works; the form says it isn't set up yet.

## Contact form

A Next.js Server Action with zod validation, Origin-checked CSRF protection, a honeypot, a
timing check, a link-flood check, and in-memory rate limits (5 per visitor per 15 minutes, 60
per hour site-wide). Messages are emailed via Resend and not stored. The in-memory limits are
per server instance and reset on deploy; for stricter limits use a shared store (e.g. Upstash
Redis) or add Cloudflare Turnstile.

## Custom domain

Vercel → Settings → Domains → Add, then add the DNS records it shows at your registrar. HTTPS is
automatic. Set `NEXT_PUBLIC_SITE_URL` to the new origin and redeploy. To send mail from the
domain, verify it in Resend and change `CONTACT_FROM_EMAIL`.

## Rolling back

Vercel → Deployments → pick the last good one → **Promote to Production**. In Git,
`git revert <commit>` and push.

## Smoke test after a deploy

- `/` loads, panorama scrolls, map shows pins; open two bench pages and `/map`.
- `/benches/not-a-bench` returns the 404 page.
- `/feed.xml`, `/sitemap.xml`, `/robots.txt` show the real domain.
- Send a test message from `/contact`.
- `curl -I <site>` shows `content-security-policy` and `strict-transport-security`.

## Google Search Console

Add the site as a property, submit `/sitemap.xml`, and request indexing for the home page and
one bench page. Check Pages and Enhancements after a few days.

## Monitoring

Vercel's dashboard has build and function logs (the contact form logs no personal data). A free
uptime checker pinging `/` is enough. If you add analytics, update `/privacy` first.
