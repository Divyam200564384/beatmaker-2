import { describe, it, expect } from "vitest";
import {
  DEGREES, FEELINGS, NEXT, chordName, chordNotes, chordRoot, scaleNotesBetween, melodyRows,
} from "./theory.js";

describe("chordNotes", () => {
  it("matches known voicings", () => {
    expect(chordNotes("I", 0)).toEqual([60, 64, 67]);
    expect(chordNotes("V", 0)).toEqual([59, 62, 67]);
    expect(chordNotes("vi", 0)).toEqual([57, 60, 64]);
    expect(chordNotes("IV", 0)).toEqual([57, 60, 65]);
    expect(chordNotes("I", 7)).toEqual([59, 62, 67]);
    expect(chordNotes("IVmaj7", 0)).toEqual([57, 60, 64, 65]);
  });
  it("stays in [55,68), distinct, right length for every degree and key", () => {
    for (const d of DEGREES) for (let k = 0; k < 12; k++) {
      const n = chordNotes(d, k);
      expect(n.length).toBe(d.endsWith("maj7") ? 4 : 3);
      expect(new Set(n).size).toBe(n.length);
      for (const x of n) { expect(x).toBeGreaterThanOrEqual(55); expect(x).toBeLessThan(68); }
    }
  });
});

describe("chordName", () => {
  it("names chords", () => {
    expect(chordName("V", 0)).toBe("G");
    expect(chordName("ii", 0)).toBe("Dm");
    expect(chordName("Imaj7", 0)).toBe("Cmaj7");
    expect(chordName("vi", 9)).toBe("F#m");
    expect(chordName("vi", 0)).toBe("Am");
    expect(chordName("IVmaj7", 2)).toBe("Gmaj7");
  });
});

describe("chordRoot", () => {
  it("folds into [36,48)", () => {
    expect(chordRoot("V", 0)).toBe(43);
    expect(chordRoot("I", 11)).toBe(47);
    expect(chordRoot("IV", 9)).toBe(38);
  });
});

describe("scaleNotesBetween", () => {
  it("returns inclusive ascending major scale notes", () => {
    expect(scaleNotesBetween(36, 43, 0)).toEqual([36, 38, 40, 41, 43]);
    expect(scaleNotesBetween(37, 42, 2)).toEqual([37, 38, 40, 42]);
  });
});

describe("melodyRows", () => {
  it("builds 11 rows", () => {
    expect(melodyRows(0)).toEqual([60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84]);
    expect(melodyRows(7)[0]).toBe(55);
    expect(melodyRows(7)).toHaveLength(11);
  });
});

describe("NEXT / FEELINGS", () => {
  it("only references known degrees", () => {
    for (const [k, vs] of Object.entries(NEXT)) {
      expect(DEGREES).toContain(k);
      for (const v of vs) expect(DEGREES).toContain(v);
    }
    for (const d of DEGREES) expect(typeof FEELINGS[d]).toBe("string");
  });
});
