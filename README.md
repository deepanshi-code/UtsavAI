# UtsavAI

A GenAI planning assistant for Indian weddings, birthdays, festivals and community events.
Describe your event and get a **budget that actually adds up**, a **day-by-day schedule**,
**venues in your city**, a **task and vendor checklist**, **ideas and customs**, and a
ready-to-send **invitation**, all editable and exportable.

Built for PromptWars Virtual, Challenge 05: Celebration & Event Planner.

**Live:** https://aiutsav-gold.vercel.app

## Pages

| Route | What it's for |
|---|---|
| `/` | Landing page with a CSS 3D planner notebook that leans toward the pointer (no WebGL, respects reduced motion) |
| `/plan/new` | 4-step wizard: occasion → dates (1–7 days), city, guests & budget (log-scale sliders, live per-guest cost) → style & preferences → review |
| `/plan/[id]` | Plan dashboard: countdown & progress stats; tabs for Overview, Schedule, Venues, Budget, Tasks, Vendors, Ideas; refine drawer; share, calendar, print |
| `/plan/[id]/invite` | Invitation studio: one card per function (Haldi, Sangeet…) plus the main card, each with its own date, time, venue and a design matched to its theme; AI wording (English / Hindi / Hinglish, 4 tones), 7 designs (Royal arch, Botanical vines, Festive lights, Watercolour, Party, Mandala, Marigold toran) × 12 palettes, preview, PNG download, WhatsApp text |
| `/plans` | Saved plans with search, sort and progress |
| `/share#p=…` | Opens a shared plan; "Save to my plans" makes your own editable copy |

Plans are saved in the browser (localStorage), so no account or database is needed.

## What it does

| Feature | How |
|---|---|
| Structured plan, not a chat blob | Gemini returns JSON constrained by a response schema ([lib/gemini.ts](lib/gemini.ts)); the UI renders it as tables and checklists |
| Budget that sums correctly | The server rescales model output so categories add up to your exact total (LLMs are unreliable at arithmetic) |
| Live budget rebalancing | Edit any category and it locks; the unlocked ones rebalance proportionally. Overspend is flagged, never silently fixed ([lib/budget.ts](lib/budget.ts)) |
| Plan each function | Weddings and multi-day events list their functions (day, guests, theme). Each gets its own theme, decor, food, music and dress code; edit any of them in place, or re-plan just one function with AI while the rest stays as is |
| Guest stays | Optional hotel rooms for outstation guests: where to book, cost per room-night, a matching budget line, and hotel listings |
| Top vendors, automatically | With `GOOGLE_MAPS_API_KEY` set (Places API New), each vendor type, venue type and the hotel plan shows the city's top 3–4 businesses on its own, ranked by rating weighted by review count, with phone, website and map link; shortlist the ones you like. Without a key it links to the same Google Maps search. Businesses never come from the model |
| Edit and regenerate | "Edit details" reopens the wizard with the plan's current details and functions; regenerating updates the same plan and keeps ticks, shortlists and invitations |
| Venues in your city | Gemini suggests *kinds* of venue (capacity, price range, why it fits); each opens a live Google Maps search of the user's city, so every listed venue is real |
| Dated task list | Tasks are stored as "days before day 1", clamped to the time actually remaining, shown with real dates and overdue flags |
| Progress tracking | Tick off tasks and vendors; progress survives reloads and refines (matched by task/vendor name) |
| Refine in plain English | "Cut budget by 20%", "make it eco-friendly": the current plan and your change go back to Gemini, and a changed total is honoured |
| Creative ideas | 10–12 ideas across six categories (decor, entertainment, food, guest experience, photos & social, tradition reimagined), including Gen-Z favourites; "More ideas" adds six new ones, optionally in one category |
| Invitations | Gemini writes the wording using only facts the host entered; designs are drawn from a seed, so "New pattern" gives a one-off card, exported as a 1080×1350 PNG |
| Indian context | INR with lakh formatting, city-aware pricing, regional customs only when they fit (never assumes religion) |
| Export & share | Print/save as PDF, add tasks and functions to Google/Apple Calendar (.ics), copy a share link |

