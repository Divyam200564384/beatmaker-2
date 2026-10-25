import { describe, it, expect } from "vitest";
import { LEVELS, WORLDS, ALL_TOOLS, DRUM_TOOLS } from "./levels.js";
import { starsFor } from "./progress.js";
import { applyPatch, createEmptySong, setRingEuclid, toggleRingStep, setChord, setTempo, setChordRhythm } from "../song/model.js";

const start = (lv) => applyPatch(createEmptySong(), lv.startPatch);
const lv = (id) => LEVELS[id - 1];
const goalsOf = (id, song, actions = []) => lv(id).goals.map((g) => g.check({ song, actions }));
const progOf = (song, prog) => ({ ...song, chords: { ...song.chords, prog } });
const melody = (song, notes) => ({
  ...song,
  melody: {
    ...song.melody,
    cells: Array.from({ length: 32 }, (_, c) => {
      const n = notes.find((x) => x.col === c);
      return n ? { row: n.row, tie: !!n.tie } : { row: -1, tie: false };
    }),
  },
});

describe("level data", () => {
  it("has 15 levels in order, worlds 1..5", () => {
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    expect(WORLDS).toHaveLength(5);
    LEVELS.forEach((l) => {
      expect(l.world).toBeGreaterThanOrEqual(1);
      expect(l.world).toBeLessThanOrEqual(5);
    });
  });
  it("is deep frozen", () => {
    expect(Object.isFrozen(LEVELS[0])).toBe(true);
    expect(Object.isFrozen(lv(10).compare[0].patch)).toBe(true);
    expect(Object.isFrozen(lv(7).startPatch.drums.rings.kick.pattern)).toBe(true);
  });
  it("tool shorthands", () => {
    expect(DRUM_TOOLS).toEqual(["kick", "snare", "hat", "perc", "sliders"]);
    expect(ALL_TOOLS).toEqual([
      "tempo", "key", "undo", "share", "wav", "kick", "snare", "hat", "perc", "shift", "sliders", "kit",
      "instruments", "mixer", "chords", "suggest", "maj7", "rhythm", "bass", "melody", "melodyTools",
    ]);
    expect(Object.isFrozen(ALL_TOOLS)).toBe(true);
    expect(Object.isFrozen(DRUM_TOOLS)).toBe(true);
  });
  it("hints use the chord names the learner sees", () => {
    expect(lv(8).goals.map((g) => g.hint)).toEqual(["Make the first bar Am or Em.", "Put Cmaj7 or Fmaj7 in any bar."]);
    expect(lv(9).goals[0].hint).toBe("Use Am or Em in at least 2 bars.");
    expect(lv(2).goals[0].hint).toContain("clap dot");
  });
  it("3 starts with the default 8-hit hat", () => {
    expect(start(lv(3)).drums.rings.hat.hits).toBe(8);
  });
  it("level 6 has a quiz and compare; unlocks exact", () => {
    expect(lv(6).quiz).toEqual({ answer: 1 });
    expect(lv(2).compare.map((c) => c.label)).toEqual(["Kick alone", "Kick + clap"]);
    expect(lv(10).compare.map((c) => c.label)).toEqual(["With bass", "Without bass"]);
    expect(lv(4).unlocks).toEqual(["shift", "perc", "kits:3"]);
    expect(lv(15).unlocks).toEqual(["graduate"]);
  });
  for (const l of LEVELS) {
    describe(`level ${l.id}`, () => {
      it("has 1-2 coach bubbles of at most 20 words", () => {
        expect(l.coach.length).toBeGreaterThanOrEqual(1);
        expect(l.coach.length).toBeLessThanOrEqual(2);
        l.coach.forEach((c) => expect(c.split(/\s+/).length).toBeLessThanOrEqual(20));
      });
      it("uses only known tools and has goal hints", () => {
        l.tools.forEach((t) => expect(ALL_TOOLS).toContain(t));
        l.goals.forEach((g) => expect(g.hint.length).toBeGreaterThan(5));
      });
      it("no goal is true on its own start song with no actions", () => {
        l.goals.forEach((g) => expect(g.check({ song: start(l), actions: [] })).toBe(false));
      });
    });
  }
});

