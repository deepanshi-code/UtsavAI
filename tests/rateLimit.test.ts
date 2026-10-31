import { describe, expect, it } from "vitest";
import { clientIp, createLimiter } from "@/lib/rateLimit";

describe("createLimiter", () => {
  it("allows up to the limit, then blocks until the window passes", () => {
    let t = 0;
    const limited = createLimiter(2, 1_000, () => t);
    expect([limited("a"), limited("a"), limited("a")]).toEqual([false, false, true]);
    t = 1_001;
    expect(limited("a")).toBe(false);
  });

  it("counts each client separately", () => {
    const limited = createLimiter(1, 1_000, () => 0);
    expect(limited("a")).toBe(false);
    expect(limited("b")).toBe(false);
    expect(limited("a")).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first forwarded address", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": " 1.2.3.4 , 10.0.0.1" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back when no proxy header is present", () => {
    expect(clientIp(new Request("http://x"))).toBe("local");
  });
});
