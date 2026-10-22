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
    apply(song) {
      const gains = effectiveGains(song);
      for (const l of LAYERS) {
        layerGains[l].gain.setTargetAtTime(gains[l], ctx.currentTime, 0.02);
      }
    },
  };
}