describe("goal checks, positive and negative", () => {
  it("1", () => {
    const s = start(lv(1));
    expect(goalsOf(1, setRingEuclid(s, "kick", 4, 0))).toEqual([true]);
    expect(goalsOf(1, setRingEuclid(s, "kick", 3, 0))).toEqual([false]);
  });
  it("2", () => {
    const s = start(lv(2));
    let t = toggleRingStep(toggleRingStep(s, "snare", 4), "snare", 12);
    expect(goalsOf(2, t)).toEqual([true, true]);
    expect(lv(2).bonus.check({ song: t, actions: [] })).toBe(false);
    t = toggleRingStep(t, "snare", 7);
    expect(lv(2).bonus.check({ song: t, actions: [] })).toBe(true);
    expect(goalsOf(2, toggleRingStep(s, "snare", 4))).toEqual([true, false]);
  });
  it("3 (order matters)", () => {
    const s = start(lv(3));
    expect(goalsOf(3, s, ["hat-hits:3", "hat-hits:9"])).toEqual([true, true]);
    expect(goalsOf(3, s, ["hat-hits:8", "hat-hits:3"])).toEqual([true, false]);
    expect(goalsOf(3, s, ["hat-hits:5"])).toEqual([false, false]);
  });
  it("4", () => {
    const s = start(lv(4));
    expect(goalsOf(4, setRingEuclid(s, "kick", 4, 2))).toEqual([true]);
    expect(goalsOf(4, toggleRingStep(s, "kick", 5))).toEqual([true]);
    expect(goalsOf(4, setRingEuclid(s, "kick", 2, 0))).toEqual([false]);
    expect(lv(4).bonus.check({ song: setRingEuclid(s, "perc", 3, 0), actions: [] })).toBe(true);
    expect(lv(4).bonus.check({ song: s, actions: [] })).toBe(false);
  });
  it("5", () => {
    const s = start(lv(5));
    const ok = setTempo(setRingEuclid(s, "kick", 3, 0), 80);
    expect(goalsOf(5, ok)).toEqual([true, true]);
    expect(goalsOf(5, setTempo(setRingEuclid(s, "kick", 3, 0), 100))).toEqual([true, false]);
    expect(goalsOf(5, setTempo(s, 80))).toEqual([false, true]);
  });
  it("6", () => {
    expect(goalsOf(6, start(lv(6)), ["quiz:correct"])).toEqual([true]);
    expect(goalsOf(6, start(lv(6)), ["self-check"])).toEqual([false]);
  });
  it("7", () => {
    const s = start(lv(7));
    const good = progOf(s, ["I", "vi", "IV", "I"]);
    expect(goalsOf(7, good)).toEqual([true, true]);
    expect(lv(7).bonus.check({ song: good, actions: [] })).toBe(true);
    expect(goalsOf(7, progOf(s, ["I", "V", "I", "V"]))).toEqual([true, true]);
    expect(goalsOf(7, progOf(s, ["I", "vi", "IV", "ii"]))).toEqual([true, false]);
    expect(goalsOf(7, progOf(s, ["I", "vi", null, "I"]))).toEqual([false, true]);
    expect(lv(7).bonus.check({ song: progOf(s, ["I", "iii", "I", "ii"]), actions: [] })).toBe(false);
  });
  it("8", () => {
    const s = start(lv(8));
    const good = setChordRhythm(progOf(s, ["vi", "IVmaj7", "I", "V"]), "pulse");
    expect(goalsOf(8, good)).toEqual([true, true]);
    expect(lv(8).bonus.check({ song: good, actions: [] })).toBe(true);
    expect(goalsOf(8, progOf(s, ["I", "IVmaj7", "I", "V"]))).toEqual([false, true]);
    expect(goalsOf(8, progOf(s, ["iii", "I", "I", "V"]))).toEqual([true, false]);
    expect(lv(8).bonus.check({ song: s, actions: [] })).toBe(false);
  });
  it("9", () => {
    const s = start(lv(9));
    expect(goalsOf(9, progOf(s, ["vi", "iii", "I", "V"]))).toEqual([true]);
    expect(goalsOf(9, progOf(s, ["vi", "I", "I", "V"]))).toEqual([false]);
  });
  it("10", () => {
    const s = start(lv(10));
    expect(goalsOf(10, s, ["mute:bass", "unmute:bass", "bass-style"])).toEqual([true, true, true]);
    expect(goalsOf(10, s, ["unmute:bass", "mute:bass"])).toEqual([true, false, false]);
    expect(goalsOf(10, s, ["mute:drums", "unmute:drums"])).toEqual([false, false, false]);
  });
  it("11", () => {
    const s = start(lv(11));
    const hill = melody(s, [{ col: 0, row: 2 }, { col: 4, row: 5 }, { col: 8, row: 8 }, { col: 12, row: 4 }, { col: 16, row: 1 }]);
    const rising = melody(s, [{ col: 0, row: 2 }, { col: 4, row: 5 }, { col: 8, row: 7 }, { col: 12, row: 9 }]);
    expect(goalsOf(11, hill)).toEqual([true]);
    expect(goalsOf(11, rising)).toEqual([false]);
    expect(goalsOf(11, melody(s, [{ col: 0, row: 2 }, { col: 4, row: 8 }, { col: 8, row: 1 }]))).toEqual([false]);
    const longs = melody(s, [{ col: 0, row: 2 }, { col: 1, row: 2, tie: true }, { col: 4, row: 5 }, { col: 5, row: 5, tie: true }]);
    expect(lv(11).bonus.check({ song: longs, actions: [] })).toBe(true);
    expect(lv(11).bonus.check({ song: hill, actions: [] })).toBe(false);
  });
  it("12", () => {
    const s = start(lv(12));
    expect(goalsOf(12, melody(s, [{ col: 2, row: 3 }, { col: 20, row: 7 }, { col: 28, row: 10 }]))).toEqual([true]);
    expect(goalsOf(12, melody(s, [{ col: 2, row: 5 }, { col: 28, row: 7 }]))).toEqual([false]);
    expect(goalsOf(12, melody(s, [{ col: 2, row: 5 }]))).toEqual([false]);
  });
  it("13", () => {
    const s = start(lv(13));
    expect(goalsOf(13, s, ["instrument:bass", "instrument:melody"])).toEqual([true]);
    expect(goalsOf(13, s, ["instrument:bass", "instrument:bass"])).toEqual([false]);
  });
  it("14", () => {
    const s = start(lv(14));
    expect(goalsOf(14, s, ["volume", "solo", "space"])).toEqual([true, true, true]);
    expect(goalsOf(14, s, ["volume", "solo"])).toEqual([true, true, false]);
  });
  it("15", () => {
    const s = start(lv(15));
    const full = melody(s, [{ col: 0, row: 4 }]);
    expect(goalsOf(15, full, ["share"])).toEqual([true, true]);
    expect(goalsOf(15, full, ["wav"])).toEqual([true, true]);
    expect(goalsOf(15, { ...full, bass: { ...full.bass, style: "off" } }, [])).toEqual([false, false]);
    expect(goalsOf(15, full, [])).toEqual([true, false]);
    const noChords = ["I", "V", "vi", "IV"].reduce((acc, _d, i) => setChord(acc, i, null), full);
    expect(goalsOf(15, noChords, ["share"])).toEqual([false, true]);
  });
});

describe("starsFor", () => {
  it("scores", () => {
    expect(starsFor({ goalsMet: true, usedHint: false, bonusMet: true })).toBe(3);
    expect(starsFor({ goalsMet: true, usedHint: true, bonusMet: true })).toBe(1);
    expect(starsFor({ goalsMet: true, usedHint: false, bonusMet: false })).toBe(2);
    expect(starsFor({ goalsMet: false, usedHint: false, bonusMet: true })).toBe(0);
  });
});
