export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Order is fixed: the share codec stores the index.
export const DEGREES = ["I", "ii", "iii", "IV", "V", "vi", "Imaj7", "IVmaj7"];

export const FEELINGS = {
  I: "home, happy",
  ii: "soft, gentle",
  iii: "thoughtful",
  IV: "warm, open",
  V: "wants to go home",
  vi: "sad, emotional",
  Imaj7: "dreamy home",
  IVmaj7: "floaty, soft",
};

export const NEXT = {
  I: ["V", "vi", "IV"],
  ii: ["V", "iii"],
  iii: ["vi", "IV"],
  IV: ["V", "I", "ii"],
  V: ["I", "vi", "iii"],
  vi: ["IV", "V", "ii"],
  Imaj7: ["IVmaj7", "vi"],
  IVmaj7: ["iii", "Imaj7", "V"],
};

const ROOT = { I: 0, ii: 2, iii: 4, IV: 5, V: 7, vi: 9, Imaj7: 0, IVmaj7: 5 };
const INTERVALS = {
  I: [0, 4, 7],
  ii: [2, 5, 9],
  iii: [4, 7, 11],
  IV: [5, 9, 12],
  V: [7, 11, 14],
  vi: [9, 12, 16],
  Imaj7: [0, 4, 7, 11],
  IVmaj7: [5, 9, 12, 16],
};
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

const mod = (n, m) => ((n % m) + m) % m;
// Move by octaves only if outside [lo, hi); notes already in range are left alone.
const fold = (n, lo, hi = lo + 12) => {
  while (n < lo) n += 12;
  while (n >= hi) n -= 12;
  return n;
};

export function chordName(degree, key) {
  const root = NOTE_NAMES[mod(ROOT[degree] + key, 12)];
  if (degree.endsWith("maj7")) return root + "maj7";
  return root + (degree === "ii" || degree === "iii" || degree === "vi" ? "m" : "");
}

export function chordNotes(degree, key) {
  return INTERVALS[degree].map((i) => fold(60 + key + i, 55, 68)).sort((a, b) => a - b);
}

export function chordRoot(degree, key) {
  return fold(ROOT[degree] + key, 36);
}

export function scaleNotesBetween(lo, hi, key) {
  const out = [];
  for (let n = lo; n <= hi; n++) if (MAJOR.includes(mod(n - key, 12))) out.push(n);
  return out;
}

export function melodyRows(key) {
  const base = 60 + (key <= 6 ? key : key - 12);
  return [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24].map((o) => base + o);
}
