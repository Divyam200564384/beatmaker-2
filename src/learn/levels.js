import { euclid } from "../music/euclid.js";
import { NEXT } from "../music/theory.js";
import { createDefaultSong } from "../song/model.js";

export const WORLDS = ["Rhythm", "Chords & feelings", "Bass", "Melody", "Sound & final track"];

export const DRUM_TOOLS = Object.freeze(["kick", "snare", "hat", "perc", "sliders"]);
export const ALL_TOOLS = Object.freeze([
  "tempo", "key", "undo", "share", "wav", "kick", "snare", "hat", "perc", "shift", "sliders", "kit",
  "instruments", "mixer", "chords", "suggest", "maj7", "rhythm", "bass", "melody", "melodyTools",
]);

// Recursively freeze: applyPatch aliases patch arrays into songs by reference.
function deepFreeze(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
}

const def = createDefaultSong();
const ring = (r) => ({ hits: r.hits, shift: r.shift, pattern: [...r.pattern] });
const KICK_ONLY = { drums: { rings: { kick: ring(def.drums.rings.kick) } } };
const DEFAULT_DRUMS = {
  drums: { rings: { kick: ring(def.drums.rings.kick), snare: ring(def.drums.rings.snare), hat: ring(def.drums.rings.hat) } },
};
const CHORDS = { chords: { prog: ["I", "V", "vi", "IV"] } };
const BASS_KICK = { bass: { style: "kick" } };
const cells = (notes) => ({
  melody: {
    cells: Array.from({ length: 32 }, (_, c) => ({ row: c in notes ? notes[c] : -1, tie: false })),
  },
});
const SHORT_MELODY = cells({ 0: 5, 4: 7, 8: 9, 12: 7 });
const FULL_BASE = { ...DEFAULT_DRUMS, ...CHORDS, ...BASS_KICK };

// ---- check helpers ----
const count = (a) => a.filter(Boolean).length;
const acts = (ctx) => ctx.actions;
const has = (ctx, a) => acts(ctx).includes(a);
const prog = (ctx) => ctx.song.chords.prog;
const SAD = ["vi", "iii"];

// Note onsets: cells with a row that are not the continuation of a tie.
const isCont = (c, col) => col > 0 && c[col].tie && c[col - 1].row === c[col].row;
function onsets(song) {
  const c = song.melody.cells;
  const out = [];
  c.forEach((cell, col) => {
    if (cell.row >= 0 && !isCont(c, col)) out.push({ col, row: cell.row });
  });
  return out;
}
// A tied run = a note held across more than one column (counted once per run).
function tiedRuns(song) {
  const c = song.melody.cells;
  return c.filter((cell, col) => cell.row >= 0 && isCont(c, col) && !(col > 1 && isCont(c, col - 1))).length;
}
// Feeling goals (spec §5: the rule is only a hint) also count once the learner says it sounds right.
export const goalMet = (goal, ctx) => goal.check(ctx) || (goal.feeling === true && ctx.actions.includes("self-check"));

const hatHits = (ctx) => acts(ctx).filter((a) => a.startsWith("hat-hits:")).map((a) => Number(a.slice(9)));

