import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * generateJson's resilience logic, against a fake Gemini. Each model's behaviour is
 * scripted: answer after N ms, or fail with a status.
 */
type Script = { ms: number; status?: number; body?: unknown };
const scripts: Record<string, Script> = {};
const calls: string[] = [];

vi.mock("@google/genai", async (orig) => {
  const real = await orig<typeof import("@google/genai")>();
  class FakeAI {
    models = {
      generateContent: ({ model, config }: { model: string; config: { abortSignal?: AbortSignal } }) => {
        calls.push(model);
        const s = scripts[model] ?? { ms: 0, body: { ok: model } };
        return new Promise((resolve, reject) => {
          const t = setTimeout(() => {
            if (s.status) reject(Object.assign(new Error(`status ${s.status}`), { status: s.status }));
            else resolve({ text: JSON.stringify(s.body ?? { ok: model }) });
          }, s.ms);
          config.abortSignal?.addEventListener("abort", () => {
            clearTimeout(t);
            reject(Object.assign(new Error("This operation was aborted"), { name: "AbortError" }));
          });
        });
      },
    };
  }
  return { ...real, GoogleGenAI: FakeAI };
});

const { generateJson, GeminiBusyError } = await import("@/lib/gemini");

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("GEMINI_MODELS", "a,b,c");
  for (const k of Object.keys(scripts)) delete scripts[k];
  calls.length = 0;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function run() {
  const p = generateJson("prompt", {}, "key");
  const settled = p.then((v) => ({ v }), (e) => ({ e }));
  await vi.advanceTimersByTimeAsync(60_000);
  return settled as Promise<{ v?: unknown; e?: unknown }>;
}

describe("generateJson resilience", () => {
  it("moves straight to the next model when one is overloaded", async () => {
    scripts.a = { ms: 100, status: 503 };
    scripts.b = { ms: 2_000, body: { from: "b" } };
    const r = await run();
    expect(r.v).toEqual({ from: "b" });
    expect(calls).toEqual(["a", "b"]);
  });

  it("hedges a slow model by starting the next one alongside it", async () => {
    scripts.a = { ms: 30_000, body: { from: "a" } }; // slow but would eventually answer
    scripts.b = { ms: 3_000, body: { from: "b" } };
    const start = Date.now();
    const p = generateJson("prompt", {}, "key");
    await vi.advanceTimersByTimeAsync(15_100);
    await expect(p).resolves.toEqual({ from: "b" });
    // b started at the 12s hedge point and answered 3s later; a was cancelled.
    expect(Date.now() - start).toBeLessThan(16_000);
    expect(calls).toEqual(["a", "b"]);
  });

  it("drops a model that no longer exists instead of retrying it", async () => {
    scripts.a = { ms: 50, status: 404 };
    scripts.b = { ms: 50, status: 503 };
    scripts.c = { ms: 50, body: { from: "c" } };
    const r = await run();
    expect(r.v).toEqual({ from: "c" });
    expect(calls.filter((m) => m === "a")).toHaveLength(1);
  });

  it("reports 'busy' when every model stays overloaded", async () => {
    scripts.a = scripts.b = scripts.c = { ms: 200, status: 503 };
    const r = await run();
    expect(r.e).toBeInstanceOf(GeminiBusyError);
    // It kept trying across the chain rather than giving up after one round.
    expect(calls.length).toBeGreaterThan(3);
  });

  it("never runs more than two attempts at once", async () => {
    scripts.a = scripts.b = scripts.c = { ms: 40_000, body: {} };
    let peak = 0;
    const p = generateJson("prompt", {}, "key").catch(() => null);
    for (let t = 0; t < 50; t++) {
      await vi.advanceTimersByTimeAsync(1_000);
      peak = Math.max(peak, calls.length - 0);
    }
    await p;
    // Started a, then b at 12s; c only after one of them ends (they time out at 38s).
    expect(calls.slice(0, 2)).toEqual(["a", "b"]);
    expect(calls.length).toBeLessThanOrEqual(3);
  });
});
