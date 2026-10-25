# Legal and policy review checklist

The Privacy Policy (`/privacy`) and Terms of Use (`/terms`) were drafted to match what the code
actually does as of 2026-10-25. They are **not legal advice** and have not been reviewed by a
lawyer. Please confirm or fill in the items below. Some may need a professional's input.

## Unknowns we deliberately did not invent

| Topic | Current wording | What to decide |
|---|---|---|
| Who runs the site | "run by one person", contact via the form | Whether to name yourself or an entity. Some laws expect a reachable operator identity. |
| Contact address | Contact form only | Whether to publish an email address too. |
| Governing law / venue | Not stated | Whether to add one (e.g. Florida). Ask a lawyer if it matters to you. |
| Age | Not stated | The site isn't aimed at children. If you want to say so, add it. |
| Photo/text ownership & license | "© FishHawk Benches", ask before reuse | Confirm you took every photo, or add `credit:`. Optionally choose a license (e.g. CC BY-NC). |
| People in photos | Removal on request | Check that no faces or license plates are clearly identifiable in published photos. |
| Property / affiliation | "not affiliated with any HOA, district, developer, or government body" | Confirm that's true. Check whether any HOA/CDD rules restrict photographing or publishing common areas. |
| Safety disclaimer | Alligators/snakes/traffic note, "as is" | Fine for a hobby site. A lawyer can tighten the liability language if you want. |

## Data practices the policy describes (verify they stay true)

- No cookies, analytics, ads, accounts, or database.
- Contact form: name (optional), email, topic, and message are sent via **Resend** to your inbox
  and not stored by the site. Retention is "until you delete them". Decide whether you want a
  fixed retention period.
- IP addresses: held only in memory for rate limiting (~15 min). The hosting provider keeps
  standard request logs. Check your host's retention (e.g. Vercel's log retention) and mention
  it if you want to be precise.
- **OpenStreetMap** tile servers receive visitors' IP address and the page URL when a map loads.
- Photos have EXIF/GPS stripped before publishing (enforced by `npm run validate`).

## Not needed right now (and why)

- **Cookie banner**: no cookies or similar storage are used.
- **Affiliate, advertising, sponsorship, or refund policies**: there's no affiliate linking,
  advertising, sponsorship, or selling.
- **GDPR/CCPA-specific sections**: a small US hobby site with no tracking may not be in scope,
  but if you expect EU visitors or add analytics, get advice and extend `/privacy`.

## When to revisit

Update `/privacy` (and its "Last updated" date) **before** adding analytics, a newsletter,
comments, embedded videos or maps from another provider, ads, or affiliate links.