export const LEVELS = deepFreeze([
  {
    id: 1, world: 1, title: "Heartbeat",
    coach: ["Every song has a heartbeat you can nod to.", "Slide **hits** to 4 and press Play."],
    startPatch: {},
    tools: ["kick", "sliders"],
    goals: [{
      text: "Give the kick 4 even hits", hint: "Slide the kick's hits slider to 4.",
      check: ({ song }) => {
        const want = euclid(4, 16, 0);
        return song.drums.rings.kick.pattern.every((v, i) => v === want[i]);
      },
    }],
    bonus: { text: "Try 2 hits. Slower feeling?", self: true },
    unlocks: ["kick"],
  },
  {
    id: 2, world: 1, title: "Clap back",
    coach: ["The clap answers the kick: kick… clap… kick… clap.", "That back-and-forth is a groove. Tap the glowing dots."],
    compare: [
      { label: "Kick alone", patch: { drums: { rings: { snare: { hits: 0, shift: 0, pattern: euclid(0, 16, 0) } } } } },
      { label: "Kick + clap", patch: { drums: { rings: { snare: { hits: 2, shift: 4, pattern: euclid(2, 16, 4) } } } } },
    ],
    startPatch: KICK_ONLY,
    tools: ["kick", "snare"],
    goals: [
      { text: "Clap at 3 o'clock", hint: "Tap the clap dot at 3 o'clock.", check: ({ song }) => song.drums.rings.snare.pattern[4] === true },
      { text: "Clap at 9 o'clock", hint: "Tap the clap dot at 9 o'clock.", check: ({ song }) => song.drums.rings.snare.pattern[12] === true },
    ],
    // Bonus counts pattern trues (not the `hits` field) because dots are tapped by hand here.
    bonus: { text: "Add a 3rd clap anywhere", check: ({ song }) => count(song.drums.rings.snare.pattern) >= 3 },
    unlocks: ["snare"],
  },
  {
    id: 3, world: 1, title: "Tick-tock",
    coach: ["Hi-hats are fast little ticks. They add energy.", "Make them calm, then busy."],
    startPatch: DEFAULT_DRUMS,
    tools: ["kick", "snare", "hat", "sliders"],
    goals: [
      { text: "Calm: 4 hits or fewer", hint: "Slide the hat's hits down to 4 or fewer.", check: (ctx) => hatHits(ctx).some((n) => n <= 4) },
      {
        text: "Busy: 8 hits or more", hint: "Now slide the hat's hits up to 8 or more.",
        // Busy only counts when it comes after a calm action.
        check: (ctx) => {
          const h = hatHits(ctx);
          const calm = h.findIndex((n) => n <= 4);
          return calm >= 0 && h.slice(calm + 1).some((n) => n >= 8);
        },
      },
    ],
    bonus: { text: "Tap a dot to make your own pattern", self: true },
    unlocks: ["hat"],
  },
  {
    id: 4, world: 1, title: "Shift it",
    coach: ["Moving a beat off the clock makes it bounce.", "Slide **shift** on the kick and listen."],
    startPatch: DEFAULT_DRUMS,
    tools: [...DRUM_TOOLS, "shift", "kit"],
    goals: [{
      text: "Make the kick bounce", hint: "Slide the kick's shift away from 0.",
      check: ({ song }) => {
        const k = song.drums.rings.kick;
        return k.shift !== 0 || k.pattern.some((v, i) => v && i % 4 !== 0);
      },
    }],
    // Uses the ring's `hits` field, as in the brief.
    bonus: { text: "Try the extra ring", check: ({ song }) => song.drums.rings.perc.hits >= 1 },
    unlocks: ["shift", "perc", "kits:3"],
  },
  {
    id: 5, world: 1, title: "🏆 Slow & heavy",
    coach: ["Boss level! Make a beat that feels slow and heavy."],
    startPatch: DEFAULT_DRUMS,
    tools: [...DRUM_TOOLS, "shift", "kit", "tempo"],
    goals: [
      // Kick count uses pattern trues, robust to hand-tapped dots.
      { text: "Few kicks: 3 or fewer", hint: "Slide the kick's hits down to 3 or fewer.", check: ({ song }) => count(song.drums.rings.kick.pattern) <= 3, feeling: true },
      { text: "Slow tempo: 90 or less", hint: "Slide the tempo down to 90 or less.", check: ({ song }) => song.tempo <= 90, feeling: true },
    ],
    bonus: { text: "Sounds heavy to me ✓", self: true },
    unlocks: ["kits:all", "tempo"],
  },
  {
    id: 6, world: 2, title: "Happy or sad?",
    coach: ["Chords are notes played together. Some sound happy, some sad.", "Listen to both. Which is sad?"],
    compare: [
      { label: "Chord A", patch: { chords: { prog: ["I", "I", "I", "I"] } } },
      { label: "Chord B", patch: { chords: { prog: ["vi", "vi", "vi", "vi"] } } },
    ],
    quiz: { answer: 1 },
    startPatch: DEFAULT_DRUMS,
    tools: ["chords"],
    goals: [{ text: "Pick the sad one", hint: "Listen to Chord A and Chord B, then pick the sad one.", check: (ctx) => has(ctx, "quiz:correct") }],
    unlocks: ["chords"],
  },
  {
    id: 7, world: 2, title: "Chord journey",
    coach: ["Chords go on a trip and come home.", "Fill all 4 bars. End on **C** to come home."],
    startPatch: DEFAULT_DRUMS,
    tools: ["chords", "suggest", ...DRUM_TOOLS],
    goals: [
      { text: "Fill all 4 bars", hint: "Pick a chord for every one of the 4 bars.", check: (c) => prog(c).every((d) => d != null) },
      {
        text: "Come home", hint: "Make the last bar the C chord.",
        check: (c) => { const p = prog(c); return p[3] === "I" || (p[0] === "I" && p[3] === "V"); },
      },
    ],
    bonus: { text: "Use a ★ chord", check: (c) => { const p = prog(c); return p.some((d, i) => i < 3 && d != null && (NEXT[d] ?? []).includes(p[i + 1])); } },
    unlocks: ["suggest"],
  },
  {
    id: 8, world: 2, title: "Paint a feeling",
    coach: ["Start on a sad chord and the whole song turns sad.", "Then try a dreamy **maj7** chord."],
    startPatch: DEFAULT_DRUMS,
    tools: ["chords", "suggest", "maj7", "rhythm"],
    goals: [
      { text: "Start sad", hint: "Make the first bar Am or Em.", check: (c) => SAD.includes(prog(c)[0]) },
      { text: "Use a dreamy chord", hint: "Put Cmaj7 or Fmaj7 in any bar.", check: (c) => prog(c).some((d) => d === "Imaj7" || d === "IVmaj7"), feeling: true },
    ],
    bonus: { text: "Change the chord rhythm", check: ({ song }) => song.chords.rhythm !== "hold" },
    unlocks: ["maj7", "rhythm"],
  },
  {
    id: 9, world: 2, title: "🏆 Rainy-day soundtrack",
    coach: ["Boss level! Make music for a rainy day."],
    startPatch: DEFAULT_DRUMS,
    tools: ["chords", "suggest", "maj7", "rhythm", "instruments", ...DRUM_TOOLS],
    goals: [{ text: "At least 2 sad chords", hint: "Use Am or Em in at least 2 bars.", check: (c) => prog(c).filter((d) => SAD.includes(d)).length >= 2, feeling: true }],
    bonus: { text: "Sounds rainy to me ✓", self: true },
    unlocks: ["chord-instruments:5"],
  },
  {
    id: 10, world: 3, title: "Weight",
    coach: ["Bass gives music its weight.", "Mute it, unmute it. Hear the difference?"],
    compare: [
      { label: "With bass", patch: { bass: { style: "kick" } } },
      { label: "Without bass", patch: { bass: { style: "off" } } },
    ],
    startPatch: FULL_BASE,
    tools: ["bass", ...DRUM_TOOLS, "chords"],
    goals: [
      { text: "Mute the bass", hint: "Press the mute button on the bass.", check: (c) => has(c, "mute:bass") },
      {
        text: "Unmute it", hint: "Press the mute button on the bass again.",
        check: (c) => { const a = acts(c); const i = a.indexOf("mute:bass"); return i >= 0 && a.indexOf("unmute:bass", i) >= 0; },
      },
      { text: "Pick a bass style", hint: "Choose any style in the bass panel.", check: (c) => has(c, "bass-style") },
    ],
    unlocks: ["bass"],
  },
  {
    id: 11, world: 4, title: "Draw a hill",
    coach: ["A tune is a shape. Higher = higher notes.", "Draw a hill: go up, then come down."],
    startPatch: FULL_BASE,
    tools: ["melody", ...DRUM_TOOLS, "chords", "bass"],
    goals: [{
      text: "Draw a hill", hint: "Draw at least 4 notes that climb to a peak and then come back down.",
      check: ({ song }) => {
        const n = onsets(song);
        if (n.length < 4) return false;
        const peak = n.reduce((b, x) => (x.row > b.row ? x : b));
        const first = n[0];
        const last = n[n.length - 1];
        return peak.col > first.col && peak.col < last.col && first.row < peak.row && last.row < peak.row;
      },
    }],
    bonus: { text: "Use 2 long notes", check: ({ song }) => tiedRuns(song) >= 2 },
    unlocks: ["melody"],
  },
  {
    id: 12, world: 4, title: "Question & answer",
    coach: ["Good tunes ask a question, then answer it.", "End your tune on **C**, the home note."],
    startPatch: FULL_BASE,
    tools: [...DRUM_TOOLS, "shift", "kit", "tempo", "chords", "suggest", "maj7", "rhythm", "bass", "melody", "melodyTools", "undo"],
    goals: [{
      text: "End at home", hint: "Make the last note in the second half of the grid a C.",
      // Key root rows are those with row % 5 === 0.
      check: ({ song }) => {
        const n = onsets(song).filter((x) => x.col >= 16);
        return n.length > 0 && n[n.length - 1].row % 5 === 0;
      },
    }],
    bonus: { text: "Try 🎲 Idea, then make it yours", self: true },
    unlocks: ["melodyTools", "undo"],
  },
  {
    id: 13, world: 5, title: "Same song, new clothes",
    coach: ["Instruments change the feeling, not the song.", "Make it a lullaby, then a video game."],
    startPatch: { ...FULL_BASE, ...SHORT_MELODY },
    tools: ["instruments", ...DRUM_TOOLS, "chords", "bass", "melody"],
    goals: [{
      text: "Change 2 instruments", hint: "Pick a new instrument for 2 different layers.",
      check: (c) => new Set(acts(c).filter((a) => a.startsWith("instrument:"))).size >= 2,
    }],
    bonus: { text: "Sounds like a lullaby ✓", self: true },
    unlocks: ["instruments:all"],
  },
  {
    id: 14, world: 5, title: "Mix it",
    coach: ["Every part needs its own space.", "Try volume, solo and space."],
    startPatch: { ...FULL_BASE, ...SHORT_MELODY },
    tools: ALL_TOOLS,
    goals: [
      { text: "Change a volume", hint: "Slide any layer's volume.", check: (c) => has(c, "volume") },
      { text: "Solo a layer", hint: "Press the solo button on a layer.", check: (c) => has(c, "solo") },
      { text: "Add space", hint: "Slide any layer's space.", check: (c) => has(c, "space") },
    ],
    unlocks: ["mixer", "key"],
  },
  {
    id: 15, world: 5, title: "🌟 Your first track",
    coach: ["Now it's all yours. Make a song you love.", "Then share it or save it."],
    startPatch: FULL_BASE,
    tools: ALL_TOOLS,
    goals: [
      {
        text: "All 4 layers playing", hint: "Make sure drums, chords, bass and melody all have something in them.",
        check: ({ song }) =>
          Object.values(song.drums.rings).some((r) => r.pattern.some(Boolean)) &&
          song.chords.prog.some((d) => d != null) &&
          song.bass.style !== "off" &&
          song.melody.cells.some((c) => c.row >= 0),
      },
      { text: "Share or save", hint: "Press Share, or save a WAV file.", check: (c) => has(c, "share") || has(c, "wav") },
    ],
    unlocks: ["graduate"],
  },
]);
