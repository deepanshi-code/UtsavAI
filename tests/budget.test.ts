import { describe, expect, it } from "vitest";
import { distribute, editCategory, rebalance, sumBudget } from "@/lib/budget";
import type { BudgetItem } from "@/lib/types";

const items = (...amounts: number[]): BudgetItem[] =>
  amounts.map((amount, i) => ({ category: `C${i}`, amount, notes: "" }));

describe("distribute", () => {
  it("sums exactly to the total even when shares are fractional", () => {
    const parts = distribute(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts.sort()).toEqual([33, 33, 34]);
  });

  it("splits evenly when every weight is zero", () => {
    expect(distribute(10, [0, 0])).toEqual([5, 5]);
  });

  it("ignores negative and NaN weights", () => {
    expect(distribute(90, [-5, NaN, 3])).toEqual([0, 0, 90]);
  });
});

describe("rebalance", () => {
  it("scales unlocked items to the new total and keeps proportions", () => {
    const r = rebalance(items(200, 300, 500), 2000);
    expect(r.items.map((i) => i.amount)).toEqual([400, 600, 1000]);
    expect(r.overspend).toBe(0);
  });

  it("never touches locked items", () => {
    const start = items(200, 300, 500);
    start[0].locked = true;
    const r = rebalance(start, 1200);
    expect(r.items[0].amount).toBe(200);
    expect(sumBudget(r.items)).toBe(1200);
  });

  it("reports overspend instead of changing locked amounts", () => {
    const start = items(800, 300, 500);
    start[0].locked = true;
    const r = rebalance(start, 600);
    expect(r.overspend).toBe(200);
    expect(r.items.map((i) => i.amount)).toEqual([800, 0, 0]);
  });
});

describe("editCategory", () => {
  it("locks the edited row and keeps the total fixed", () => {
    const r = editCategory(items(250, 250, 500), 2, 700, 1000);
    expect(r.items[2]).toMatchObject({ amount: 700, locked: true });
    expect(sumBudget(r.items)).toBe(1000);
    expect(r.items[0].amount).toBe(150);
  });

  it("clamps negative edits to zero", () => {
    const r = editCategory(items(500, 500), 0, -50, 1000);
    expect(r.items[0].amount).toBe(0);
    expect(r.items[1].amount).toBe(1000);
  });
});
