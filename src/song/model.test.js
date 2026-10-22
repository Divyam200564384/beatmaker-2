import { describe, it, expect } from "vitest";
import { euclid } from "../music/euclid.js";
import {
  LAYERS, createDefaultSong, createEmptySong, setRingEuclid, toggleRingStep, setKit, setPerc,
  setChord, setChordRhythm, setBassStyle, setMelodyCell, clearMelody, setInstrument, setMix,
  setTempo, setKey, applyPatch,
} from "./model.js";

const idx = (a) => a.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
const deepFreeze = (o) => {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
};

describe("song model", () => {
  it("exports layers", () => {
    expect(LAYERS).toEqual(["drums", "chords", "bass", "melody"]);
  });
  it("default song", () => {
    const s = createDefaultSong();
    expect(idx(s.drums.rings.kick.pattern)).toEqual([0, 4, 8, 12]);
    expect(idx(s.drums.rings.snare.pattern)).toEqual([4, 12]);
    expect(s.drums.rings.snare).toMatchObject({ hits: 2, shift: 4 });
    expect(idx(s.drums.rings.hat.pattern)).toHaveLength(8);
    expect(s.drums.rings.perc).toEqual({ hits: 0, shift: 0, pattern: euclid(0, 16, 0) });
    expect(s.chords.prog).toEqual(["I", "V", "vi", "IV"]);
    expect(s.bass.style).toBe("kick");
    expect(s.bass.mix.space).toBe(0);
    expect(s.melody.cells).toHaveLength(32);
    expect(s.tempo).toBe(96);
    expect(s.melody.instrument).toBe("marimba");
    expect(createDefaultSong()).not.toBe(s);
  });
  it("empty song", () => {
    const s = createEmptySong();
    for (const r of Object.values(s.drums.rings)) expect(r.hits).toBe(0);
    expect(s.chords.prog).toEqual([null, null, null, null]);
    expect(s.bass.style).toBe("off");
    expect(s.chords.instrument).toBe("electric_piano_1");
  });
  it("tempo and key", () => {
    const s = createDefaultSong();
    expect(setTempo(s, 200).tempo).toBe(140);
    expect(setTempo(s, 10).tempo).toBe(70);
    expect(setKey(s, -1).key).toBe(11);
    expect(setKey(s, 13).key).toBe(1);
  });
  it("setMix clamps and merges", () => {
    const s = createDefaultSong();
    const m = setMix(s, "bass", { volume: 150, space: -5 }).bass.mix;
    expect(m).toEqual({ volume: 100, mute: false, solo: false, space: 0 });
    expect(setMix(s, "drums", { mute: true }).drums.mix).toEqual({ ...s.drums.mix, mute: true });
  });
  it("ring setters", () => {
    const s = createDefaultSong();
    expect(setRingEuclid(s, "kick", 3, 0).drums.rings.kick.pattern).toEqual(euclid(3, 16, 0));
    const r = setRingEuclid(s, "kick", 99, 99).drums.rings.kick;
    expect(r).toMatchObject({ hits: 16, shift: 15 });
    const t = toggleRingStep(s, "kick", 1).drums.rings.kick;
    const diff = t.pattern.filter((v, i) => v !== s.drums.rings.kick.pattern[i]);
    expect(diff).toHaveLength(1);
    expect(t.pattern[1]).toBe(true);
    expect(t.hits).toBe(4);
  });
  it("other setters", () => {
    const s = createDefaultSong();
    expect(setKit(s, "x").drums.kit).toBe("x");
    expect(setPerc(s, "tom").drums.perc).toBe("tom");
    expect(setChord(s, 2, null).chords.prog).toEqual(["I", "V", null, "IV"]);
    expect(setChordRhythm(s, "pulse").chords.rhythm).toBe("pulse");
    expect(setBassStyle(s, "off").bass.style).toBe("off");
    const c = setMelodyCell(s, 3, 5, true).melody.cells;
    expect(c[3]).toEqual({ row: 5, tie: true });
    expect(clearMelody(setMelodyCell(s, 3, 5, false)).melody.cells[3]).toEqual({ row: -1, tie: false });
    expect(setInstrument(s, "melody", "flute").melody.instrument).toBe("flute");
  });
  it("applyPatch deep merges, arrays replace", () => {
    const s = createDefaultSong();
    const p = applyPatch(s, { chords: { prog: [null, null, null, null] } });
    expect(p.chords.prog).toEqual([null, null, null, null]);
    expect(p.chords.instrument).toBe("electric_piano_1");
    expect(p.drums).toBe(s.drums);
  });
  it("setters never mutate", () => {
    const s = deepFreeze(createDefaultSong());
    expect(() => {
      setRingEuclid(s, "kick", 3, 1); toggleRingStep(s, "snare", 0); setKit(s, "a"); setPerc(s, "rim");
      setChord(s, 0, "ii"); setChordRhythm(s, "x"); setBassStyle(s, "y"); setMelodyCell(s, 0, 1, false);
      clearMelody(s); setInstrument(s, "bass", "z"); setMix(s, "chords", { volume: 1 });
      setTempo(s, 100); setKey(s, 3); applyPatch(s, { tempo: 100, drums: { kit: "k" } });
    }).not.toThrow();
  });
});
