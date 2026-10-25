# Adding benches

1. At each bench take the **view from the seat**, a couple of **photos of the bench**, and a
   **panorama** last. Keep Location Services on for the Camera.
2. Copy the photos (HEIC is fine) into `photos-inbox/`. Trash-can photos go in `photos-inbox-trash/`.
3. Preview the grouping, then import:
   ```bash
   npm run ingest -- --dry-run
   npm run ingest
   npm run ingest -- --trash --inbox photos-inbox-trash
   ```
   Each bench becomes a draft in `content/benches/` with metadata-free photos in `public/photos/`.
4. Fill in the `TODO`s in each draft: name, summary, which photo is the `view`, alt text, and
   `features`. Rename the file and its photo folder to a slug like `shady-pond-corner`.
5. Mark the seat view inside the panorama, then check the yellow boxes in `.seat-view-preview/`:
   ```bash
   npm run locate-views -- --preview
   ```
   If a match is wrong, set `seatView: { center: 0.4, width: 0.25 }` on the panorama by hand.
6. Preview with `SHOW_DRAFTS=true npm run dev`, set `status: published`, then:
   ```bash
   npm run validate
   npm run check
   ```

With Claude Code, `/publish-post` walks through all of this.

## Content format

```yaml
---
title: Between Two Ponds
summary: A bench on a grassy rise with water on both sides…   # 20–220 chars
status: published            # or draft
addedAt: 2026-10-25
updatedAt: 2026-11-02        # optional
location: { lat: 27.847..., lng: -82.220... }
facing: 310                  # optional, overrides the view photo's compass heading
features:
  waterView: true            # pro: looks out over the water
  facesRoad: false           # con: faces the road
  roadNearby: false          # con: a road runs close by
  shade: none                # none (con) | partial (pro) | full (pro)
  trashCan: false            # pro: trash can right next to it
extraPros: ["Big open sky"]
extraCons: []
photos:
  - file: img_2474.jpg
    role: view               # view | panorama | bench | around
    alt: The view from the bench: green grass down to a blue pond…
    width: 2000
    height: 1500
    heading: 310
    credit: Jane Doe         # only if someone else took it
---

A few sentences in Markdown. No HTML.
```

Pros, cons, tags and sunrise/sunset notes are generated from `features` and the view photo's
heading (`src/lib/content/traits.ts`, `src/lib/sun.ts`).
