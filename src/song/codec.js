import { DEGREES } from "../music/theory.js";
import { KITS, INSTRUMENTS } from "../audio/catalog.js";

const VERSION = 1;
const PERCS = ["openhat", "tom", "cowbell", "rim"];
const RHYTHMS = ["hold", "strum", "pulse"];
const STYLES = ["kick", "long", "bounce", "walking", "off"];
const RINGS = ["kick", "snare", "hat", "perc"];
const LAYERS = ["drums", "chords", "bass", "melody"];
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const bad = () => new Error("bad song");

class BitWriter {
  constructor() { this.bits = []; }
  write(value, n) {
    if (!Number.isInteger(value) || value < 0 || value >= 2 ** n) throw bad();
    for (let i = n - 1; i >= 0; i--) this.bits.push((value >> i) & 1);
  }
  toString() {
    let out = "";
    for (let i = 0; i < this.bits.length; i += 6) {
      let v = 0;
      for (let j = 0; j < 6; j++) v = (v << 1) | (this.bits[i + j] || 0);
      out += B64[v];
    }
    return out;
  }
}

class BitReader {
  constructor(str) {
    if (typeof str !== "string" || str.length === 0) throw bad();
    this.bits = [];
    for (const ch of str) {
      const v = B64.indexOf(ch);
      if (v < 0) throw bad();
      for (let i = 5; i >= 0; i--) this.bits.push((v >> i) & 1);
    }
    this.pos = 0;
  }
  read(n) {
    if (this.pos + n > this.bits.length) throw bad();
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | this.bits[this.pos++];
    return v;
  }
}

const indexOrThrow = (i) => {
  if (i < 0) throw bad();
  return i;
};
const pick = (list, i) => {
  if (i >= list.length) throw bad();
  return list[i];
};

export function encodeSong(song) {
  const w = new BitWriter();
  w.write(VERSION, 8);
  w.write(song.tempo - 70, 7);
  w.write(song.key, 4);
  w.write(indexOrThrow(KITS.findIndex((k) => k.id === song.drums.kit)), 4);
  w.write(indexOrThrow(PERCS.indexOf(song.drums.perc)), 2);
  for (const name of RINGS) {
    const r = song.drums.rings[name];
    w.write(r.hits, 5);
    w.write(r.shift, 4);
    if (r.pattern.length !== 16) throw bad();
    for (const on of r.pattern) w.write(on ? 1 : 0, 1);
  }
  for (const d of song.chords.prog) w.write(d === null ? 15 : indexOrThrow(DEGREES.indexOf(d)), 4);
  w.write(indexOrThrow(RHYTHMS.indexOf(song.chords.rhythm)), 2);
  w.write(indexOrThrow(STYLES.indexOf(song.bass.style)), 3);
  if (song.melody.cells.length !== 32) throw bad();
  for (const c of song.melody.cells) {
    w.write(c.row + 1, 4);
    w.write(c.tie ? 1 : 0, 1);
  }
  for (const layer of ["chords", "bass", "melody"]) {
    w.write(indexOrThrow(INSTRUMENTS.findIndex((i) => i.id === song[layer].instrument)), 8);
  }
  for (const layer of LAYERS) {
    const m = song[layer].mix;
    w.write(m.volume, 7);
    w.write(m.mute ? 1 : 0, 1);
    w.write(m.solo ? 1 : 0, 1);
    w.write(m.space, 7);
  }
  return w.toString();
}

export function decodeSong(str) {
  const r = new BitReader(str);
  if (r.read(8) !== VERSION) throw bad();
  const tempo = r.read(7) + 70;
  if (tempo > 140) throw bad();
  const key = r.read(4);
  if (key > 11) throw bad();
  const kit = pick(KITS, r.read(4)).id;
  const perc = pick(PERCS, r.read(2));
  const rings = {};
  for (const name of RINGS) {
    const hits = r.read(5);
    if (hits > 16) throw bad();
    const shift = r.read(4);
    const pattern = [];
    for (let i = 0; i < 16; i++) pattern.push(r.read(1) === 1);
    rings[name] = { hits, shift, pattern };
  }
  const prog = [];
  for (let i = 0; i < 4; i++) {
    const v = r.read(4);
    if (v === 15) prog.push(null);
    else prog.push(pick(DEGREES, v));
  }
  const rhythm = pick(RHYTHMS, r.read(2));
  const style = pick(STYLES, r.read(3));
  const cells = [];
  for (let i = 0; i < 32; i++) {
    const row = r.read(4) - 1;
    if (row > 10) throw bad();
    cells.push({ row, tie: r.read(1) === 1 });
  }
  const inst = {};
  for (const layer of ["chords", "bass", "melody"]) inst[layer] = pick(INSTRUMENTS, r.read(8)).id;
  const mix = {};
  for (const layer of LAYERS) {
    const volume = r.read(7);
    const m = r.read(1) === 1;
    const solo = r.read(1) === 1;
    const space = r.read(7);
    if (volume > 100 || space > 100) throw bad();
    mix[layer] = { volume, mute: m, solo, space };
  }
  return {
    tempo,
    key,
    drums: { kit, perc, rings, mix: mix.drums },
    chords: { prog, rhythm, instrument: inst.chords, mix: mix.chords },
    bass: { style, instrument: inst.bass, mix: mix.bass },
    melody: { cells, instrument: inst.melody, mix: mix.melody },
  };
}
