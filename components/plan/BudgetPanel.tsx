"use client";

import { Lock, LockOpen, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { editCategory, rebalance, sumBudget } from "@/lib/budget";
import { formatINR } from "@/lib/format";
import type { BudgetItem } from "@/lib/types";

// The first three follow the active theme; the rest are fixed, distinct hues that read on every theme.
export const CATEGORY_COLORS = [
  "var(--accent)",
  "var(--accent-2)",
  "var(--accent-3)",
  "#2dd4bf",
  "#f59e0b",
  "#a3e635",
  "#fb7185",
  "#818cf8",
  "#22d3ee",
  "#c084fc",
  "#facc15",
  "#34d399",
];
export const colorAt = (i: number) => CATEGORY_COLORS[i % CATEGORY_COLORS.length];

function arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0),
    [x1, y1] = p(r1, a1),
    [x2, y2] = p(r0, a1),
    [x3, y3] = p(r0, a0);
  return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

/** Interactive donut: hover or focus a slice / legend row to see its share. */
export function BudgetDonut({ items, size = "full" }: { items: BudgetItem[]; size?: "full" | "compact" }) {
  const [active, setActive] = useState<number | null>(null);
  const total = sumBudget(items) || 1;
  let a = -Math.PI / 2;
  const gap = items.length > 1 ? 0.012 : 0;
  const slices = items.map((it, i) => {
    // A full circle can't be drawn as one arc (start = end), so stop just short.
    const sweep = Math.min((it.amount / total) * Math.PI * 2, Math.PI * 2 - 0.0001);
    const d = it.amount > 0 ? arc(100, 100, 64, 94, a + gap, Math.max(a + gap, a + sweep - gap)) : "";
    a += sweep;
    return { d, i };
  });
  const cur = active !== null ? items[active] : null;

  return (
    <div
      className="donut-wrap"
      style={
        size === "compact"
          ? { gridTemplateColumns: "1fr", justifyItems: "center", maxWidth: 230, margin: "12px auto 0" }
          : undefined
      }
    >
      <svg
        viewBox="0 0 200 200"
        className="donut"
        data-hover={active !== null}
        role="img"
        aria-label="Budget split by category"
      >
        {slices.map(({ d, i }) =>
          d ? (
            <path
              key={i}
              d={d}
              fill={colorAt(i)}
              data-active={active === i}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
            />
          ) : null,
        )}
        <text
          x="100"
          y="94"
          textAnchor="middle"
          fill="var(--muted)"
          fontSize="10"
          fontFamily="var(--font-body)"
        >
          {cur ? cur.category.slice(0, 22) : "Total"}
        </text>
        <text
          x="100"
          y="114"
          textAnchor="middle"
          fill="var(--text)"
          fontSize="17"
          fontWeight="700"
          fontFamily="var(--font-display)"
        >
          {formatINR(cur ? cur.amount : sumBudget(items))}
        </text>
        {cur && (
          <text x="100" y="130" textAnchor="middle" fill="var(--accent)" fontSize="10" fontWeight="600">
            {Math.round((cur.amount / total) * 100)}%
          </text>
        )}
      </svg>
      {size === "full" && (
        <ul className="legend">
          {items.map((it, i) => (
            <li
              key={it.category + i}
              tabIndex={0}
              data-active={active === i}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <span className="swatch" style={{ background: colorAt(i) }} aria-hidden="true" />
              <span style={{ flex: 1 }}>{it.category}</span>
              <span className="muted small">{Math.round((it.amount / total) * 100)}%</span>
              <strong style={{ minWidth: 96, textAlign: "right" }}>{formatINR(it.amount)}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Number field that commits on blur/Enter, so typing "5" on the way to "50000" doesn't rebalance everything. */
function AmountInput({
  id,
  value,
  label,
  onCommit,
}: {
  id?: string;
  value: number;
  label: string;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n >= 0 && n !== value) onCommit(n);
    else setDraft(String(value));
  };
  return (
    <input
      id={id}
      type="number"
      min={0}
      step={500}
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

interface Props {
  items: BudgetItem[];
  total: number;
  guests: number;
  onChange: (items: BudgetItem[], total: number) => void;
}

export default function BudgetPanel({ items, total, guests, onChange }: Props) {
  const [overspend, setOverspend] = useState(0);
  const apply = (r: { items: BudgetItem[]; overspend: number }, t: number) => {
    setOverspend(r.overspend);
    onChange(r.items, t);
  };
  const lockedCount = items.filter((i) => i.locked).length;

  return (
    <div className="stack">
      <section className="card" aria-labelledby="split-h">
        <h3 id="split-h">Where the money goes</h3>
        <p className="muted small">Hover or focus a category to see its share.</p>
        <BudgetDonut items={items} />
      </section>

      <section className="card" aria-labelledby="edit-h">
        <div className="row mb-12">
          <div>
            <h3 className="m-0" id="edit-h">
              Adjust the budget
            </h3>
            <p className="muted small m-0 mt-4">
              Change any amount and the unlocked categories rebalance to keep the total. Lock a category to
              keep its amount fixed.
            </p>
          </div>
          <span className="spacer" />
          {lockedCount > 0 && (
            <button
              type="button"
              className="btn btn-sm no-print"
              onClick={() =>
                apply(
                  rebalance(
                    items.map((i) => ({ ...i, locked: false })),
                    total,
                  ),
                  total,
                )
              }
            >
              Unlock all ({lockedCount})
            </button>
          )}
        </div>

        <div className="row" style={{ marginBottom: 16, alignItems: "flex-end" }}>
          <div style={{ width: 200 }}>
            <label htmlFor="total">Total budget (₹)</label>
            <AmountInput
              id="total"
              value={total}
              label="Total budget"
              onCommit={(t) => apply(rebalance(items, Math.round(t)), Math.round(t))}
            />
          </div>
          <span className="badge">{formatINR(guests > 0 ? Math.round(total / guests) : 0)} per guest</span>
          <span className="badge badge-ok" aria-live="polite">
            Allocated {formatINR(sumBudget(items))}
          </span>
        </div>

        {overspend > 0 && (
          <div className="alert alert-warn mb-12" role="alert">
            <TriangleAlert className="flex-none" size={20} aria-hidden="true" />
            Locked categories are {formatINR(overspend)} over the total. Raise the total or unlock a category.
          </div>
        )}

        <div role="table" aria-label="Budget by category">
          {items.map((it, idx) => {
            const pct = total > 0 ? Math.round((it.amount / total) * 100) : 0;
            return (
              <div className="budget-row" role="row" key={it.category + idx}>
                <div role="cell">
                  <div className="cat">
                    <span className="swatch" style={{ background: colorAt(idx) }} aria-hidden="true" />
                    {it.category}
                  </div>
                  <div className="bar" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, pct)}%`, background: colorAt(idx) }} />
                  </div>
                  <span className="hint">{pct}% of total</span>
                </div>
                <div role="cell">
                  <AmountInput
                    value={it.amount}
                    label={`${it.category} amount`}
                    onCommit={(n) => apply(editCategory(items, idx, n, total), total)}
                  />
                </div>
                <div role="cell">
                  <button
                    type="button"
                    className="lock no-print"
                    aria-pressed={!!it.locked}
                    aria-label={`${it.locked ? "Unlock" : "Lock"} ${it.category}`}
                    title={it.locked ? "Locked: won't change when rebalancing" : "Lock this amount"}
                    onClick={() =>
                      onChange(
                        items.map((x, n) => (n === idx ? { ...x, locked: !x.locked } : x)),
                        total,
                      )
                    }
                  >
                    {it.locked ? (
                      <Lock size={16} aria-hidden="true" />
                    ) : (
                      <LockOpen size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                <div role="cell" className="notes">
                  {it.notes}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
