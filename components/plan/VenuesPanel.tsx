"use client";

import { ExternalLink, Users } from "lucide-react";
import PlaceList from "./PlaceList";
import { useState } from "react";
import type { EventType, VenueType } from "@/lib/types";

// Used when a plan predates venue suggestions (older saved or shared plans).
const FALLBACK: Record<EventType, string[]> = {
  wedding: ["banquet hall", "wedding lawn", "resort for weddings", "hotel ballroom"],
  birthday: ["party hall", "rooftop restaurant", "kids play cafe", "banquet hall"],
  community: ["community hall", "convention centre", "open ground for events"],
  festival: ["community hall", "event ground", "banquet hall"],
  corporate: ["conference venue", "resort for offsite", "hotel banquet"],
  other: ["party hall", "banquet hall", "restaurant private dining"],
};

/** Google Maps URLs (documented, keyless): https://developers.google.com/maps/documentation/urls */
export const mapsSearchUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const embedUrl = (q: string) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;

interface Props {
  city: string;
  eventType: EventType;
  venueTypes: VenueType[];
}

/**
 * The AI suggests *kinds* of venue; real venues come from a live Google Map
 * search, so nothing shown here is invented by the model.
 */
export default function VenuesPanel({ city, eventType, venueTypes }: Props) {
  const types: VenueType[] = venueTypes.length
    ? venueTypes
    : FALLBACK[eventType].map((q) => ({ type: q[0].toUpperCase() + q.slice(1), why: "", capacity: "", priceRange: "", searchQuery: q }));
  const [active, setActive] = useState(0);
  const [area, setArea] = useState("");
  const current = types[Math.min(active, types.length - 1)];
  const query = `${current.searchQuery} near ${area.trim() ? `${area.trim()}, ` : ""}${city}`;

  return (
    <div className="stack">
      <div className="venue-layout">
        <section className="card" aria-labelledby="vt-h">
          <h3 id="vt-h">Venue types that fit</h3>
          <p className="muted small">Suggested for your guest count, budget and style. Pick one to see real venues on the map.</p>
          <div className="venue-types" role="radiogroup" aria-label="Venue type">
            {types.map((v, i) => (
              <button
                key={v.type + i}
                type="button"
                role="radio"
                aria-checked={i === active}
                className="venue-type"
                onClick={() => setActive(i)}
              >
                <strong>{v.type}</strong>
                {(v.capacity || v.priceRange) && (
                  <span className="row small" style={{ gap: 6, marginTop: 6 }}>
                    {v.capacity && <span className="badge"><Users size={13} aria-hidden="true" /> {v.capacity}</span>}
                    {v.priceRange && <span className="badge">₹ {v.priceRange.replace(/^(INR|₹)\s*/i, "")}</span>}
                  </span>
                )}
                {v.why && <span className="muted small" style={{ display: "block", marginTop: 6 }}>{v.why}</span>}
              </button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 18 }}>
            <label htmlFor="area">Narrow to an area <span className="hint">(optional)</span></label>
            <input id="area" type="text" value={area} maxLength={60} placeholder={`e.g. a locality in ${city}`} onChange={(e) => setArea(e.target.value)} />
          </div>
        </section>

        <section className="card map-card" aria-label={`Map of ${current.type} in ${city}`}>
          <div className="row" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>{current.type} in {area.trim() || city}</h3>
              <p className="muted small" style={{ margin: "2px 0 0" }}>Live results from Google Maps</p>
            </div>
            <span className="spacer" />
            <a className="btn btn-sm" href={mapsSearchUrl(query)} target="_blank" rel="noopener noreferrer">Open in Google Maps <ExternalLink size={14} aria-hidden="true" /></a>
          </div>
          <iframe
            key={query}
            className="map-frame"
            title={`Google Map: ${query}`}
            src={embedUrl(query)}
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div style={{ marginTop: 14 }}>
            <PlaceList key={query} auto top={4} query={current.searchQuery} city={area.trim() ? `${area.trim()}, ${city}` : city} />
          </div>
        </section>
      </div>
      <p className="faint small">
        Venue listings, ratings and contact details come from Google Maps. Always confirm availability, capacity and prices with the venue directly.
      </p>
    </div>
  );
}
