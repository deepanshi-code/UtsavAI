import Link from "next/link";
import HeroScene from "@/components/HeroScene";
import Tilt from "@/components/Tilt";
import { EVENT_META } from "@/lib/events";
import { EVENT_TYPES } from "@/lib/types";

const FEATURES = [
  { icon: "₹", title: "A budget that adds up", text: "Every rupee is accounted for. Edit one category and the rest rebalance automatically, and lock the numbers you've already fixed." },
  { icon: "🗓️", title: "A dated timeline", text: "Tasks are scheduled backwards from your date and never earlier than today. Add them all to Google or Apple Calendar in one click." },
  { icon: "✅", title: "Vendor checklists", text: "What to book and what to ask each vendor before you pay, prioritised into must-haves and nice-to-haves." },
  { icon: "🪔", title: "Rooted in your traditions", text: "Regional customs, local food and city-aware pricing, without assuming your religion or community." },
  { icon: "💬", title: "Refine in plain English", text: "\"Cut the budget by 20%\" or \"make it plastic-free\": the plan updates and keeps everything else." },
  { icon: "🔗", title: "Share & export", text: "Send a link to family, print a PDF, or keep your plans saved in this browser." },
];

const STEPS = [
  { title: "Pick your occasion", text: "Wedding, birthday, puja or society mela." },
  { title: "Set date, guests & budget", text: "Sliders show your per-guest spend as you go." },
  { title: "Tell us what matters", text: "Food, rituals, accessibility, must-haves." },
  { title: "Get an editable plan", text: "Budget, timeline, vendors and ideas in seconds." },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <HeroScene />
        <div className="hero-fade" />
        <div className="container">
          <div className="hero-content">
            <span className="eyebrow">✦ AI celebration planner</span>
            <h1>
              Plan your <span className="grad-text">utsav</span>,<br />not your spreadsheet.
            </h1>
            <p className="lead">
              Tell UtsavAI about your wedding, birthday or community event. Get a budget that actually adds up, a
              dated timeline, vendor checklists and ideas built for your city and traditions.
            </p>
            <div className="row">
              <Link href="/plan/new" className="btn btn-primary btn-lg">Start planning, it&apos;s free →</Link>
              <Link href="/#how" className="btn btn-lg">See how it works</Link>
            </div>
            <div className="hero-stats">
              <div><strong>~15s</strong><span>to a full plan</span></div>
              <div><strong>100%</strong><span>budget accounted for</span></div>
              <div><strong>0</strong><span>sign-ups needed</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Features</span>
            <h2>Everything a planner does, in one place</h2>
            <p>Not a chatbot reply: a structured plan you can edit, track and share.</p>
          </div>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <Tilt key={f.title} className="card card-hover">
                <div className="pop-sm">
                  <div className="feature-icon" aria-hidden="true">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </Tilt>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>From idea to plan in four steps</h2>
          </div>
          <div className="steps">
            {STEPS.map((s) => (
              <div key={s.title} className="card step">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Occasions</span>
            <h2>What are you celebrating?</h2>
            <p>Pick one to jump straight into planning.</p>
          </div>
          <div className="type-grid">
            {EVENT_TYPES.map((t) => (
              <Tilt key={t} as="a" href={`/plan/new?type=${t}`} className="card card-hover type-card" max={12}>
                <span className="pop-sm" style={{ display: "block" }}>
                  <span className="emoji" aria-hidden="true">{EVENT_META[t].emoji}</span>
                  <strong>{EVENT_META[t].label}</strong>
                  <span className="muted small" style={{ display: "block", marginTop: 4 }}>{EVENT_META[t].blurb}</span>
                </span>
              </Tilt>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <h2>Your celebration deserves a plan.</h2>
            <p className="muted" style={{ maxWidth: 520, margin: "0 auto 28px" }}>
              Free, no sign-up, and your plans stay in your browser.
            </p>
            <Link href="/plan/new" className="btn btn-primary btn-lg">Create my plan →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
