import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDefaultSong, setInstrument, setMelodyCell, setMix, setPerc } from "../song/model.js";

const h = vi.hoisted(() => {
  const state = { created: [], auto: true, failNext: [], clock: null, contexts: [] };
  function makeInst(kind, opts) {
    let resolve, reject;
    const ready = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const inst = {
      kind,
      opts,
      ready,
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
      output: { volume: 100, addEffect: vi.fn(), setEffectMix: vi.fn() },
      resolve: () => resolve(),
      reject: (e) => reject(e),
    };
    if (kind === "DrumMachine") {
      inst.getGroupNames = () => ["kick", "snare", "clap", "hihat-close", "hihat-open", "tom-mid", "cowbell", "rimshot"];
    }
    state.created.push(inst);
    const fail = state.failNext.shift();
    if (fail) queueMicrotask(() => inst.reject(new Error(fail)));
    else if (state.auto) queueMicrotask(() => inst.resolve());
    return inst;
  }
  return { state, makeInst };
});

vi.mock("smplr", () => ({
  Soundfont: vi.fn((ctx, opts) => h.makeInst("Soundfont", opts)),
  SplendidGrandPiano: vi.fn((ctx, opts) => h.makeInst("SplendidGrandPiano", opts)),
  DrumMachine: vi.fn((ctx, opts) => h.makeInst("DrumMachine", opts)),
  Sampler: vi.fn((ctx, opts) => h.makeInst("Sampler", opts)),
  Reverb: vi.fn(() => ({ input: {}, connect: vi.fn(), ready: async () => {} })),
  renderOffline: vi.fn(),
}));

vi.mock("./clock.js", () => ({
  createClock: vi.fn((args) => {
    let running = false;
    h.state.clock = {
      args,
      start: vi.fn(() => (running = true)),
      stop: vi.fn(() => (running = false)),
      isRunning: () => running,
    };
    return h.state.clock;
  }),
}));

import { Soundfont, DrumMachine } from "smplr";
import { createEngine } from "./engine.js";
import { loadInstrument } from "./loaders.js";

const flush = () => new Promise((r) => setTimeout(r, 0));
const node = () => ({ connect: vi.fn(), gain: { value: 1, setTargetAtTime: vi.fn() } });

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = { id: "dest" };
    this.state = "running";
    h.state.contexts.push(this);
  }
  createGain() {
    return node();
  }
  createDynamicsCompressor() {
    return { connect: vi.fn() };
  }
  resume() {
    return Promise.resolve();
  }
}

const AudioCtor = vi.fn((...a) => new FakeAudioContext(...a));
const insts = (kind, id) => h.state.created.filter((i) => i.kind === kind && (!id || i.opts.instrument === id));
const melodySong = () => setMelodyCell(createDefaultSong(), 0, 3, false);

