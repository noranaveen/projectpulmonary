# Project Pulmonary — DynamoDB Schema Plan

Planning notes for moving site content off hand-edited HTML and into DynamoDB. Written for a small nonprofit site at low-to-moderate scale (hundreds of items per entity, not millions) — so the recommendation throughout is **plain multi-table design**, one table per content type, each with a simple primary key and at most one GSI. DynamoDB's single-table design pattern (everything in one table, disambiguated by prefixed keys) is a scaling optimization for high-throughput systems with complex access patterns; it adds real modeling complexity that isn't worth it here. Separate tables are easier to reason about, easier to hand off to a volunteer dev, and cost effectively the same at this size.

## How this would actually connect to the site

Right now the site is fully static (GitHub Pages — confirmed by the `CNAME`, `robots.txt`, and `sitemap.xml` at the repo root). Moving content to DynamoDB means picking one of two patterns per table:

- **Build-time fetch** — a small Node script runs before deploy, pulls items from DynamoDB, and generates the HTML (or a JSON file the pages fetch). Site stays static and fast; content updates require a rebuild/redeploy (a GitHub Action can do this on a schedule or on a "content updated" trigger).
- **Runtime fetch** — pages call an API (API Gateway + Lambda, or AppSync) client-side to load content live. Updates show up immediately with no redeploy, at the cost of a loading state and a small amount of backend to run.

Articles and Impact Stats are good candidates for build-time (content changes rarely, SEO matters, no reason to pay a runtime cost). A future chapter-application form or contact form is the opposite — that's a write path, so it needs a real API regardless (Lambda behind API Gateway, or even a Lambda Function URL, writing straight to DynamoDB).

---

## Recommended build order

| Order | Table | Why this priority |
|---|---|---|
| 1 | **Articles** | Already underway — the blog index/detail pages were just built to expect exactly this shape. |
| 2 | **ImpactStats** | Smallest possible lift, highest recurring pain: the same numbers (chapters, hydration items, letters, sauna funding) are hand-typed in multiple places across `index.html` and `impact.html` today. One table kills that. |
| 3 | **Chapters** | Currently only exists as a Google My Maps embed and a hard-coded list on the homepage. A real table lets you build a chapter directory page and eventually replace the Maps embed with your own map. |
| 4 | **TeamMembers** | The same three quotes (Jaiden, Harshitha, Nora, etc.) are duplicated between the homepage "Voices" section and `about.html`. One source of truth, referenced from both. |
| 5 | **PressItems** | Powers both the full `press.html` list and the homepage "Recognition" strip (which just shows a featured subset). |
| 6 | **Sponsors** | Simple, low-risk, same marquee repeated on every page. |
| 7 | **FaqItems** | Standard CMS content, not currently interactive beyond the accordion. |
| 8 | **PhotoMedia** | Bigger lift (needs S3 for the actual images, Dynamo just for metadata) but high leverage — 160+ chapters generating photos is exactly the kind of firehose a shared, taggable library is built for. |
| 9 | **Form submissions** (ChapterApplications, VolunteerSignups, ContactMessages) | Not "content" — this is data collected *from* users, so it needs a write API either way. Worth doing once you're setting up Lambda/API Gateway anyway, so applications land in a table you can query instead of an inbox. |

---

## 1. Articles

**Table:** `Articles`
**Primary key:** `slug` (String, partition key only — one item per article, no sort key needed)

| Attribute | Type | Notes |
|---|---|---|
| `slug` | S (PK) | e.g. `how-wildfire-smoke-impacts-firefighters` — also the URL path under `/articles/` |
| `title` | S | |
| `category` | S | `exposure-science`, `early-detection`, etc. — matches the filter pills on the index page |
| `excerpt` | S | 2–3 sentence card summary |
| `coverImageUrl` | S | |
| `bodyBlocks` | L (List) | Ordered list of `{ type: "p" \| "h2" \| "bullets" \| "stat" \| "flow", ...content }` — see below |
| `authorName` | S | |
| `authorRole` | S | |
| `authorInitials` | S | Avatar fallback (e.g. `LE`) |
| `readTimeMinutes` | N | |
| `publishedDate` | S | ISO 8601, e.g. `2026-03-14` |
| `status` | S | `draft` \| `published` — lets you write an article without it going live |
| `sources` | L (List of S) | |

