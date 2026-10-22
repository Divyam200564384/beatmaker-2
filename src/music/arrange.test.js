import { describe, it, expect } from "vitest";
import { notesAt } from "./arrange.js";
import { createDefaultSong, createEmptySong, setMelodyCell, setChordRhythm } from "../song/model.js";

describe("notesAt", () => {
  it("step 0 of the default song", () => {
    const n = notesAt(createDefaultSong(), 0);
    expect(n.some((x) => x.layer === "drums" && x.note === "kick")).toBe(true);
    expect(n.some((x) => x.layer === "drums" && x.note === "hat" && x.velocity === 70)).toBe(true);
    const chord = n.filter((x) => x.layer === "chords");
    expect(chord.map((x) => x.note)).toEqual([60, 64, 67]);
    expect(chord.every((x) => x.steps === 15.5 && x.velocity === 65)).toBe(true);
    expect(n.some((x) => x.layer === "bass" && x.note === 36 && x.velocity === 105)).toBe(true);
  });
  it("snare at step 4", () => {
    expect(notesAt(createDefaultSong(), 4).some((x) => x.note === "snare")).toBe(true);
  });
  it("strum offsets", () => {
    const s = setChordRhythm(createDefaultSong(), "strum");
    const c = notesAt(s, 0).filter((x) => x.layer === "chords");
    expect(c.map((x) => x.offset)).toEqual([0, 0.025, 0.05]);
    expect(notesAt(s, 8).filter((x) => x.layer === "chords")).toHaveLength(3);
    expect(c[0].steps).toBe(7.5);
  });
  it("pulse", () => {
    const s = setChordRhythm(createDefaultSong(), "pulse");
    expect(notesAt(s, 4).filter((x) => x.layer === "chords")).toHaveLength(3);
    expect(notesAt(s, 2).filter((x) => x.layer === "chords")).toHaveLength(0);
  });
  it("chords use the bar from the step", () => {
    const c = notesAt(createDefaultSong(), 16).filter((x) => x.layer === "chords");
    expect(c.length).toBe(3);
  });
  it("tied melody cells make one long note", () => {
    let s = createEmptySong();
    s = setMelodyCell(s, 0, 0, false);
    s = setMelodyCell(s, 1, 0, true);
    const m = (st) => notesAt(s, st).filter((x) => x.layer === "melody");
    expect(m(0)).toEqual([{ layer: "melody", note: 60, velocity: 95, steps: 4 }]);
    expect(m(2)).toEqual([]);
  });
  it("untied same row is two notes", () => {
    let s = createEmptySong();
    s = setMelodyCell(s, 0, 0, false);
    s = setMelodyCell(s, 1, 0, false);
    expect(notesAt(s, 0).filter((x) => x.layer === "melody")).toHaveLength(1);
    expect(notesAt(s, 2).filter((x) => x.layer === "melody")).toHaveLength(1);
  });
  it("does not wrap past column 31", () => {
    let s = createEmptySong();
    s = setMelodyCell(s, 31, 0, false);
    s = setMelodyCell(s, 0, 0, true);
    expect(notesAt(s, 62).find((x) => x.layer === "melody").steps).toBe(2);
    expect(notesAt(s, 0).filter((x) => x.layer === "melody")).toHaveLength(1);
  });
  it("empty song is silent", () => {
    const s = createEmptySong();
    for (let i = 0; i < 64; i++) expect(notesAt(s, i)).toEqual([]);
  });
});