### Design decisions
- **Share links live in the URL fragment** (`#p=…`, lz-compressed). Fragments are never sent to the server, so there's no database to run and shared plans aren't logged.
- **Model output is validated, not trusted.** `normalisePlan` drops malformed rows, caps string lengths, clamps dates and schedule days, sanitises map queries and fixes the budget sum. Plans sent back for refinement are re-normalised and size-capped.
- **Prompt-injection hygiene.** User text is fenced (`<event_details>`, `<facts>`) and the prompts say to treat it as data. This reduces risk but doesn't eliminate it, which is why output is also validated.
- **Model fallback within a time budget.** During testing the newest Flash models were often overloaded (503s, 60s+ queues). The server works through a chain of four Flash models with hedged requests: if one is slow after 12s, the next starts alongside it and the first valid answer wins, all inside Vercel's 60s function limit. Thinking is set to LOW because schema-shaped output doesn't need long reasoning.
- **No guessed facts.** The model once titled a 30-guest party a "30th birthday". The prompt now says "Guest count: 30 people" and passes an explicit "Age / milestone: not specified (do not assume…)" unless the user fills in the optional milestone field.
- **No invented venues.** Free-tier keys can't use Gemini's Maps grounding, and an LLM naming venues would invent some. So the model only suggests venue types and the names come from Google Maps (keyless embed + documented Maps URLs). With billing enabled, Maps grounding could list named venues directly.
- **Invitation typography.** Cards use Great Vibes, Cormorant Garamond and Cinzel (SIL OFL 1.1, bundled in `public/fonts` with their licences). Fonts are inlined into the SVG on export, so the downloaded PNG matches the preview.
- **Calm, editorial design.** Warm ivory paper, Fraunces headings, Inter body text and Lucide line icons (no emoji), flat buttons, in four themes (Paper, Blush, Mint, Night journal) set before first paint to avoid a flash.
- **Accessible interactions.** ARIA tabs with arrow-key navigation, radio/checkbox roles on custom controls, focus moved to each wizard step's heading, `prefers-reduced-motion` respected throughout, 3D tilt disabled on touch. Every page and plan tab passes an axe-core WCAG 2 A/AA scan in all four themes, including text contrast of at least 4.5:1 and a logical heading order.
- **API key stays server-side** in Next.js route handlers; inputs are validated and every API route has a best-effort per-client rate limit.
- **Security headers.** A Content Security Policy limits scripts, styles, images and fonts to this origin (frames only to Google Maps), plus `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a Permissions-Policy that turns off camera, microphone and location.
- **A planner, not a form.** The plan opens with a personal note in the planner's voice, and the 15–30s generation wait shows the family's brief and occasion-specific tips instead of a bare spinner.
- **Runs without a key.** If `GEMINI_API_KEY` is unset, the API returns a clearly labelled sample plan (and template invitation wording) so the UI can be developed and tested offline.

### Known limitations
- The rate limit is per serverless instance (in memory), so it blunts bursts but isn't a hard cap.
- Prices come from the model's general knowledge, not live vendor data. The UI says to verify them.
- The map uses Google's keyless embed URL, which isn't an officially supported API; the "Open in Google Maps" button uses documented Maps URLs and keeps working regardless.
- Refining regenerates the plan, so manual budget locks are reset.
- Saved plans live in one browser; use a share link to move a plan to another device.

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your key from https://aistudio.google.com/apikey
npm run dev                  # http://localhost:3000
```

```bash
npm test          # 89 unit tests: budget maths, validation, prompts, normalisation, hedged model calls, rate limiting, multi-day schedule, venues, invitations, .ics, share links, progress
npm run typecheck
npm run lint      # ESLint (Next.js core-web-vitals + TypeScript rules), zero warnings allowed
npm run format    # Prettier
```

GitHub Actions checks formatting, lint, types, tests and a production build on every push.

## Project layout
```
app/                    pages and API routes (plan, ideas, invite, places)
components/plan/        plan dashboard and its tabs
components/invite/      invitation card: catalog, fonts, layout engine, ornaments, PNG export
components/invite/designs/  one file per card design
lib/gemini.ts           Gemini client: model chain, hedged requests, retries
lib/prompts.ts          prompts; lib/planSchema.ts: structured-output schemas
lib/normalise.ts        validation of everything the model returns
lib/                    also input validation, budget maths, storage, sharing, calendar export
tests/                  Vitest unit tests
```

## Deploy (Vercel)
1. Push this repo to GitHub (public).
2. On vercel.com → *Add New Project* → import the repo (framework auto-detected as Next.js).
3. Add environment variable `GEMINI_API_KEY` → Deploy.

## Stack
Next.js 15 (App Router) · React 19 · TypeScript · `@google/genai` (a chain of Gemini Flash models with hedged requests, structured output) · Lucide icons · Vitest · ESLint

## License
MIT. The bundled fonts are under the SIL Open Font License 1.1 (see `public/fonts`).
