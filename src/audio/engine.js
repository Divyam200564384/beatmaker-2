import { Reverb } from "smplr";
import { LAYERS } from "../song/model.js";
import { notesAt } from "../music/arrange.js";
import { createClock } from "./clock.js";
import { createMixer } from "./mixer.js";
import { loadInstrument, loadKit, ringSampleMap } from "./loaders.js";

// Replaced instruments keep sounding their scheduled tails before disposal.
const DISPOSE_DELAY_MS = 4000;
const PREVIEW_SEC = 0.6;

const idFor = (song, layer) => (layer === "drums" ? song.drums.kit : song[layer].instrument);
const sendFor = (song, layer) => song[layer].mix.space / 100;

export function createEngine({ onStep = () => {}, onStatus = () => {} } = {}) {
  let ctx = null;
  let mixer = null;
  let reverb = null;
  let clock = null;
  let song = null;
  let startPromise = null;
  let wantPlaying = false;
  let ringMap = null;
  let ringKey = null;
  const stepTimers = new Set();
  // inst/id: what plays now; requested: latest id asked for; token: latest switch.
  const slots = Object.fromEntries(LAYERS.map((l) => [l, { inst: null, id: null, groups: [], requested: null, token: 0 }]));

  function ensureContext() {
    if (ctx) return;
    ctx = new AudioContext();
    mixer = createMixer(ctx);
    reverb = Reverb(ctx);
    reverb.connect(mixer.output);
    clock = createClock({ context: ctx, getBpm: () => song.tempo, onStep: scheduleStep });
    if (song) mixer.apply(song);
  }

  function updateRingMap() {
    const kit = slots.drums;
    if (!kit.inst || !song) return;
    const key = `${kit.id}|${song.drums.perc}`;
    if (key === ringKey) return;
    ringKey = key;
    ringMap = ringSampleMap(kit.groups, song.drums.perc);
  }

  function scheduleStep(step, time) {
    const stepDur = 60 / song.tempo / 4;
    for (const n of notesAt(song, step)) {
      const inst = slots[n.layer].inst;
      if (!inst) continue;
      if (n.layer === "drums") {
        inst.start({ note: ringMap[n.note], time, velocity: n.velocity });
      } else {
        inst.start({ note: n.note, time: time + (n.offset ?? 0), duration: n.steps * stepDur, velocity: n.velocity });
      }
    }
    const timer = setTimeout(() => {
      stepTimers.delete(timer);
      onStep(step);
    }, Math.max(0, (time - ctx.currentTime) * 1000));
    stepTimers.add(timer);
  }

  async function switchLayer(layer, id) {
    ensureContext();
    const slot = slots[layer];
    const token = ++slot.token;
    slot.requested = id;
    const current = () => token === slot.token;
    onStatus({ layer, state: "loading", progress: 0 });
    const onProgress = (p) => {
      if (current() && p && p.total) onStatus({ layer, state: "loading", progress: p.loaded / p.total });
    };
    const destination = mixer.input(layer);
    let loaded;
    try {
      loaded = layer === "drums"
        ? await loadKit(ctx, id, { destination, onProgress })
        : { inst: await loadInstrument(ctx, id, { destination, onProgress }), groups: [] };
    } catch (e) {
      if (current()) onStatus({ layer, state: "error", message: e?.message ?? String(e) });
      return;
    }
    if (!current()) {
      loaded.inst.dispose?.();
      return;
    }
    const old = slot.inst;
    loaded.inst.output.addEffect("reverb", reverb, song ? sendFor(song, layer) : 0);
    slot.inst = loaded.inst;
    slot.id = id;
    slot.groups = loaded.groups;
    if (layer === "drums") {
      ringKey = null;
      updateRingMap();
    }
    if (old) setTimeout(() => old.dispose?.(), DISPOSE_DELAY_MS);
    onStatus({ layer, state: "ready" });
  }

  function setSong(next) {
    song = next;
    if (!ctx) return;
    mixer.apply(song);
    for (const layer of LAYERS) {
      const slot = slots[layer];
      slot.inst?.output.setEffectMix("reverb", sendFor(song, layer));
      const id = idFor(song, layer);
      if (slot.requested !== null && id !== slot.requested) load(layer, id);
    }
    updateRingMap();
  }

  function start(next) {
    if (startPromise) return startPromise;
    if (next) setSong(next);
    wantPlaying = true;
    startPromise = (async () => {
      ensureContext();
      if (ctx.state === "suspended") await ctx.resume();
      await Promise.all(
        LAYERS.filter((l) => !slots[l].inst).map((l) => {
          const id = idFor(song, l);
          // Join a pending load of the same id instead of starting another.
          return slots[l].requested === id && slots[l].pending ? slots[l].pending : load(l, id);
        }),
      );
      if (wantPlaying) clock.start();
    })().finally(() => {
      startPromise = null;
    });
    return startPromise;
  }

  function load(layer, id) {
    const p = switchLayer(layer, id).finally(() => {
      if (slots[layer].pending === p) slots[layer].pending = null;
    });
    slots[layer].pending = p;
    return p;
  }

  function stop() {
    wantPlaying = false;
    clock?.stop();
    for (const t of stepTimers) clearTimeout(t);
    stepTimers.clear();
    for (const l of LAYERS) slots[l].inst?.stop();
  }

  function preview(layer, note) {
    ensureContext();
    if (ctx.state === "suspended") ctx.resume();
    const slot = slots[layer];
    if (!slot.inst) {
      if (song && slot.requested === null) load(layer, idFor(song, layer));
      return;
    }
    const n = layer === "drums" ? (ringMap?.[note] ?? note) : note;
    slot.inst.start({ note: n, time: ctx.currentTime, duration: PREVIEW_SEC, velocity: 100 });
  }

  return {
    start,
    stop,
    setSong,
    switchLayer: (layer, id) => load(layer, id),
    preview,
    isPlaying: () => Boolean(clock?.isRunning()),
  };
}
