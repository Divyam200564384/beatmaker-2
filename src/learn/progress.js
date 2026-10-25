import { safeGet, safeSet } from "../storage.js";
import { KITS, INSTRUMENTS } from "../audio/catalog.js";

const KEY = "bm2.progress";
const LAST = 15;

const fresh = () => ({ stars: {}, current: 1 });

export function loadProgress() {
  const raw = safeGet(KEY);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fresh();
  const { stars, current } = raw;
  if (!stars || typeof stars !== "object" || Array.isArray(stars)) return fresh();
  if (!Number.isInteger(current) || current < 1 || current > LAST) return fresh();
  const clean = {};
  for (const [id, n] of Object.entries(stars)) {
    if (!Number.isInteger(n) || n < 0 || n > 3) return fresh();
    clean[id] = n;
  }
  return { stars: clean, current };
}

export const saveProgress = (p) => safeSet(KEY, p);

export function completeLevel(p, id, stars) {
  return {
    stars: { ...p.stars, [id]: Math.max(p.stars[id] ?? 0, stars) },
    current: Math.min(LAST, Math.max(p.current, id + 1)),
  };
}

export const isUnlocked = (p, id) => id <= p.current;

export const CHORD_INSTRUMENTS = [
  "electric_piano_1", "acoustic_grand_piano", "pad_2_warm", "string_ensemble_1", "acoustic_guitar_nylon",
];

export function allowedItems(p) {
  const done = (id) => (p.stars[id] ?? 0) >= 1;
  const kits = done(5) ? KITS.map((k) => k.id) : done(4) ? KITS.slice(0, 3).map((k) => k.id) : ["TR-808"];
  const chordInstruments = done(9) ? CHORD_INSTRUMENTS : ["electric_piano_1"];
  // Brief only defines "all after level 13"; before that, offer the chord picks plus the default bass and melody voices.
  const instruments = done(13)
    ? INSTRUMENTS.map((i) => i.id)
    : [...CHORD_INSTRUMENTS, "electric_bass_finger", "marimba", "music_box", "lead_1_square"];
  return { kits, chordInstruments, instruments };
}

export function starsFor({ goalsMet, usedHint, bonusMet }) {
  if (!goalsMet) return 0;
  return 1 + (usedHint ? 0 : 1) + (bonusMet && !usedHint ? 1 : 0);
}
