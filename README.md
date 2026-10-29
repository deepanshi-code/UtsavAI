# UtsavAI

A GenAI planning assistant for Indian weddings, birthdays, festivals and community events.
Describe your event and get a **budget that actually adds up**, a **dated timeline**, a
**vendor checklist** and **personalised ideas and customs**, all editable and exportable.

Built for PromptWars Virtual, Challenge 05: Celebration & Event Planner.

**Live:** https://aiutsav-gold.vercel.app

## Pages

| Route | What it's for |
|---|---|
| `/` | Landing page with a Three.js hero scene (pauses off-screen, still frame for reduced-motion users) |
| `/plan/new` | 4-step wizard: occasion → date, city, guests & budget (log-scale sliders, live per-guest cost) → style & needs → review |
| `/plan/[id]` | Plan dashboard: countdown & progress stats, tabs for Overview, Budget, Timeline, Vendors, Ideas; refine drawer; share, calendar, print |
| `/plans` | Saved plans with search, sort and progress |
| `/share#p=…` | Opens a shared plan; "Save to my plans" makes your own editable copy |

Plans are saved in the browser (localStorage), so no account or database is needed.

## What it does

| Feature | How |
|---|---|
| Structured plan, not a chat blob | Gemini returns JSON constrained by a response schema ([lib/gemini.ts](lib/gemini.ts)); the UI renders it as tables and checklists |
| Budget that sums correctly | The server rescales model output so categories add up to your exact total (LLMs are unreliable at arithmetic) |
| Live budget rebalancing | Edit any category and it locks; the unlocked ones rebalance proportionally. Overspend is flagged, never silently fixed ([lib/budget.ts](lib/budget.ts)) |
| Dated timeline | Tasks are stored as "days before event", clamped to time actually remaining, shown with real dates and overdue flags |
| Refine in plain English | "Cut budget by 20%", "make it eco-friendly": the current plan and your change go back to Gemini |
| Progress tracking | Tick off tasks and vendors; progress survives reloads and refines (matched by task/vendor name) |
| Indian context | INR with lakh formatting, city-aware pricing, regional customs only when they fit (never assumes religion) |
| Export & share | Print/save as PDF, add the timeline to Google/Apple Calendar (.ics), copy a share link |

### Design decisions
- **Share links live in the URL fragment** (`#p=…`, lz-compressed). Fragments are never sent to the server, so there's no database to run and shared plans aren't logged.
- **Model output is validated, not trusted.** `normalisePlan` drops malformed rows, caps string lengths, clamps dates and fixes the budget sum. Plans sent back for refinement are re-normalised and size-capped.
- **Prompt-injection hygiene.** User text is fenced in `<event_details>` and the system prompt says to treat it as data. This reduces risk but doesn't eliminate it, which is why output is also validated.
- **Model fallback within a time budget.** During testing the newest Flash models were often overloaded (503s, 60s+ queues). The server tries `gemini-3.5-flash` first with a 30s cap, then `gemini-3.1-flash-lite`, all inside Vercel's 60s function limit. Thinking is set to LOW because a schema-shaped plan doesn't need long reasoning.
- **No guessed facts.** The model once titled a 30-guest party a "30th birthday". The prompt now says "Guest count: 30 people" and passes an explicit "Age / milestone: not specified (do not assume…)" unless the user fills in the optional milestone field.
- **Accessible interactions.** ARIA tabs with arrow-key navigation, radio/checkbox roles on custom controls, focus moved to each wizard step's heading, `prefers-reduced-motion` respected throughout, 3D tilt disabled on touch.
- **API key stays server-side** in a Next.js route handler; inputs are validated and the route has a best-effort rate limit.
- **Runs without a key.** If `GEMINI_API_KEY` is unset, the API returns a clearly labelled sample plan so the UI can be developed and tested offline.

### Known limitations
- The rate limit is per serverless instance (in memory), so it blunts bursts but isn't a hard cap.
- Prices come from the model's general knowledge, not live vendor data. The UI says to verify them.
- Refining regenerates the plan, so manual budget locks are reset.
- Saved plans live in one browser; use a share link to move a plan to another device.

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your key from https://aistudio.google.com/apikey
npm run dev                  # http://localhost:3000
```

```bash
npm test          # 49 unit tests: budget maths, validation, prompt, normalisation, retries, .ics, share links, progress
npm run typecheck
```

## Deploy (Vercel)
1. Push this repo to GitHub (public).
2. On vercel.com → *Add New Project* → import the repo (framework auto-detected as Next.js).
3. Add environment variable `GEMINI_API_KEY` → Deploy.

## Stack
Next.js 15 (App Router) · React 19 · TypeScript · Three.js · `@google/genai` (Gemini 3.5 Flash with 3.1 Flash-Lite fallback, structured output) · Vitest
