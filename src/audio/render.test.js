import { describe, it, expect, vi } from "vitest";
import { createDefaultSong } from "../song/model.js";

const h = vi.hoisted(() => ({ created: [], blob: { wav: true } }));

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
      await cb({ currentTime: 0, destination: { id: "dest" }, sampleRate: 44100 });
      return { toWav16: () => h.blob };
    }),
  };
});

import { renderOffline } from "smplr";
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
    for (const inst of h.created) expect(inst.output.volume).toBeCloseTo(0.8 * 127, 10);
    expect(h.created.filter((i) => i.kind === "Soundfont")).toHaveLength(3);
  });
});
