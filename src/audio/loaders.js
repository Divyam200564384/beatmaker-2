import { Soundfont, SplendidGrandPiano, DrumMachine, Sampler } from "smplr";
import { KITS, pickRingSample } from "./catalog.js";

async function ready(inst) {
  try {
    await inst.ready;
    return inst;
  } catch (e) {
    inst.dispose?.();
    throw e;
  }
}

// Resolves with a ready instrument. Soundfonts fall back from MusyngKite to FluidR3_GM once.
export async function loadInstrument(ctx, id, { destination, onProgress } = {}) {
  const opts = { destination, onLoadProgress: onProgress };
  if (id === "splendid_grand_piano") return ready(SplendidGrandPiano(ctx, opts));
  try {
    return await ready(Soundfont(ctx, { ...opts, instrument: id, kit: "MusyngKite" }));
  } catch {
    return ready(Soundfont(ctx, { ...opts, instrument: id, kit: "FluidR3_GM" }));
  }
}

// Resolves with { inst, groups } for a KITS id.
export async function loadKit(ctx, kitId, { destination, onProgress } = {}) {
  const kit = KITS.find((k) => k.id === kitId);
  if (!kit) throw new Error(`Unknown kit: ${kitId}`);
  const src = kit.source;
  const opts = { destination, onLoadProgress: onProgress };
  let inst;
  if (src.type === "name") inst = DrumMachine(ctx, { ...opts, instrument: src.name });
  // smplr only resolves built-in names, so a dm.json URL goes in `url`.
  else if (src.type === "url") inst = DrumMachine(ctx, { ...opts, instrument: kit.id, url: src.url });
  else inst = Sampler(ctx, { ...opts, buffers: src.buffers });
  await ready(inst);
  const named = inst.getGroupNames?.();
  const groups = named && named.length ? named : Object.keys(src.buffers ?? {});
  return { inst, groups };
}

// Maps the arrangement's drum rings to the kit's sample groups.
export function ringSampleMap(groups, perc) {
  return {
    kick: pickRingSample(groups, "kick").name,
    snare: pickRingSample(groups, "snare").name,
    hat: pickRingSample(groups, "hat").name,
    perc: pickRingSample(groups, perc).name,
  };
}
