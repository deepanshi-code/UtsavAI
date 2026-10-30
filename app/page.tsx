import { ArrowRight, CalendarDays, ListChecks, Mail, MapPin, Landmark, Wallet } from "lucide-react";
import Link from "next/link";
import PlannerHero from "@/components/PlannerHero";
import Tilt from "@/components/Tilt";
import { EVENT_META } from "@/lib/events";
import { EVENT_TYPES } from "@/lib/types";

const FEATURES = [
  { icon: Wallet, title: "A budget that adds up", text: "Every rupee is allocated. Change one category and the rest rebalance, so you always know where you stand." },
  { icon: CalendarDays, title: "Day-by-day schedule", text: "Multi-day celebrations get a dated schedule of every function, from Haldi in the morning to the Sangeet at night." },
  { icon: MapPin, title: "Venues in your city", text: "Browse real banquet halls, lawns and party spaces on a live map, matched to your guest count and budget." },
  { icon: ListChecks, title: "Tasks and vendors", text: "What to book and when, plus the questions to ask every vendor. Track progress as you go." },
  { icon: Mail, title: "Invitations", text: "Wording in English, Hindi or Hinglish, a choice of designs, and a ready-to-send WhatsApp message." },
  { icon: Landmark, title: "Rooted in tradition", text: "Regional customs and local cuisine where they fit, without assuming anything about your family." },
];

const STEPS = [
  { title: "Choose the occasion", text: "Wedding, birthday, puja or community event." },
  { title: "Set dates and guests", text: "A single evening or several days of functions." },
  { title: "Share your priorities", text: "Food, rituals, accessibility and must-haves." },
  { title: "Get your plan", text: "Budget, schedule, venues, tasks and invitation." },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <span className="eyebrow">AI celebration planner</span>
            <h1>
              Plan every celebration with <em className="accent-serif">confidence</em>.
            </h1>
            <p className="lead">
              UtsavAI turns your occasion, date, guest list and budget into a complete plan: a budget that adds up,
              a day-by-day schedule, venues in your city, a task list and an invitation, ready in under a minute.
            </p>
            <div className="row">
              <Link href="/plan/new" className="btn btn-primary btn-lg">Start planning <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/#how" className="btn btn-lg">How it works</Link>
            </div>
            <dl className="hero-stats">
              <div><dt>Under a minute</dt><dd>to a complete plan</dd></div>
              <div><dt>Free</dt><dd>no account needed</dd></div>
              <div><dt>6 occasions</dt><dd>weddings to festivals</dd></div>
            </dl>
          </div>
          <PlannerHero />
        </div>
      </section>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Start here</span>
            <h2>What are you celebrating?</h2>
          </div>
          <div className="type-grid">
            {EVENT_TYPES.map((t) => {
              const Icon = EVENT_META[t].icon;
              return (
                <Tilt key={t} as="a" href={`/plan/new?type=${t}`} className="card card-hover type-card" max={3}>
                  <span className="icon-tile" aria-hidden="true"><Icon size={22} strokeWidth={1.75} /></span>
                  <strong>{EVENT_META[t].label}</strong>
                  <span className="muted small" style={{ display: "block", marginTop: 4 }}>{EVENT_META[t].blurb}</span>
                </Tilt>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Features</span>
            <h2>Everything you need in one plan</h2>
            <p>Structured, editable and shareable, built for the way Indian celebrations actually happen.</p>
          </div>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <span className="icon-tile" aria-hidden="true"><f.icon size={22} strokeWidth={1.75} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>Four steps to a complete plan</h2>
          </div>
          <ol className="steps">
            {STEPS.map((s) => (
              <li key={s.title} className="card step">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <h2>Start planning your celebration</h2>
            <p className="muted" style={{ maxWidth: 520, margin: "0 auto 28px" }}>
              Free to use, no account required. Your plans are saved in your browser.
            </p>
            <Link href="/plan/new" className="btn btn-primary btn-lg">Create a plan <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
