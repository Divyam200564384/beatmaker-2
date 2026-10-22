import { euclid } from "../music/euclid.js";

export const LAYERS = ["drums", "chords", "bass", "melody"];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ring = (hits, shift) => ({ hits, shift, pattern: euclid(hits, 16, shift) });
const mix = (space = 25) => ({ volume: 80, mute: false, solo: false, space });
const emptyCells = () => Array.from({ length: 32 }, () => ({ row: -1, tie: false }));

export function createDefaultSong() {
  return {
    tempo: 96,
    key: 0,
    drums: {
      kit: "TR-808",
      perc: "openhat",
      rings: { kick: ring(4, 0), snare: ring(2, 4), hat: ring(8, 0), perc: ring(0, 0) },
      mix: mix(),
    },
    chords: { prog: ["I", "V", "vi", "IV"], rhythm: "hold", instrument: "electric_piano_1", mix: mix() },
    bass: { style: "kick", instrument: "electric_bass_finger", mix: mix(0) },
    melody: { cells: emptyCells(), instrument: "marimba", mix: mix() },
  };
}

export function createEmptySong() {
  const s = createDefaultSong();
  return {
    ...s,
    drums: {
      ...s.drums,
      rings: { kick: ring(0, 0), snare: ring(0, 0), hat: ring(0, 0), perc: ring(0, 0) },
    },
    chords: { ...s.chords, prog: [null, null, null, null] },
    bass: { ...s.bass, style: "off" },
  };
}

const withDrums = (song, patch) => ({ ...song, drums: { ...song.drums, ...patch } });

export function setRingEuclid(song, name, hits, shift) {
  const h = clamp(hits, 0, 16);
  const sh = clamp(shift, 0, 15);
  return withDrums(song, { rings: { ...song.drums.rings, [name]: ring(h, sh) } });
}

export function toggleRingStep(song, name, i) {
  const r = song.drums.rings[name];
  const pattern = r.pattern.map((v, j) => (j === i ? !v : v));
  return withDrums(song, { rings: { ...song.drums.rings, [name]: { ...r, pattern } } });
}

export const setKit = (song, kit) => withDrums(song, { kit });
export const setPerc = (song, perc) => withDrums(song, { perc });

export const setChord = (song, bar, degree) => ({
  ...song,
  chords: { ...song.chords, prog: song.chords.prog.map((d, i) => (i === bar ? degree : d)) },
});
export const setChordRhythm = (song, rhythm) => ({ ...song, chords: { ...song.chords, rhythm } });
export const setBassStyle = (song, style) => ({ ...song, bass: { ...song.bass, style } });

export const setMelodyCell = (song, col, row, tie) => ({
  ...song,
  melody: {
    ...song.melody,
    cells: song.melody.cells.map((c, i) => (i === col ? { row, tie } : c)),
  },
});
export const clearMelody = (song) => ({ ...song, melody: { ...song.melody, cells: emptyCells() } });

export const setInstrument = (song, layer, id) => ({
  ...song,
  [layer]: { ...song[layer], instrument: id },
});

export function setMix(song, layer, partial) {
  const m = { ...song[layer].mix, ...partial };
  m.volume = clamp(m.volume, 0, 100);
  m.space = clamp(m.space, 0, 100);
  return { ...song, [layer]: { ...song[layer], mix: m } };
}

export const setTempo = (song, bpm) => ({ ...song, tempo: clamp(bpm, 70, 140) });
export const setKey = (song, k) => ({ ...song, key: ((k % 12) + 12) % 12 });

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function merge(base, patch) {
  if (!isObj(base) || !isObj(patch)) return patch;
  const out = { ...base };
  for (const k of Object.keys(patch)) out[k] = k in base ? merge(base[k], patch[k]) : patch[k];
  return out;
}
export const applyPatch = (song, patch) => merge(song, patch);
