import { NextResponse } from "next/server";
import { rankTop, searchPlaces, type PlaceResult } from "@/lib/places";
import { clientIp, createLimiter } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Places calls are billed per request, so identical searches are cached for an hour
// (per serverless instance) and each visitor gets a modest per-minute allowance.
const cache = new Map<string, { at: number; results: PlaceResult[] }>();
const CACHE_MS = 60 * 60 * 1000;
// A plan auto-loads about 10 lists (vendors, venue types, hotels), so allow some headroom.
const limited = createLimiter(40);

/** GET /api/places?q=photographer&city=Jaipur → real businesses with contact details. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  // ?status=1 lets the UI know whether real listings are available, without a billed call.
  if (url.searchParams.has("status")) return NextResponse.json({ configured: !!process.env.GOOGLE_MAPS_API_KEY });
  const q = (url.searchParams.get("q") ?? "").replace(/[^\p{L}\p{N} &'-]/gu, " ").trim().slice(0, 60);
  const city = (url.searchParams.get("city") ?? "").replace(/[^\p{L}\p{N} ,.'-]/gu, " ").trim().slice(0, 80);
  if (!q || !city) return NextResponse.json({ error: "Missing search or city." }, { status: 400 });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ configured: false, results: [] });

  if (limited(clientIp(req))) return NextResponse.json({ error: "Too many searches. Please wait a minute." }, { status: 429 });

  // ?top=4 returns only the best-rated few (rating weighted by review count).
  const top = Math.min(10, Math.max(0, Number(url.searchParams.get("top")) || 0));
  const shape = (r: PlaceResult[]) => (top ? rankTop(r, top) : r);

  const query = `${q} in ${city}`;
  const key = query.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return NextResponse.json({ configured: true, results: shape(hit.results) });

  try {
    const results = await searchPlaces(query, apiKey);
    cache.set(key, { at: Date.now(), results });
    return NextResponse.json({ configured: true, results: shape(results) });
  } catch (err) {
    console.error("places search failed", err);
    return NextResponse.json({ error: "Couldn't load listings from Google right now." }, { status: 502 });
  }
}
