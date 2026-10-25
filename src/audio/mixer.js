import { LAYERS } from "../song/model.js";

export function effectiveGains(song) {
  const anySolo = LAYERS.some((l) => song[l].mix.solo);
  const gains = {};
  for (const l of LAYERS) {
    const { volume, mute, solo } = song[l].mix;
    gains[l] = mute || (anySolo && !solo) ? 0 : volume / 100;
  }
  return gains;
}

// The shared reverb bypasses the layer gain nodes, so the send carries mute/solo/volume itself.
export const sendFor = (song, layer) => (song[layer].mix.space / 100) * effectiveGains(song)[layer];

export function createMixer(ctx) {
  const master = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  master.connect(compressor);
  compressor.connect(ctx.destination);

  const layerGains = {};
  for (const l of LAYERS) {
    layerGains[l] = ctx.createGain();
    layerGains[l].connect(master);
  }

  return {
    output: master,
    input: (layer) => layerGains[layer],
    // Live changes glide; `instant` (offline render) sets the gains before any note plays.
    apply(song, { instant = false } = {}) {
      const gains = effectiveGains(song);
      for (const l of LAYERS) {
        const p = layerGains[l].gain;
        if (instant) p.setValueAtTime(gains[l], ctx.currentTime);
        else p.setTargetAtTime(gains[l], ctx.currentTime, 0.02);
      }
    },
  };
}
