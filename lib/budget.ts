import type { BudgetItem } from "./types";

export function sumBudget(items: BudgetItem[]): number {
  return items.reduce((s, i) => s + i.amount, 0);
}

/**
 * Splits `total` across `weights` as whole rupees so the parts sum exactly to `total`
 * (largest-remainder method). Zero/negative weights get nothing; if all weights are
 * zero the total is split evenly.
 */
export function distribute(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const clean = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const wsum = clean.reduce((a, b) => a + b, 0);
  const shares = wsum > 0 ? clean.map((w) => (w / wsum) * total) : clean.map(() => total / clean.length);
  const floors = shares.map(Math.floor);
  let left = total - floors.reduce((a, b) => a + b, 0);
  const order = shares.map((s, i) => ({ i, frac: s - Math.floor(s) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) floors[order[k].i] += 1;
  return floors;
}

export interface RebalanceResult {
  items: BudgetItem[];
  /** Positive when locked categories alone exceed the total. */
  overspend: number;
}

/**
 * Keeps the plan's total fixed: locked categories keep their amount, unlocked ones
 * share whatever is left in proportion to their current amounts. If locked items
 * already exceed the total, unlocked items drop to 0 and the overspend is reported
 * instead of silently changing the user's numbers.
 */
export function rebalance(items: BudgetItem[], total: number): RebalanceResult {
  const lockedSum = sumBudget(items.filter((i) => i.locked));
  const unlocked = items.filter((i) => !i.locked);
  const remaining = total - lockedSum;

  if (remaining < 0 || unlocked.length === 0) {
    return {
      items: items.map((i) => (i.locked ? i : { ...i, amount: 0 })),
      overspend: Math.max(0, lockedSum - total),
    };
  }

  const parts = distribute(
    remaining,
    unlocked.map((i) => i.amount),
  );
  let k = 0;
  return {
    items: items.map((i) => (i.locked ? i : { ...i, amount: parts[k++] })),
    overspend: 0,
  };
}

/**
 * Applies a user edit to one category, locks it (the user chose that number) and
 * rebalances the rest so the total stays the same.
 */
export function editCategory(
  items: BudgetItem[],
  index: number,
  amount: number,
  total: number,
): RebalanceResult {
  const next = items.map((i, n) =>
    n === index ? { ...i, amount: Math.max(0, Math.round(amount)), locked: true } : i,
  );
  return rebalance(next, total);
}
