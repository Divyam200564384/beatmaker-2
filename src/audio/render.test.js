import { describe, it, expect, vi } from "vitest";
import { createDefaultSong } from "../song/model.js";

const h = vi.hoisted(() => ({ created: [], gains: [], blob: { wav: true }, ctx: null }));

vi.mock("smplr", () => {
  const make = (kind) =>
    vi.fn((ctx, opts) => {
      const inst = {
        kind,
        opts,
        ready: Promise.resolve(),
        start: vi.fn(),
        stop: vi.fn(),
        output: { volume: 100, addEffect: vi.fn(), setEffectMix: vi.fn() },
      };
      if (kind === "DrumMachine") inst.getGroupNames = () => ["kick", "snare", "hihat-close", "hihat-open"];
      h.created.push(inst);
      return inst;
    });
  return {
    Soundfont: make("Soundfont"),
    SplendidGrandPiano: make("SplendidGrandPiano"),
    DrumMachine: make("DrumMachine"),
    Sampler: make("Sampler"),
    Reverb: vi.fn(() => ({ input: {}, connect: vi.fn(), ready: async () => {} })),
    renderOffline: vi.fn(async (cb) => {
      const node = () => {
        const n = { connect: vi.fn(), gain: { value: 1, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn() } };
        h.gains.push(n);
        return n;
      };
      const ctx = {
        currentTime: 0, destination: { id: "dest" }, sampleRate: 44100,
        createGain: vi.fn(node), createDynamicsCompressor: vi.fn(() => ({ connect: vi.fn() })),
      };
      h.ctx = ctx;
      await cb(ctx);
      return { toWav16: () => h.blob };
    }),
  };
});

import { renderOffline, Reverb } from "smplr";
import { effectiveGains, sendFor } from "./mixer.js";
import { renderSongWav } from "./render.js";

describe("renderSongWav", () => {
  it("render: two loops at 44.1 kHz stereo, notes up to step 127, toWav16 result", async () => {
    const song = createDefaultSong();
    const blob = await renderSongWav(song);
    expect(blob).toBe(h.blob);
    expect(renderOffline).toHaveBeenCalledTimes(1);
    const opts = renderOffline.mock.calls[0][1];
    expect(opts).toEqual({ duration: 2 * ((64 * 60) / 96 / 4) + 2, sampleRate: 44100, channels: 2 });
    expect(opts.duration).toBe(22);

    const stepDur = 60 / 96 / 4;
    const times = h.created.flatMap((i) => i.start.mock.calls.map((c) => c[0].time));
    const maxStep = Math.max(...times.map((t) => Math.round(t / stepDur)));
    expect(maxStep).toBeGreaterThanOrEqual(124);
    expect(maxStep).toBeLessThanOrEqual(127);
    expect(times.every((t) => t < 128 * stepDur)).toBe(true);

    const dm = h.created.find((i) => i.kind === "DrumMachine");
    expect(dm.start.mock.calls.filter((c) => c[0].note === "kick")).toHaveLength(32);
    expect(h.created.filter((i) => i.kind === "Soundfont")).toHaveLength(3);
  });
});

describe("renderSongWav mix matches live playback", () => {
  it("routes each instrument into its mixer layer at live volume, with live gains and sends", async () => {
    h.created.length = 0;
    h.gains.length = 0;
    const base = createDefaultSong();
    const song = {
      ...base,
      bass: { ...base.bass, mix: { ...base.bass.mix, volume: 50, space: 40 } },
      chords: { ...base.chords, mix: { ...base.chords.mix, mute: true, space: 60 } },
    };
    await renderSongWav(song);
    const { ctx } = h;
    // master -> compressor -> destination, like the live mixer
    const comp = ctx.createDynamicsCompressor.mock.results[0].value;
    expect(comp.connect).toHaveBeenCalledWith(ctx.destination);
    const [master, ...layerGains] = h.gains;
    expect(master.connect).toHaveBeenCalledWith(comp);
    const layers = ["drums", "chords", "bass", "melody"];
    const byLayer = Object.fromEntries(layers.map((l, i) => [l, layerGains[i]]));
    const inst = (l) => (l === "drums"
      ? h.created.find((i) => i.kind === "DrumMachine")
      : h.created.find((i) => i.kind === "Soundfont" && i.opts.instrument === song[l].instrument));
    const live = effectiveGains(song);
    for (const l of layers) {
      expect(inst(l).opts.destination).toBe(byLayer[l]);
      expect(inst(l).output.volume).toBe(100); // smplr default, as live
      expect(byLayer[l].gain.setValueAtTime).toHaveBeenLastCalledWith(live[l], 0);
      expect(inst(l).output.addEffect).toHaveBeenCalledWith("reverb", expect.anything(), sendFor(song, l));
    }
    expect(sendFor(song, "bass")).toBeCloseTo(0.4 * 0.5, 10);
    expect(sendFor(song, "chords")).toBe(0);
    const reverb = Reverb.mock.results.at(-1).value;
    expect(reverb.connect).toHaveBeenCalledWith(master);
  });
});