let onStep, onStatus;
beforeEach(() => {
  h.state.created.length = 0;
  h.state.contexts.length = 0;
  h.state.auto = true;
  h.state.failNext = [];
  vi.clearAllMocks();
  AudioCtor.mockImplementation((...a) => new FakeAudioContext(...a));
  vi.stubGlobal("AudioContext", function AudioContext(...a) {
    return AudioCtor(...a);
  });
  onStep = vi.fn();
  onStatus = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("engine", () => {
  it("double start creates one context", async () => {
    const engine = createEngine({ onStep, onStatus });
    const song = createDefaultSong();
    const p1 = engine.start(song);
    const p2 = engine.start(song);
    expect(p2).toBe(p1);
    await p1;
    expect(AudioCtor).toHaveBeenCalledTimes(1);
    expect(Soundfont).toHaveBeenCalledTimes(3);
    expect(DrumMachine).toHaveBeenCalledTimes(1);
    expect(h.state.clock.start).toHaveBeenCalledTimes(1);
    expect(engine.isPlaying()).toBe(true);
    expect(onStatus).toHaveBeenCalledWith({ layer: "drums", state: "ready" });
    expect(onStatus).toHaveBeenCalledWith({ layer: "melody", state: "ready" });
  });

  it("routes instruments into mixer layers with a reverb send", async () => {
    const engine = createEngine({ onStep, onStatus });
    await engine.start(createDefaultSong());
    const [chords, bass, melody] = ["electric_piano_1", "electric_bass_finger", "marimba"].map((id) => insts("Soundfont", id)[0]);
    expect(chords.opts.kit).toBe("MusyngKite");
    expect(new Set([chords, bass, melody].map((i) => i.opts.destination)).size).toBe(3);
    expect(bass.output.addEffect).toHaveBeenCalledWith("reverb", expect.anything(), 0);
    expect(melody.output.addEffect).toHaveBeenCalledWith("reverb", expect.anything(), 0.25);
  });

  it("schedules drums by ring sample and melodic notes with duration", async () => {
    const engine = createEngine({ onStep, onStatus });
    await engine.start(melodySong());
    h.state.clock.args.onStep(0, 1);
    const dm = insts("DrumMachine")[0];
    const drumNotes = dm.start.mock.calls.map((c) => c[0].note);
    expect(drumNotes).toEqual(expect.arrayContaining(["kick", "hihat-close"]));
    expect(dm.start.mock.calls[0][0].time).toBe(1);
    const melody = insts("Soundfont", "marimba")[0];
    const ev = melody.start.mock.calls[0][0];
    expect(ev.time).toBe(1);
    expect(ev.duration).toBeCloseTo(2 * (60 / 96 / 4), 10);
    expect(typeof ev.note).toBe("number");
  });

  it("recomputes the perc sample when perc changes", async () => {
    const engine = createEngine({ onStep, onStatus });
    let song = createDefaultSong();
    song = { ...song, drums: { ...song.drums, rings: { ...song.drums.rings, perc: { hits: 16, shift: 0, pattern: Array(16).fill(true) } } } };
    await engine.start(song);
    const dm = insts("DrumMachine")[0];
    h.state.clock.args.onStep(1, 1);
    expect(dm.start.mock.calls.map((c) => c[0].note)).toContain("hihat-open");
    engine.setSong(setPerc(song, "cowbell"));
    h.state.clock.args.onStep(1, 2);
    expect(dm.start.mock.calls.at(-1)[0].note).toBe("cowbell");
  });

  it("calls onStep at audio time", async () => {
    const engine = createEngine({ onStep, onStatus });
    await engine.start(createDefaultSong());
    vi.useFakeTimers();
    h.state.contexts[0].currentTime = 0.5;
    h.state.clock.args.onStep(7, 0.6);
    expect(onStep).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onStep).toHaveBeenCalledWith(7);
  });

  it("switch keeps old until ready", async () => {
    const engine = createEngine({ onStep, onStatus });
    const song = melodySong();
    await engine.start(song);
    const old = insts("Soundfont", "marimba")[0];
    h.state.auto = false;
    engine.setSong(setInstrument(song, "melody", "flute"));
    await flush();
    const next = insts("Soundfont", "flute")[0];
    expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({ layer: "melody", state: "loading" }));
    h.state.clock.args.onStep(0, 1);
    expect(old.start).toHaveBeenCalledTimes(1);
    expect(next.start).not.toHaveBeenCalled();
    next.resolve();
    await flush();
    h.state.clock.args.onStep(0, 2);
    expect(old.start).toHaveBeenCalledTimes(1);
    expect(next.start).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenLastCalledWith({ layer: "melody", state: "ready" });
  });

  it("stale load is discarded", async () => {
    const engine = createEngine({ onStep, onStatus });
    const song = melodySong();
    await engine.start(song);
    h.state.auto = false;
    engine.setSong(setInstrument(song, "melody", "flute"));
    engine.setSong(setInstrument(song, "melody", "violin"));
    await flush();
    const a = insts("Soundfont", "flute")[0];
    const b = insts("Soundfont", "violin")[0];
    b.resolve();
    await flush();
    a.resolve();
    await flush();
    h.state.clock.args.onStep(0, 1);
    expect(b.start).toHaveBeenCalledTimes(1);
    expect(a.start).not.toHaveBeenCalled();
    expect(a.dispose).toHaveBeenCalled();
  });

  it("failed load reports error and keeps the old instrument", async () => {
    const engine = createEngine({ onStep, onStatus });
    const song = melodySong();
    await engine.start(song);
    const old = insts("Soundfont", "marimba")[0];
    h.state.failNext = ["404", "404"];
    engine.setSong(setInstrument(song, "melody", "flute"));
    await flush();
    await flush();
    expect(onStatus).toHaveBeenCalledWith({ layer: "melody", state: "error", message: "404" });
    h.state.clock.args.onStep(0, 1);
    expect(old.start).toHaveBeenCalledTimes(1);
  });

  it("muting via setSong sets the mixer gain target to 0", async () => {
    const engine = createEngine({ onStep, onStatus });
    const song = createDefaultSong();
    await engine.start(song);
    engine.setSong(setMix(song, "drums", { mute: true }));
    const drumsGain = insts("DrumMachine")[0].opts.destination;
    expect(drumsGain.gain.setTargetAtTime.mock.calls.at(-1)[0]).toBe(0);
  });

  it("setSong updates the reverb send", async () => {
    const engine = createEngine({ onStep, onStatus });
    const song = createDefaultSong();
    await engine.start(song);
    engine.setSong(setMix(song, "chords", { space: 60 }));
    expect(insts("Soundfont", "electric_piano_1")[0].output.setEffectMix).toHaveBeenCalledWith("reverb", 0.6);
  });

  it("stop stops the clock and every instrument", async () => {
    const engine = createEngine({ onStep, onStatus });
    await engine.start(createDefaultSong());
    engine.stop();
    expect(h.state.clock.stop).toHaveBeenCalled();
    expect(engine.isPlaying()).toBe(false);
    for (const i of h.state.created) expect(i.stop).toHaveBeenCalled();
  });

  it("preview plays one note now", async () => {
    const engine = createEngine({ onStep, onStatus });
    await engine.start(createDefaultSong());
    engine.stop();
    h.state.contexts[0].currentTime = 3;
    engine.preview("bass", 40);
    const bass = insts("Soundfont", "electric_bass_finger")[0];
    expect(bass.start).toHaveBeenCalledWith(expect.objectContaining({ note: 40, time: 3 }));
    engine.preview("drums", "snare");
    expect(insts("DrumMachine")[0].start).toHaveBeenCalledWith(expect.objectContaining({ note: "snare" }));
  });
});

describe("loadInstrument", () => {
  it("retries with FluidR3_GM when MusyngKite fails", async () => {
    h.state.failNext = ["nope"];
    const inst = await loadInstrument({}, "flute", { destination: null });
    expect(Soundfont).toHaveBeenCalledTimes(2);
    expect(Soundfont.mock.calls[0][1].kit).toBe("MusyngKite");
    expect(Soundfont.mock.calls[1][1].kit).toBe("FluidR3_GM");
    expect(inst).toBe(h.state.created[1]);
  });
});