**On `bodyBlocks`:** don't store the article body as one giant HTML string. Store it as structured blocks so the render template controls the styling (this is what keeps `.article-stat` / `.article-flow` looking consistent instead of relying on whoever writes the next article to remember the right CSS classes):

```json
[
  { "type": "p", "text": "It is well known that wildland firefighters..." },
  { "type": "stat", "label": "Statistic", "text": "Long-term health tracking shows..." },
  { "type": "flow", "text": "Wildfire Smoke → PM2.5 Enters Lungs → Alveoli → ..." },
  { "type": "bullets", "items": [{ "term": "C-reactive protein", "text": "a marker of..." }] }
]
```

**Access patterns:**
- Get one article by slug → direct `GetItem` on the base table. Fast, no index needed.
- List all published articles, newest first → at this scale (tens of articles), a `Scan` + sort in code is genuinely fine and simpler than an index. If it ever grows past a few hundred, add a GSI: `GSI1PK = status`, `GSI1SK = publishedDate`.
- Filter by category → you already built this as a client-side filter over the full list (the pill buttons on `articles.html`); no query pattern needed server-side unless the article count gets large.

---

## 2. ImpactStats

**Table:** `ImpactStats`
**Primary key:** `statKey` (String, partition key)

| Attribute | Type | Notes |
|---|---|---|
| `statKey` | S (PK) | e.g. `chapters`, `hydration-items`, `sauna-funding`, `letters`, `firefighters-reached`, `stations` |
| `value` | N | The raw number the count-up animation targets |
| `prefix` | S | e.g. `$` (optional) |
| `suffix` | S | e.g. `+`, `%` (optional) |
| `label` | S | The sentence under the number, e.g. "Hydration items distributed to firefighters at individual fire stations." |
| `displayContexts` | L (List of S) | Which pages/sections show this stat, e.g. `["home-hero", "impact-page"]` — so one number can drive `data-count-to` in more than one place |
| `lastUpdated` | S | ISO date |

**Access pattern:** the whole table is small enough (well under a dozen items) that the build step just fetches all of it every time and injects values wherever `displayContexts` matches. No index needed. This is the table a non-technical board member could update through a tiny admin form without touching code.

---

## 3. Chapters

**Table:** `Chapters`
**Primary key:** `chapterId` (String, partition key — e.g. a slug like `ventura-county-ca`)
**GSI:** `GSI1` on `region` (partition) + `name` (sort) — for "all chapters in California" style grouping if a directory page gets built

| Attribute | Type | Notes |
|---|---|---|
| `chapterId` | S (PK) | |
| `name` | S | e.g. "Ventura County" |
| `city` | S | |
| `region` | S | State/province, or country if international (Dominican Republic chapters, etc.) |
| `country` | S | |
| `chapterType` | S | `high-school` \| `elementary` \| `college` |
| `leadName` | S | |
| `leadEmail` | S | |
| `foundedDate` | S | |
| `status` | S | `active` \| `inactive` |
| `lat` / `lng` | N | For eventually replacing the Google My Maps embed with an in-house map |
| `memberCount` | N | Optional |

**Access patterns:** list all active chapters (Scan; fine at this scale), or query `GSI1` by region for a grouped directory view.

---

## 4. TeamMembers

**Table:** `TeamMembers`
**Primary key:** `memberId` (String, partition key)

| Attribute | Type | Notes |
|---|---|---|
| `memberId` | S (PK) | |
| `name` | S | |
| `role` | S | |
| `initials` | S | Avatar fallback |
| `photoUrl` | S | Optional |
| `quote` | S | The testimonial text |
| `bio` | S | Longer form, for `about.html` |
| `memberCategory` | S | `founder` \| `exec-team` \| `chapter-lead` |
| `featuredOnHome` | BOOL | Controls which subset rotates in the homepage "Voices" section vs. the full `about.html` grid |
| `displayOrder` | N | |
| `active` | BOOL | |

**Access pattern:** fetch all active members, filter/sort by `featuredOnHome` and `displayOrder` in code. No index needed at this scale.

---

## 5. PressItems

**Table:** `PressItems`
**Primary key:** `itemId` (String, partition key)

