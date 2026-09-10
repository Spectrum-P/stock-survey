import { describe, expect, it } from "vitest";
import { averageLifespan, calculateLifecycle, planningHorizonFor } from "@/lib/lifecycle";

describe("lifecycle calculations", () => {
  it("uses the component installation year", () => {
    expect(calculateLifecycle(2010, 20, 2026)).toEqual({ age: 16, remainingLife: 4, replacementYear: 2030, suggestedHorizon: "1-10 years" });
  });
  it("preserves negative remaining life", () => {
    expect(calculateLifecycle(2000, 20, 2026).remainingLife).toBe(-6);
    expect(planningHorizonFor(-6)).toBe("Overdue");
  });
  it("uses a supplied replacement year in preference to an installation-derived year", () => {
    expect(calculateLifecycle(2010, 40, 2026, 2032)).toEqual({ age: 16, remainingLife: 6, replacementYear: 2032, suggestedHorizon: "1-10 years" });
  });
  it("recalculates the replacement year from installation year and expected life", () => {
    expect(calculateLifecycle(2018, 15, 2026)).toMatchObject({ replacementYear: 2033, remainingLife: 7 });
  });
  it("maps every planning boundary", () => {
    expect(planningHorizonFor(10)).toBe("1-10 years"); expect(planningHorizonFor(11)).toBe("11-20 years"); expect(planningHorizonFor(21)).toBe("21-30 years"); expect(planningHorizonFor(31)).toBe("Beyond 30 years");
  });
  it("uses the rounded average for a lifespan range", () => {
    expect(averageLifespan("20-35 years", 28)).toBe(28);
    expect(averageLifespan("5-10 years", 7)).toBe(8);
    expect(averageLifespan("20 years", 20)).toBe(20);
  });
});
