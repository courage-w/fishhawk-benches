---
name: publish-post
description: Add or publish a bench entry (a "post") or trash-can spots on FishHawk Benches. Use when the user wants to add new bench photos, turn an ingest draft into a published bench, edit a bench's text, pros/cons or photos, or add trash cans to the map. Validates frontmatter, slug, photos, alt text, attribution, links, dates and the production build before anything is called publishable.
---

# Publish a bench (or trash spots)

A bench is `content/benches/<slug>.md` (YAML frontmatter + Markdown notes) plus its photos in
`public/photos/<slug>/`. The schema is `src/lib/content/schema.ts`; read it if a field is unclear.
Never report a step as passed unless its command actually ran and succeeded.

## 1. Import photos (new benches only)

1. Ask the user to copy the phone photos (HEIC/JPG, straight from the phone so GPS is intact) into
   `photos-inbox/`. Photos of trash cans go in a separate folder, e.g. `photos-inbox-trash/`.
2. Preview the grouping: `npm run ingest -- --dry-run`. Each group should be one bench, usually
   ending with a panorama. Show the user the groups. If two benches merged or one split, say so
   and adjust by moving files between runs (the rules are in `src/lib/cluster.ts`).
3. Run `npm run ingest` (benches) and/or `npm run ingest -- --trash --inbox photos-inbox-trash`.
   This writes drafts with `status: draft`, metadata-stripped web JPEGs, and appends trash spots
   to `content/trash-cans.json`.

## 2. Look at every photo before writing anything

Open each new image in `public/photos/<draft-slug>/` with the Read tool. You cannot write honest
alt text, roles or pros/cons without seeing them. Delete accidental shots (feet, fingers, blur):
remove the file and its `photos:` entry.

## 3. Fill in the draft

- **Rename** the file and photo folder to a short, lowercase, hyphenated slug that describes the
  place (`between-two-ponds`). Slug must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Never reuse a slug.
- **title** (≤80), **summary** (20–220 chars, plain and specific; it's the meta description).
- **photo roles**: exactly one `view` (what you see sitting down; its compass `heading` sets
  "Faces …"), at most one `panorama`, others `bench` or `around`. Confirm the view with the user
  if unsure.
- **alt** for every photo: a full sentence saying what is actually visible. No "image of".
- **credit**: required if anyone other than the site owner took the photo; ask the user.
- **features**: set from the photos, then confirm with the user anything you inferred.
  - `waterView` pond/lake visible from the seat · `facesRoad` the seat looks at a road ·
    `roadNearby` a road is close but not in front · `shade` none/partial/full · `trashCan` one
    right beside the bench.
  Pros/cons are generated from these (see `RULES` in `src/lib/content/traits.ts`). Sunrise and
  sunset notes are computed from the view photo's heading and the latitude (`src/lib/sun.ts`),
  so never hand-write sun pros; if the heading is wrong, fix it or set `facing`. Use
  `extraPros` / `extraCons` only for things the rules don't cover (≤140 chars each).
- **dates**: `addedAt` YYYY-MM-DD. When editing an existing bench later, add `updatedAt`.
- **body**: a few honest sentences. Markdown only: no HTML, no images, no MDX. Internal links
  like `/benches/<slug>` must point to existing benches; external links must be https.
- **seat-view lines**: once the `view` and `panorama` roles are right, run
  `npm run locate-views -- --preview` and open `.seat-view-preview/<slug>.jpg`. The yellow box
  must frame the same scene as the view photo. If it says "not confident" or the box is wrong,
  set `seatView: { center, width }` on the panorama by hand (fractions of its width) and add a
  comment saying it was set by hand.
- Remove every `TODO`. Set `status: published` only when the user agrees it's ready.
- Don't invent facts (names of streets, parks, HOAs) that aren't visible or confirmed by the user.

## 4. Validate

Run, in order, and stop at the first failure (fix, then rerun):

```bash
npm run validate        # schema, files exist, image sizes match, no EXIF/GPS left in photos
npm run test            # unit tests, including "content folder has no validation errors"
npm run build           # every bench page must prerender
```

Then check links in the new body: each `/benches/...` link resolves to a file in `content/benches/`.

## 5. Look at it

Start the dev server and open `/benches/<slug>`: panorama scrolls, the view photo and "Faces …"
look right, pros/cons make sense, pin is in the right place on the map. Check `/map` for new
trash spots. Report what you checked and anything you could not verify.

## Trash spots only

Trash cans never get a page. Each entry in `content/trash-cans.json` needs `id`, `lat`, `lng`,
`addedAt` and optionally `photo` (in `public/photos/trash/`) and a short `note`. Ingest dedupes
anything within 8 m of an existing spot.
