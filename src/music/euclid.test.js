import { describe, it, expect } from "vitest";
import { euclid } from "./euclid.js";

const idx = (a) => a.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);

describe("euclid", () => {
  it("places evenly spaced hits", () => {
    expect(idx(euclid(4, 16, 0))).toEqual([0, 4, 8, 12]);
    expect(idx(euclid(2, 16, 4))).toEqual([4, 12]);
  });
  it("handles extremes", () => {
    expect(euclid(0, 16, 0).every((v) => v === false)).toBe(true);
    expect(euclid(16, 16, 3).every((v) => v === true)).toBe(true);
    expect(idx(euclid(5, 16, 0))).toHaveLength(5);
  });
  it("rotates with shift", () => {
    expect(idx(euclid(4, 16, 1))).toEqual([1, 5, 9, 13]);
  });
  it("hit count is preserved for every hits/shift", () => {
    for (let h = 0; h <= 16; h++) for (let s = 0; s < 16; s++)
      expect(idx(euclid(h, 16, s))).toHaveLength(h);
  });
});
