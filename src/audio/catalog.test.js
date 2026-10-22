import { describe, it, expect } from "vitest";
import { getSoundfontNames } from "smplr";
import { INSTRUMENTS, CATEGORIES, KITS, pickRingSample } from "./catalog.js";

describe("INSTRUMENTS", () => {
  it("has 129 entries with pinned GM indices", () => {
    expect(INSTRUMENTS).toHaveLength(129);
    const pins = { 0: "acoustic_grand_piano", 4: "electric_piano_1", 10: "music_box", 11: "vibraphone", 12: "marimba",
      24: "acoustic_guitar_nylon", 32: "acoustic_bass", 33: "electric_bass_finger", 38: "synth_bass_1",
      48: "string_ensemble_1", 56: "trumpet", 73: "flute", 81: "lead_2_sawtooth", 89: "pad_2_warm", 127: "gunshot" };
    for (const [i, id] of Object.entries(pins)) expect(INSTRUMENTS[i].id).toBe(id);
    expect(INSTRUMENTS[128]).toEqual({ id: "splendid_grand_piano", label: "Grand piano (concert)", category: "Keys" });
    expect(INSTRUMENTS[4].label).toBe("Electric piano 1");
  });
  it("0-127 ids exist in smplr", () => {
    const names = new Set(getSoundfontNames());
    for (const ins of INSTRUMENTS.slice(0, 128)) expect(names.has(ins.id), ins.id).toBe(true);
  });
  it("ids unique, categories valid, choir 52-54", () => {
    expect(new Set(INSTRUMENTS.map((i) => i.id)).size).toBe(129);
    for (const i of INSTRUMENTS) expect(CATEGORIES).toContain(i.category);
    expect([52, 53, 54].map((i) => INSTRUMENTS[i].category)).toEqual(["Choir & voice", "Choir & voice", "Choir & voice"]);
    expect(INSTRUMENTS[51].category).toBe("Strings");
    expect(INSTRUMENTS[55].category).toBe("Strings");
  });
});

describe("KITS", () => {
  it("has the exact order", () => {
    expect(KITS.map((k) => k.id)).toEqual(["TR-808", "LM-2", "Casio-RZ1", "MFB-512", "Roland-CR-8000", "808-mini",
      "Casio-SK1", "Drumtraks", "Yamaha-MR10", "Sonic-Pi"]);
    expect(KITS[4].source).toEqual({ type: "name", name: "Roland CR-8000" });
    expect(KITS[7].source.url).toBe("https://smpldsnds.github.io/drum-machines/Sequential-Circuits-Drumtraks/dm.json");
    expect(KITS[9].source.type).toBe("sampler");
    expect(Object.keys(KITS[9].source.buffers)).toEqual(["kick", "snare", "hat", "openhat", "tom", "cowbell"]);
  });
});

describe("pickRingSample", () => {
  const a = ["kick", "snare", "clap", "hihat-close", "hihat-open", "cowbell", "rimshot", "tom-low"];
  it("matches candidates", () => {
    expect(pickRingSample(a, "hat")).toEqual({ name: "hihat-close", exact: true });
    expect(pickRingSample(a, "snare").name).toBe("snare");
    expect(pickRingSample(a, "rim").name).toBe("rimshot");
    expect(pickRingSample(a, "tom").name).toBe("tom-low");
  });
  it("falls back to first group", () => {
    expect(pickRingSample(["univox-ch", "univox-sd"], "kick")).toEqual({ name: "univox-ch", exact: false });
  });
  it("uses fallback chain", () => {
    const b = ["kick", "snare", "chihat", "ohihat"];
    expect(pickRingSample(b, "hat").name).toBe("chihat");
    expect(pickRingSample(b, "openhat").name).toBe("ohihat");
    expect(pickRingSample(b, "cowbell")).toEqual({ name: "chihat", exact: false });
  });
});
