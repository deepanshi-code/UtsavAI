import type { VendorPick } from "./types";

/**
 * Real businesses from Google Places API (New) Text Search:
 * https://developers.google.com/maps/documentation/places/web-service/text-search
 * Phone, rating and website are Enterprise-tier fields, so this needs a key from a
 * Google Cloud project with the Places API enabled (GOOGLE_MAPS_API_KEY).
 */
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELDS = [
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.businessStatus",
].join(",");

interface ApiPlace {
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  businessStatus?: string;
}

export interface PlaceResult extends VendorPick {
  reviews?: number;
}

/** Only http(s) links from the API are passed on, never anything else. */
const safeUrl = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : undefined);

export function toResults(places: ApiPlace[] = []): PlaceResult[] {
  return places
    .filter((p) => p.displayName?.text && p.businessStatus !== "CLOSED_PERMANENTLY")
    .map((p) => ({
      name: p.displayName!.text!.slice(0, 100),
      address: p.formattedAddress?.slice(0, 200),
      phone: (p.nationalPhoneNumber || p.internationalPhoneNumber)?.slice(0, 30),
      rating: typeof p.rating === "number" ? p.rating : undefined,
      reviews: typeof p.userRatingCount === "number" ? p.userRatingCount : undefined,
      mapsUrl: safeUrl(p.googleMapsUri),
      website: safeUrl(p.websiteUri),
    }));
}

export async function searchPlaces(query: string, apiKey: string): Promise<PlaceResult[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELDS },
    body: JSON.stringify({ textQuery: query, pageSize: 12, regionCode: "IN", languageCode: "en" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw Object.assign(new Error(`Places API ${res.status}: ${detail.slice(0, 200)}`), { status: res.status });
  }
  const data = (await res.json()) as { places?: ApiPlace[] };
  return toResults(data.places);
}

/**
 * "Top" businesses: rating weighted by how many people rated them, so a 4.9 from
 * 8 reviews doesn't beat a 4.6 from 900. Places with very few reviews go last.
 */
export function rankTop(results: PlaceResult[], n: number): PlaceResult[] {
  const score = (p: PlaceResult) => (p.rating ?? 0) * Math.log10((p.reviews ?? 0) + 1) * ((p.reviews ?? 0) >= 10 ? 1 : 0.5);
  return [...results].sort((a, b) => score(b) - score(a)).slice(0, n);
}

/** Documented, keyless Google Maps search link (https://developers.google.com/maps/documentation/urls). */
export const mapsSearchUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
