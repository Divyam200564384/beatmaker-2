/* global Buffer */
import { describe, it, expect } from "vitest";
import { encodeSong, decodeSong } from "./codec.js";
import {
  createDefaultSong, setRingEuclid, toggleRingStep, setKit, setPerc, setChord, setChordRhythm,
  setBassStyle, setMelodyCell, setInstrument, setMix, setTempo, setKey,
} from "./model.js";
import { KITS, INSTRUMENTS } from "../audio/catalog.js";

function edited() {
  let s = createDefaultSong();
  s = setTempo(s, 133); s = setKey(s, 9);
  s = setKit(s, KITS[7].id); s = setPerc(s, "cowbell");
  s = setRingEuclid(s, "kick", 5, 3); s = toggleRingStep(s, "kick", 1);
  s = setRingEuclid(s, "perc", 16, 15);
  s = setChord(s, 2, null); s = setChord(s, 3, "IVmaj7");
  s = setChordRhythm(s, "pulse"); s = setBassStyle(s, "walking");
  s = setMelodyCell(s, 0, 10, false); s = setMelodyCell(s, 1, 10, true); s = setMelodyCell(s, 31, 4, false);
  s = setInstrument(s, "chords", INSTRUMENTS[128].id);
  s = setInstrument(s, "bass", INSTRUMENTS[40].id);
  s = setMix(s, "drums", { volume: 100, mute: true, space: 3 });
  s = setMix(s, "melody", { volume: 0, solo: true, space: 100 });
  return s;
}

describe("codec", () => {
  it("round-trips the default song", () => {
    const s = createDefaultSong();
    expect(decodeSong(encodeSong(s))).toEqual(s);
  });
  it("round-trips an edited song", () => {
    const s = edited();
    expect(decodeSong(encodeSong(s))).toEqual(s);
  });
  it("is URL safe", () => {
    expect(encodeSong(edited())).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("rejects bad input", () => {
    const good = encodeSong(createDefaultSong());
    expect(() => decodeSong("")).toThrow("bad song");
    expect(() => decodeSong("!!!")).toThrow("bad song");
    expect(() => decodeSong(good.slice(0, 20))).toThrow("bad song");
    const bytes = Buffer.from(good, "base64url");
    bytes[0] = 2;
    expect(() => decodeSong(bytes.toString("base64url"))).toThrow("bad song");
  });
  it("rejects out-of-range tempo", () => {
    const bytes = Buffer.from(encodeSong(createDefaultSong()), "base64url");
    bytes[1] |= 0xfe; // tempo bits = 127
    expect(() => decodeSong(bytes.toString("base64url"))).toThrow("bad song");
  });
  it("refuses to encode ids outside the catalog", () => {
    expect(() => encodeSong(setKit(createDefaultSong(), "nope"))).toThrow("bad song");
    expect(() => encodeSong(setInstrument(createDefaultSong(), "bass", "nope"))).toThrow("bad song");
  });
  describe("rejects out-of-range fields", () => {
    const tamper = (pos, n, val) => {
      const bytes = Buffer.from(encodeSong(createDefaultSong()), "base64url");
      for (let i = 0; i < n; i++) {
        const bit = (val >> (n - 1 - i)) & 1;
        const p = pos + i;
        bytes[p >> 3] = (bytes[p >> 3] & ~(0x80 >> (p & 7))) | (bit ? 0x80 >> (p & 7) : 0);
      }
      return bytes.toString("base64url");
    };
    it.each([
      ["key 12", 15, 4, 12],
      ["key 15", 15, 4, 15],
      ["kit index 10", 19, 4, 10],
      ["hits 17", 25, 5, 17],
      ["prog value 8", 125, 4, 8],
      ["prog value 14", 125, 4, 14],
      ["melody row 12", 146, 4, 12],
      ["melody row 15", 146, 4, 15],
      ["volume 101", 330, 7, 101],
      ["space 101", 339, 7, 101],
    ])("%s", (_n, pos, bits, val) => {
      expect(() => decodeSong(tamper(pos, bits, val))).toThrow("bad song");
    });
    it("sanity: untouched positions still decode", () => {
      expect(decodeSong(tamper(15, 4, 0)).key).toBe(0);
    });
  });
});
