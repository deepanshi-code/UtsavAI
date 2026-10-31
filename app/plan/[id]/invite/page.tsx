"use client";

import { Download, ExternalLink, Eye, RotateCcw, Share2, Shuffle, Users, WandSparkles, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import InviteCard, { PALETTES, resolvePalette, resolveTemplate, svgToPng, TEMPLATES } from "@/components/invite/InviteCard";
import { useToast } from "@/components/Toast";
import { addDays, formatDate } from "@/lib/format";
import {
  composeMessage,
  defaultInvite,
  designFor,
  inviteFacts,
  LANGUAGES,
  MAIN_KEY,
  occasionsFor,
  TONES,
  type InviteOccasion,
  type InviteOptions,
  type InviteText,
} from "@/lib/invite";
import { getPlan, savePlan, type SavedInvite, type SavedPlan } from "@/lib/store";

const newSeed = () => Math.floor(Math.random() * 1e9);
// Hosts, RSVP, tone and language are the same on every card; venue and time differ per function.
const SHARED: (keyof InviteOptions)[] = ["hosts", "rsvp", "tone", "language"];

/** Older saved invites kept date/venue inside "details" and had a separate message; drop both. */
function migrate(invite: SavedInvite): SavedInvite {
  // Designs and palettes from earlier versions map to their closest current ones.
  const design = { template: resolveTemplate(invite.template), palette: resolvePalette(invite.palette) };
  if (!("whatsapp" in invite.text)) return { ...invite, ...design };
  const text: InviteText & { whatsapp?: unknown } = { ...invite.text };
  delete text.whatsapp;
  return { ...invite, ...design, text: { ...text, details: "" } };
}

/** Every occasion gets an invitation; new ones copy the shared details from the main card. */
function ensureInvites(p: SavedPlan, occasions: InviteOccasion[]): Record<string, SavedInvite> {
  const existing: Record<string, SavedInvite> = { ...(p.invites ?? (p.invite ? { [MAIN_KEY]: p.invite } : {})) };
  for (const k of Object.keys(existing)) existing[k] = migrate(existing[k]);
  const base = existing[MAIN_KEY]?.options ?? { tone: "Warm", language: "English", hosts: "", venue: "", time: "", rsvp: "" };
  for (const occ of occasions) {
    if (existing[occ.key]) continue;
    const { template, palette } = designFor(p.input.eventType, occ, `${p.input.preferences} ${p.input.milestone ?? ""}`);
    existing[occ.key] = {
      options: { ...base, time: "", venue: occ.key === MAIN_KEY ? base.venue : "" },
      text: defaultInvite(p.input, p.plan, occ),
      template,
      palette,
      seed: newSeed(),
    };
  }
  return existing;
}

export default function InvitePage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const [saved, setSaved] = useState<SavedPlan | null | undefined>(undefined);
  const [invites, setInvites] = useState<Record<string, SavedInvite>>({});
  const [activeKey, setActiveKey] = useState(MAIN_KEY);
  const [writing, setWriting] = useState<string | null>(null); // progress label while the AI writes
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [rendering, setRendering] = useState(false);

  const occasions = saved ? occasionsFor(saved.input, saved.plan.schedule ?? []) : [];

  useEffect(() => {
    const p = getPlan(id) ?? null;
    setSaved(p);
    if (!p) return;
    const occ = occasionsFor(p.input, p.plan.schedule ?? []);
    setInvites(ensureInvites(p, occ));
    // Weddings open on the first function, since that's usually the first card to send.
    setActiveKey(occ.length > 1 ? occ[1].key : MAIN_KEY);
  }, [id]);

  // Keep the designs with the plan so they're there next time.
  useEffect(() => {
    if (saved && Object.keys(invites).length) savePlan({ ...saved, invites, invite: undefined });
  }, [saved, invites]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreview(null);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const inv = invites[activeKey];
  const occ = occasions.find((o) => o.key === activeKey) ?? occasions[0];

  if (saved === undefined || (saved && !inv)) return <div className="page container"><div className="skeleton" style={{ height: 520 }} /></div>;
  if (saved === null || !inv || !occ) {
    return (
      <div className="page container">
        <div className="card empty">
          <h2>Plan not found</h2>
          <p className="muted">Open the plan from My plans, then choose Invitation.</p>
          <Link href="/plans" className="btn btn-primary">My plans</Link>
        </div>
      </div>
    );
  }

  const facts = inviteFacts(saved.input, inv.options, occ);
  const message = inv.message ?? composeMessage(inv.text, facts);
  const patch = (k: string, fn: (x: SavedInvite) => SavedInvite) => setInvites((all) => (all[k] ? { ...all, [k]: fn(all[k]) } : all));
  const setOpt = <K extends keyof InviteOptions>(k: K, v: InviteOptions[K]) =>
    setInvites((all) => {
      const next = { ...all };
      // Shared details change on every card at once.
      for (const key of SHARED.includes(k) ? Object.keys(next) : [activeKey]) next[key] = { ...next[key], options: { ...next[key].options, [k]: v } };
      return next;
    });
  const setText = <K extends keyof InviteText>(k: K, v: string) => patch(activeKey, (x) => ({ ...x, text: { ...x.text, [k]: v } }));
  const slug = `${saved.plan.title || "invitation"}${occ.key === MAIN_KEY ? "" : `-${occ.title}`}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "invitation";
  const fileName = `${slug}-invite.png`;

  async function writeOne(o: InviteOccasion) {
    if (!saved) return;
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: saved.input,
        plan: { title: saved.plan.title, schedule: saved.plan.schedule ?? [] },
        options: invites[o.key].options,
        occasion: o.key === MAIN_KEY ? undefined : o,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't write the invitation.");
    // New wording also resets a hand-edited message so it matches the card again.
    patch(o.key, (x) => ({ ...x, text: data.invite, message: undefined }));
    return data.source as string;
  }

  async function write(all: boolean) {
    const list = all ? occasions : [occ];
    try {
      for (const [i, o] of list.entries()) {
        setWriting(all ? `Writing ${i + 1} of ${list.length}: ${o.key === MAIN_KEY ? "main card" : o.title}…` : "Writing… (about 10s)");
        await writeOne(o);
      }
      toast(all ? `Wording written for all ${list.length} invitations.` : "New wording written.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't write the invitation.", "error");
    } finally {
      setWriting(null);
    }
  }

  async function openPreview() {
    if (!svgRef.current) return;
    setRendering(true);
    try {
      const blob = await svgToPng(svgRef.current);
      setPreview({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't render the card.", "error");
    } finally {
      setRendering(false);
    }
  }

  function download() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.url;
    a.download = fileName;
    a.click();
    toast("Invitation saved as PNG.", "success");
  }

  async function share() {
    if (!preview) return;
    const file = new File([preview.blob], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: message });
      } catch {
        // the user closed the share sheet
      }
    } else {
      download();
      toast("Sharing images isn't supported in this browser, so it was downloaded instead.", "info");
    }
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast("Message copied.", "success");
    } catch {
      window.prompt("Copy this message:", message);
    }
  };

  return (
    <div className="page container">
      <nav className="small faint no-print" aria-label="Breadcrumb" style={{ marginBottom: 12 }}>
        <Link href="/plans">My plans</Link> / <Link href={`/plan/${saved.id}`}>{saved.plan.title}</Link> / <span>Invitations</span>
      </nav>
      <div className="section-head" style={{ marginBottom: 20 }}>
        <span className="eyebrow">Invitation studio</span>
        <h1 className="page-title">{occasions.length > 1 ? "An invitation for every function" : "Design your invitation"}</h1>
        <p className="muted">
          {occasions.length > 1
            ? "Each function has its own card, guest list, date and look. Fill in the details, let AI write the words, then preview and download."
            : "Fill in the details and they appear on the card as you type. Let AI write the wording, pick a design, then preview and download."}
        </p>
      </div>

      {occasions.length > 1 && (
        <div className="occasion-bar" role="group" aria-label="Which invitation">
          {occasions.map((o) => {
            const design = invites[o.key];
            const pal = PALETTES.find((p) => p.id === design?.palette);
            return (
              <button key={o.key} type="button" aria-pressed={o.key === activeKey} className="occasion" onClick={() => setActiveKey(o.key)}>
                <span className="occasion-swatch" style={{ background: pal ? `linear-gradient(135deg, ${pal.bg}, ${pal.accent})` : undefined }} aria-hidden="true" />
                <span>
                  <strong>{o.key === MAIN_KEY ? "Whole celebration" : o.title}</strong>
                  <span className="faint small" style={{ display: "block" }}>
                    {o.key === MAIN_KEY ? "Save the date" : `Day ${o.day} · ${formatDate(addDays(saved.input.date, o.day - 1))}`}
                    {o.guests ? ` · ${o.guests} guests` : ""}
                  </span>
                </span>
              </button>
            );
          })}
          <button type="button" className="btn btn-sm" style={{ alignSelf: "center" }} disabled={!!writing} onClick={() => write(true)}>
            <WandSparkles size={15} aria-hidden="true" /> Write all with AI
          </button>
        </div>
      )}
      {writing && <p className="muted small" role="status" style={{ marginTop: 0 }}>{writing}</p>}

      <div className="studio">
        <div className="stack">
          <section className="card" aria-labelledby="words-h">
            <div className="row">
              <h2 id="words-h" className="h3" style={{ margin: 0 }}>1. {occ.key === MAIN_KEY ? "Event details" : `${occ.title} details`}</h2>
              <span className="spacer" />
              {occ.guests ? <span className="badge"><Users size={13} aria-hidden="true" /> For about {occ.guests} guests</span> : null}
            </div>
            <p className="muted small">Shown on the card exactly as entered.{occasions.length > 1 ? " Hosts and RSVP apply to every card." : ""}</p>
            <div className="grid-2">
              <div>
                <label htmlFor="hosts">Hosted by</label>
                <input id="hosts" type="text" maxLength={80} placeholder="e.g. The Sharma family" value={inv.options.hosts} onChange={(e) => setOpt("hosts", e.target.value)} />
              </div>
              <div>
                <label htmlFor="time">Time</label>
                <input id="time" type="text" maxLength={40} placeholder={occ.time || "e.g. 7:00 PM onwards"} value={inv.options.time} onChange={(e) => setOpt("time", e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="venue">Venue &amp; address</label>
              <input id="venue" type="text" maxLength={140} placeholder={`e.g. a hall or home address in ${saved.input.city}`} value={inv.options.venue} onChange={(e) => setOpt("venue", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="rsvp">RSVP <span className="hint">(name and/or number, optional)</span></label>
              <input id="rsvp" type="text" maxLength={100} placeholder="e.g. Riya, 98xxxxxx10" value={inv.options.rsvp} onChange={(e) => setOpt("rsvp", e.target.value)} />
            </div>
          </section>

          <section className="card" aria-labelledby="ai-h">
            <h2 id="ai-h" className="h3">2. Wording</h2>
            <div className="field" style={{ marginTop: 8 }}>
              <span className="label" id="tone-l">Tone</span>
              <div className="chips" role="radiogroup" aria-labelledby="tone-l">
                {TONES.map((t) => <button key={t} type="button" role="radio" aria-checked={inv.options.tone === t} className="chip" onClick={() => setOpt("tone", t)}>{t}</button>)}
              </div>
            </div>
            <div className="field">
              <span className="label" id="lang-l">Language</span>
              <div className="chips" role="radiogroup" aria-labelledby="lang-l">
                {LANGUAGES.map((l) => <button key={l} type="button" role="radio" aria-checked={inv.options.language === l} className="chip" onClick={() => setOpt("language", l)}>{l}</button>)}
              </div>
            </div>
            <button type="button" className="btn btn-primary" style={{ marginTop: 20, width: "100%" }} onClick={() => write(false)} disabled={!!writing}>
              {writing ? "Writing…" : <><WandSparkles size={17} aria-hidden="true" /> Write {occ.key === MAIN_KEY ? "this card" : `the ${occ.title} card`} with AI</>}
            </button>
            {(["headline", "names", "body", "details", "closing"] as const).map((k) => (
              <div className="field" key={k} style={{ marginTop: 14 }}>
                <label htmlFor={`t-${k}`}>
                  {{ headline: "Headline", names: "Main line", body: "Message", details: "Extra details", closing: "Closing line" }[k]}
                  {k === "details" && <span className="hint"> (optional)</span>}
                </label>
                {k === "body" || k === "details" ? (
                  <textarea id={`t-${k}`} rows={3} style={{ minHeight: 70 }} value={inv.text[k]} onChange={(e) => setText(k, e.target.value)} />
                ) : (
                  <input id={`t-${k}`} type="text" value={inv.text[k]} onChange={(e) => setText(k, e.target.value)} />
                )}
              </div>
            ))}
          </section>

          <section className="card" aria-labelledby="design-h">
            <h2 id="design-h" className="h3">3. Design</h2>
            <span className="label" id="tpl-l">Style</span>
            <div className="chips" role="radiogroup" aria-labelledby="tpl-l">
              {TEMPLATES.map((t) => <button key={t.id} type="button" role="radio" aria-checked={inv.template === t.id} className="chip" onClick={() => patch(activeKey, (x) => ({ ...x, template: t.id }))}>{t.label}</button>)}
            </div>
            <span className="label" id="pal-l" style={{ marginTop: 16 }}>Colours</span>
            <div className="palette-row" role="radiogroup" aria-labelledby="pal-l">
              {PALETTES.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={inv.palette === p.id} aria-label={p.label} title={p.label} className="palette-swatch" onClick={() => patch(activeKey, (x) => ({ ...x, palette: p.id }))}>
                  <span style={{ background: p.bg }} /><span style={{ background: p.accent }} /><span style={{ background: p.accent2 }} />
                </button>
              ))}
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <button type="button" className="btn" onClick={() => { patch(activeKey, (x) => ({ ...x, seed: newSeed() })); toast("New pattern applied.", "success"); }}><Shuffle size={16} aria-hidden="true" /> New pattern</button>
              {occ.key !== MAIN_KEY && (
                <button type="button" className="btn btn-ghost" onClick={() => patch(activeKey, (x) => ({ ...x, ...designFor(saved.input.eventType, occ, `${saved.input.preferences} ${saved.input.milestone ?? ""}`) }))}>
                  <RotateCcw size={15} aria-hidden="true" /> Match the {occ.title} theme
                </button>
              )}
            </div>
          </section>
        </div>

        <div className="studio-preview">
          <div className="invite-frame">
            <InviteCard ref={svgRef} template={inv.template} palette={inv.palette} seed={inv.seed} text={inv.text} facts={facts} />
          </div>
          <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 16, width: "100%" }} onClick={openPreview} disabled={rendering}>
            <Eye size={18} aria-hidden="true" /> {rendering ? "Preparing preview…" : "Preview & download"}
          </button>

          <section className="card" style={{ marginTop: 20 }} aria-labelledby="wa-h">
            <div className="row">
              <h2 id="wa-h" className="h3" style={{ margin: 0 }}>Text message</h2>
              <span className="spacer" />
              {inv.message !== undefined && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => patch(activeKey, (x) => ({ ...x, message: undefined }))}>
                  <RotateCcw size={14} aria-hidden="true" /> Reset to match card
                </button>
              )}
            </div>
            <p className="muted small">
              {inv.message === undefined ? "Updates with the card. Edit it here if you want different wording." : "Edited by you, so it no longer updates with the card."}
            </p>
            <textarea aria-labelledby="wa-h" rows={9} value={message} onChange={(e) => patch(activeKey, (x) => ({ ...x, message: e.target.value }))} />
            <div className="row" style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-sm" onClick={copyMessage}>Copy message</button>
              <a className="btn btn-sm" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Open in WhatsApp <ExternalLink size={14} aria-hidden="true" /></a>
            </div>
          </section>
        </div>
      </div>

      {preview && (
        <>
          <div className="drawer-backdrop" onClick={() => setPreview(null)} />
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="preview-h">
            <div className="row" style={{ marginBottom: 14 }}>
              <h2 id="preview-h" style={{ fontSize: "1.3rem", margin: 0 }}>Preview{occ.key === MAIN_KEY ? "" : `: ${occ.title}`}</h2>
              <span className="spacer" />
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Close preview" onClick={() => setPreview(null)} autoFocus><X size={20} aria-hidden="true" /></button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- a local blob URL, not a remote image */}
            <img className="modal-image" src={preview.url} alt={`Invitation card: ${inv.text.headline}, ${inv.text.names}`} />
            <p className="muted small" style={{ margin: "12px 0" }}>This is exactly the image that will be saved (1080 × 1350 px, PNG).</p>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={download}><Download size={17} aria-hidden="true" /> Download PNG</button>
              <button type="button" className="btn" onClick={share}><Share2 size={17} aria-hidden="true" /> Share</button>
              <span className="spacer" />
              <button type="button" className="btn btn-ghost" onClick={() => setPreview(null)}>Keep editing</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
