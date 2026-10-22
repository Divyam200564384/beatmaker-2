import { describe, it, expect, vi } from "vitest";
import { effectiveGains, createMixer } from "./mixer.js";
import { LAYERS } from "../song/model.js";

function song(mixes = {}) {
  const s = {};
  for (const l of LAYERS) {
    s[l] = { mix: { volume: 100, mute: false, solo: false, space: 0, ...(mixes[l] || {}) } };
  }
  return s;
}

describe("effectiveGains", () => {
  it("mute gives 0", () => {
    const g = effectiveGains(song({ drums: { mute: true } }));
    expect(g.drums).toBe(0);
    expect(g.bass).toBe(1);
  });
  it("solo on melody leaves only melody audible", () => {
    const g = effectiveGains(song({ melody: { solo: true } }));
    expect(g.melody).toBeGreaterThan(0);
    expect(g.drums).toBe(0);
    expect(g.chords).toBe(0);
    expect(g.bass).toBe(0);
  });
  it("volume 50 gives 0.5", () => {
    expect(effectiveGains(song({ chords: { volume: 50 } })).chords).toBe(0.5);
  });
  it("muted soloed layer stays silent", () => {
    const g = effectiveGains(song({ melody: { solo: true, mute: true } }));
    expect(g.melody).toBe(0);
  });
});

function fakeCtx() {
  const node = () => ({ connect: vi.fn(), gain: { value: 1, setTargetAtTime: vi.fn() } });
  const ctx = {
    currentTime: 1.5,
    destination: { id: "dest" },
    createGain: vi.fn(node),
    createDynamicsCompressor: vi.fn(() => ({ connect: vi.fn() })),
  };
  return ctx;
}

describe("createMixer", () => {
  it("wires layers -> master -> compressor -> destination", () => {
    const ctx = fakeCtx();
    const mixer = createMixer(ctx);
    const comp = ctx.createDynamicsCompressor.mock.results[0].value;
    expect(mixer.output.connect).toHaveBeenCalledWith(comp);
    expect(comp.connect).toHaveBeenCalledWith(ctx.destination);
    for (const l of LAYERS) {
      expect(mixer.input(l).connect).toHaveBeenCalledWith(mixer.output);
    }
  });
  it("apply ramps each layer gain", () => {
    const ctx = fakeCtx();
    const mixer = createMixer(ctx);
    mixer.apply(song({ drums: { volume: 50 }, bass: { mute: true } }));
    expect(mixer.input("drums").gain.setTargetAtTime).toHaveBeenCalledWith(0.5, 1.5, 0.02);
    expect(mixer.input("bass").gain.setTargetAtTime).toHaveBeenCalledWith(0, 1.5, 0.02);
    expect(mixer.input("chords").gain.setTargetAtTime).toHaveBeenCalledWith(1, 1.5, 0.02);
  });
});
