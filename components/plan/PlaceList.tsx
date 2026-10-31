"use client";

import {
  Award,
  BookmarkCheck,
  BookmarkPlus,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
  Search,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { mapsSearchUrl } from "@/lib/places";
import type { VendorPick } from "@/lib/types";

interface Props {
  /** What to look for, without the city, e.g. "wedding photographer". */
  query: string;
  city: string;
  label?: string;
  /** Load straight away and show only the best-rated few (no button). */
  auto?: boolean;
  top?: number;
  shortlist?: VendorPick[];
  onShortlist?: (next: VendorPick[]) => void;
}

type Result = VendorPick & { reviews?: number };
type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; results: Result[] }
  | { kind: "unconfigured" }
  | { kind: "error"; message: string };

// Each lookup is a billed Places request, so results are remembered for this browser session.
const cacheKey = (q: string, city: string, top: number) =>
  `utsavai.places:${top}:${q.toLowerCase()}|${city.toLowerCase()}`;
function readCache(k: string): State | null {
  try {
    const v = sessionStorage.getItem(k);
    return v ? (JSON.parse(v) as State) : null;
  } catch {
    return null;
  }
}
function writeCache(k: string, s: State) {
  try {
    sessionStorage.setItem(k, JSON.stringify(s));
  } catch {
    // storage full or blocked: just refetch next time
  }
}

/**
 * Real businesses from Google Places with phone numbers, ratings and websites.
 * In auto mode it shows the city's top-rated few immediately; otherwise it waits
 * for a click. Without a Places key it links to the same Google Maps search,
 * and it never shows businesses that didn't come from Google.
 */
export default function PlaceList({
  query,
  city,
  label,
  auto = false,
  top = 4,
  shortlist = [],
  onShortlist,
}: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const mapsUrl = mapsSearchUrl(`${query} in ${city}`);
  const picked = (name: string) => shortlist.some((s) => s.name === name);

  async function load() {
    const k = cacheKey(query, city, auto ? top : 0);
    const cached = readCache(k);
    if (cached) return setState(cached);
    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/places?q=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}${auto ? `&top=${top}` : ""}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't load listings.");
      const next: State =
        data.configured === false
          ? { kind: "unconfigured" }
          : { kind: "results", results: data.results ?? [] };
      writeCache(k, next);
      setState(next);
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Couldn't load listings." });
    }
  }

  useEffect(() => {
    if (auto) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the search itself changes
  }, [auto, query, city, top]);

  const toggle = (p: Result) => {
    if (!onShortlist) return;
    const { name, phone, address, rating, mapsUrl: m, website } = p;
    onShortlist(
      picked(name)
        ? shortlist.filter((s) => s.name !== name)
        : [...shortlist, { name, phone, address, rating, mapsUrl: m, website }],
    );
  };

  return (
    <div className="place-list">
      {shortlist.length > 0 && (
        <>
          <div className="place-heading">
            <BookmarkCheck size={14} aria-hidden="true" /> Your shortlist
          </div>
          <ul className="places" aria-label="Shortlisted">
            {shortlist.map((p) => (
              <PlaceRow key={p.name} p={p} picked onToggle={onShortlist ? () => toggle(p) : undefined} />
            ))}
          </ul>
        </>
      )}

      {state.kind === "idle" && !auto && (
        <button type="button" className="btn btn-sm" onClick={load}>
          <Search size={14} aria-hidden="true" /> {label ?? `Find ${query} in ${city}`}
        </button>
      )}
      {state.kind === "loading" && (
        <div className="skeleton" style={{ height: auto ? 180 : 120 }} aria-label="Loading listings" />
      )}
      {state.kind === "error" && (
        <p className="small" style={{ color: "var(--danger-text)" }}>
          {state.message}{" "}
          <a className="link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
            Search on Google Maps
          </a>
        </p>
      )}
      {state.kind === "unconfigured" && (
        <a className="btn btn-sm" href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <MapPin size={14} aria-hidden="true" /> {query} in {city} on Google Maps{" "}
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      )}
      {state.kind === "results" &&
        (state.results.length === 0 ? (
          <p className="small muted">
            No listings found.{" "}
            <a className="link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
              Try Google Maps
            </a>
          </p>
        ) : (
          <>
            {auto && (
              <div className="place-heading">
                <Award size={14} aria-hidden="true" /> Top rated in {city}
              </div>
            )}
            <ul className="places">
              {state.results
                .filter((p) => !picked(p.name))
                .map((p, i) => (
                  <PlaceRow
                    key={p.name}
                    p={p}
                    rank={auto ? i + 1 : undefined}
                    reviews={p.reviews}
                    onToggle={onShortlist ? () => toggle(p) : undefined}
                  />
                ))}
            </ul>
            <p className="faint small m-0 mt-4">
              From Google, ranked by rating and number of reviews.{" "}
              <a className="link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                See more
              </a>
            </p>
          </>
        ))}
    </div>
  );
}

function PlaceRow({
  p,
  picked,
  rank,
  reviews,
  onToggle,
}: {
  p: VendorPick;
  picked?: boolean;
  rank?: number;
  reviews?: number;
  onToggle?: () => void;
}) {
  return (
    <li className="place" data-picked={!!picked}>
      {rank && (
        <span className="place-rank" aria-label={`Rank ${rank}`}>
          {rank}
        </span>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="row gap-8">
          <strong>{p.name}</strong>
          {typeof p.rating === "number" && (
            <span className="badge">
              <Star size={12} aria-hidden="true" /> {p.rating.toFixed(1)}
              {reviews ? ` · ${reviews.toLocaleString("en-IN")} reviews` : ""}
            </span>
          )}
        </div>
        {p.address && <div className="faint small">{p.address}</div>}
        <div className="row small" style={{ gap: 14, marginTop: 6 }}>
          {p.phone && (
            <a className="link" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>
              <Phone size={13} aria-hidden="true" /> {p.phone}
            </a>
          )}
          {p.website && (
            <a className="link" href={p.website} target="_blank" rel="noopener noreferrer">
              <Globe size={13} aria-hidden="true" /> Website
            </a>
          )}
          {p.mapsUrl && (
            <a className="link" href={p.mapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin size={13} aria-hidden="true" /> Map
            </a>
          )}
        </div>
      </div>
      {onToggle && (
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={onToggle}
          aria-pressed={!!picked}
          aria-label={`${picked ? "Remove" : "Shortlist"} ${p.name}`}
        >
          {picked ? (
            <BookmarkCheck size={16} aria-hidden="true" />
          ) : (
            <BookmarkPlus size={16} aria-hidden="true" />
          )}{" "}
          {picked ? "Shortlisted" : "Shortlist"}
        </button>
      )}
    </li>
  );
}