| Attribute | Type | Notes |
|---|---|---|
| `itemId` | S (PK) | |
| `title` | S | e.g. "Founder Bettina featured on KTLA" |
| `outlet` | S | e.g. "KTLA 5", "Hershey", "Origami for Good" |
| `itemType` | S | `feature` \| `grant` \| `award` \| `commendation` |
| `amount` | S | Optional, e.g. `"$35,000"` — kept as a string since some entries are non-numeric ("KTLA 5") |
| `date` | S | |
| `description` | S | |
| `imageUrl` | S | Optional |
| `externalLink` | S | Optional |
| `featuredOnHome` | BOOL | Marks the subset shown in the homepage "Recognition" strip |
| `displayOrder` | N | |

**Access pattern:** same shape as TeamMembers — fetch all, filter by `featuredOnHome` in code.

---

## 6. Sponsors

**Table:** `Sponsors`
**Primary key:** `sponsorId` (String, partition key)

| Attribute | Type | Notes |
|---|---|---|
| `sponsorId` | S (PK) | |
| `name` | S | |
| `logoUrl` | S | |
| `websiteUrl` | S | Optional |
| `active` | BOOL | |
| `displayOrder` | N | |

Straightforward — powers the marquee that currently repeats on every page.

---

## 7. FaqItems

**Table:** `FaqItems`
**Primary key:** `faqId` (String, partition key)

| Attribute | Type | Notes |
|---|---|---|
| `faqId` | S (PK) | |
| `question` | S | |
| `answer` | S | |
| `category` | S | Optional grouping |
| `displayOrder` | N | |
| `active` | BOOL | |

---

## 8. PhotoMedia

**Table:** `PhotoMedia` (metadata only — the actual image files belong in S3, with this table pointing at them)
**Primary key:** `photoId` (String, partition key)
**GSI:** `GSI1` on `chapterId` (partition) + `takenDate` (sort) — "all photos from this chapter, newest first"

| Attribute | Type | Notes |
|---|---|---|
| `photoId` | S (PK) | |
| `s3Key` | S | Path in the S3 bucket |
| `altText` | S | Doubles as the caption |
| `chapterId` | S | FK-style reference to `Chapters` |
| `eventType` | S | `hydration-drive` \| `letters-for-lungs` \| `tabling` \| `sauna-install` \| `press` |
| `takenDate` | S | |
| `credit` | S | Optional |
| `tags` | L (List of S) | |
| `featured` | BOOL | For the homepage "Moments" collage |

This is the biggest lift of the group (needs an upload path — presigned S3 URLs from a Lambda, plus this table for metadata) but it's the one with the most long-term leverage: with 160+ chapters generating content, a shared photo library with tagging beats emailing files to whoever maintains the repo.

---

## 9. Form submissions (operational data, not content)

These aren't things the site *displays* so much as things it *collects* — they need a write path (Lambda behind API Gateway or a Function URL) regardless of whether the rest of the content moves to Dynamo. Worth building once that plumbing exists anyway.

**`ChapterApplications`** — PK `applicationId`
`applicantName`, `email`, `school`, `city`, `region`, `gradeLevel`, `submittedDate`, `status` (`new` \| `reviewed` \| `approved` \| `declined`), `notes`

**`VolunteerSignups`** — PK `signupId`
`name`, `email`, `chapterInterest`, `submittedDate`, `status`

**`ContactMessages`** — PK `messageId`
`name`, `email`, `subject`, `message`, `submittedDate`, `status` (`new` \| `read` \| `replied`)

Right now `join-us.html` and `contact.html` route through `mailto:` links and (per `main.js`) a generic Formspree AJAX handler — functional, but everything lands in an inbox with no queue, no status tracking, and no way to see "how many chapter applications came in this month" without digging through email. A `status` field per item is what turns this from "a form that sends an email" into something closer to a lightweight applicant tracker.

---

## A note on IDs

For every `*Id` / `*Key` field above, a human-readable slug (`ventura-county-ca`, `how-wildfire-smoke-impacts-firefighters`) is recommended over a random UUID wherever the ID also has to appear in a URL or be typed by a person updating content by hand. Reserve UUIDs for the form-submission tables, where nobody needs to read or type the ID.
