import { chordNotes, melodyRows } from "./theory.js";
import { bassNotesForBar } from "./bass.js";

const RINGS = ["kick", "snare", "hat", "perc"];

export function notesAt(song, step) {
  const bar = Math.floor(step / 16) % 4;
  const s = step % 16;
  const out = [];

  for (const ring of RINGS) {
    if (song.drums.rings[ring].pattern[s]) {
      out.push({ layer: "drums", note: ring, velocity: ring === "hat" ? 70 : 110, steps: 1 });
    }
  }

  const degree = song.chords.prog[bar];
  if (degree) {
    const notes = chordNotes(degree, song.key);
    const rhythm = song.chords.rhythm;
    if (rhythm === "hold" && s === 0) {
      for (const note of notes) out.push({ layer: "chords", note, velocity: 65, steps: 15.5 });
    } else if (rhythm === "strum" && (s === 0 || s === 8)) {
      notes.forEach((note, i) =>
        out.push({ layer: "chords", note, velocity: 70, steps: 7.5, offset: i * 0.025 }));
    } else if (rhythm === "pulse" && s % 4 === 0) {
      for (const note of notes) out.push({ layer: "chords", note, velocity: 72, steps: 2 });
    }
  }

  for (const b of bassNotesForBar(song, bar)) {
    if (b.step === s) out.push({ layer: "bass", note: b.note, velocity: 105, steps: b.steps });
  }

  if (s % 2 === 0) {
    const cells = song.melody.cells;
    const col = Math.floor(step / 2) % 32;
    const c = cells[col];
    if (c.row >= 0 && !(c.tie && col > 0 && cells[col - 1].row === c.row)) {
      let n = 1;
      while (col + n < 32 && cells[col + n].tie && cells[col + n].row === c.row) n++;
      out.push({ layer: "melody", note: melodyRows(song.key)[c.row], velocity: 95, steps: 2 * n });
    }
  }
  return out;
}
