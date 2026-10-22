import { describe, it, expect } from "vitest";
import { bassNotesForBar } from "./bass.js";
import { createDefaultSong, setChord, setBassStyle } from "../song/model.js";

describe("bassNotesForBar", () => {
  it("kick style follows the kick pattern", () => {
    const n = bassNotesForBar(createDefaultSong(), 0);
    expect(n.map((x) => x.step)).toEqual([0, 4, 8, 12]);
    expect(n.every((x) => x.note === 36 && x.steps === 2)).toBe(true);
  });
  it("walking I to V in key 0", () => {
    const n = bassNotesForBar(setBassStyle(createDefaultSong(), "walking"), 0);
    expect(n.map((x) => x.step)).toEqual([0, 4, 8, 12]);
    expect(n.map((x) => x.note)).toEqual([36, 38, 40, 41]);
    expect(n.every((x) => x.steps === 3.5)).toBe(true);
  });
  it("walking with a null next chord ends on the root", () => {
    const s = setChord(setBassStyle(createDefaultSong(), "walking"), 1, null);
    expect(bassNotesForBar(s, 0).map((x) => x.note)).toEqual([36, 38, 40, 36]);
  });
  it("walking approaches the next root from below, in its closest octave", () => {
    const w = (p0, p1) => {
      let s = setBassStyle(createDefaultSong(), "walking");
      s = setChord(setChord(s, 0, p0), 1, p1);
      return bassNotesForBar(s, 0).map((x) => x.note);
    };
    expect(w("iii", "ii")).toEqual([40, 41, 43, 36]);
    expect(w("V", "IV")).toEqual([43, 45, 47, 40]);
    expect(w("I", "V")).toEqual([36, 38, 40, 41]);
  });
  it("null chord gives nothing", () => {
    expect(bassNotesForBar(setChord(createDefaultSong(), 0, null), 0)).toEqual([]);
  });
  it("bounce alternates root and octave", () => {
    const n = bassNotesForBar(setBassStyle(createDefaultSong(), "bounce"), 0);
    expect(n).toHaveLength(8);
    expect(n.map((x) => x.note)).toEqual([36, 48, 36, 48, 36, 48, 36, 48]);
    expect(n[0].steps).toBe(1.5);
  });
  it("long and off", () => {
    expect(bassNotesForBar(setBassStyle(createDefaultSong(), "long"), 0)).toEqual([{ step: 0, note: 36, steps: 15.5 }]);
    expect(bassNotesForBar(setBassStyle(createDefaultSong(), "off"), 0)).toEqual([]);
  });
});
