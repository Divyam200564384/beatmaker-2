import { describe, it, expect, beforeEach } from "vitest";
import { loadProgress, saveProgress, completeLevel, isUnlocked, allowedItems } from "./progress.js";
import { KITS, INSTRUMENTS } from "../audio/catalog.js";

const done = (...ids) => ids.reduce((p, id) => completeLevel(p, id, 1), { stars: {}, current: 1 });

beforeEach(() => localStorage.clear());

describe("progress", () => {
  it("defaults when empty or corrupt", () => {
    expect(loadProgress()).toEqual({ stars: {}, current: 1 });
    localStorage.setItem("bm2.progress", "{not json");
    expect(loadProgress()).toEqual({ stars: {}, current: 1 });
  });
  it("defaults on bad stars", () => {
    localStorage.setItem("bm2.progress", JSON.stringify({ stars: "x", current: 3 }));
    expect(loadProgress()).toEqual({ stars: {}, current: 1 });
  });
  it("defaults on bad current", () => {
    localStorage.setItem("bm2.progress", JSON.stringify({ stars: { 1: 2 }, current: 99 }));
    expect(loadProgress()).toEqual({ stars: {}, current: 1 });
  });
  it("round-trips", () => {
    const p = completeLevel({ stars: {}, current: 1 }, 1, 2);
    saveProgress(p);
    expect(loadProgress()).toEqual({ stars: { 1: 2 }, current: 2 });
  });
  it("completeLevel keeps max stars and caps current at 15", () => {
    let p = completeLevel({ stars: {}, current: 1 }, 1, 3);
    p = completeLevel(p, 1, 1);
    expect(p.stars[1]).toBe(3);
    expect(p.current).toBe(2);
    expect(completeLevel(p, 15, 1).current).toBe(15);
    expect(completeLevel({ stars: {}, current: 5 }, 2, 1).current).toBe(5);
  });
  it("isUnlocked", () => {
    expect(isUnlocked({ stars: {}, current: 3 }, 3)).toBe(true);
    expect(isUnlocked({ stars: {}, current: 3 }, 4)).toBe(false);
  });
  it("allowedItems thresholds", () => {
    expect(allowedItems(done()).kits).toEqual(["TR-808"]);
    expect(allowedItems(done(1, 2, 3)).kits).toEqual(["TR-808"]);
    expect(allowedItems(done(4)).kits).toEqual(KITS.slice(0, 3).map((k) => k.id));
    expect(allowedItems(done(4, 5)).kits).toEqual(KITS.map((k) => k.id));
    expect(allowedItems(done()).chordInstruments).toEqual(["electric_piano_1"]);
    expect(allowedItems(done(9)).chordInstruments).toEqual([
      "electric_piano_1", "acoustic_grand_piano", "pad_2_warm", "string_ensemble_1", "acoustic_guitar_nylon",
    ]);
    expect(allowedItems(done(13)).instruments).toEqual(INSTRUMENTS.map((i) => i.id));
    expect(allowedItems(done(9, 13)).chordInstruments).toEqual(INSTRUMENTS.map((i) => i.id));
    expect(allowedItems(done(9, 13)).chordInstruments).toHaveLength(129);
    expect(allowedItems(done(9, 12)).chordInstruments).toHaveLength(5);
    expect(allowedItems(done(12)).instruments).toEqual(expect.arrayContaining(["music_box", "lead_1_square"]));
    expect(allowedItems(done(12)).instruments.length).toBeLessThan(INSTRUMENTS.length);
  });
  it("zero-star levels do not count as completed", () => {
    expect(allowedItems(completeLevel({ stars: {}, current: 1 }, 4, 0)).kits).toEqual(["TR-808"]);
  });
});
