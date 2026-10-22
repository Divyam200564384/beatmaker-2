import { chordRoot, scaleNotesBetween } from "./theory.js";

function walkingApproach(r, nextDegree, key, s2) {
  if (!nextDegree) return r;
  const nr = chordRoot(nextDegree, key);
  let R = nr;
  for (const c of [nr - 12, nr + 12]) if (Math.abs(c - s2) < Math.abs(R - s2)) R = c;
  return scaleNotesBetween(R - 2, R - 1, key).pop();
}

export function bassNotesForBar(song, bar) {
  const { prog } = song.chords;
  const degree = prog[bar];
  if (!degree) return [];
  const key = song.key;
  const r = chordRoot(degree, key);
  switch (song.bass.style) {
    case "kick": {
      const out = [];
      song.drums.rings.kick.pattern.forEach((on, step) => {
        if (on) out.push({ step, note: r, steps: 2 });
      });
      return out;
    }
    case "long":
      return [{ step: 0, note: r, steps: 15.5 }];
    case "bounce": {
      const out = [];
      for (let step = 0; step < 16; step += 2) {
        out.push({ step, note: step % 4 === 0 ? r : r + 12, steps: 1.5 });
      }
      return out;
    }
    case "walking": {
      const [s1, s2] = scaleNotesBetween(r + 1, r + 5, key);
      const a = walkingApproach(r, prog[(bar + 1) % 4], key, s2);
      return [r, s1, s2, a].map((note, i) => ({ step: i * 4, note, steps: 3.5 }));
    }
    default:
      return [];
  }
}
