import { renderOffline, Reverb } from "smplr";
import { LAYERS } from "../song/model.js";
import { notesAt } from "../music/arrange.js";
import { effectiveGains } from "./mixer.js";
import { loadInstrument, loadKit, ringSampleMap } from "./loaders.js";

const LOOPS = 2;
const STEPS = 64;

// Renders two loops of the song (plus a 2 s tail) to a 16-bit stereo WAV Blob.
export async function renderSongWav(song) {
  const stepDur = 60 / song.tempo / 4;
  const loopSec = STEPS * stepDur;
  const result = await renderOffline(
    async (ctx) => {
      const destination = ctx.destination;
      let reverb = null;
      try {
        reverb = Reverb(ctx);
        reverb.connect(destination);
        await reverb.ready();
      } catch {
        reverb = null; // Render dry rather than fail when the reverb can't run offline.
      }
      const [kit, chords, bass, melody] = await Promise.all([
        loadKit(ctx, song.drums.kit, { destination }),
        loadInstrument(ctx, song.chords.instrument, { destination }),
        loadInstrument(ctx, song.bass.instrument, { destination }),
        loadInstrument(ctx, song.melody.instrument, { destination }),
      ]);
      const insts = { drums: kit.inst, chords, bass, melody };
      const gains = effectiveGains(song);
      for (const l of LAYERS) {
        insts[l].output.volume = gains[l] * 127;
        if (reverb) insts[l].output.addEffect("reverb", reverb, song[l].mix.space / 100);
      }
      const rings = ringSampleMap(kit.groups, song.drums.perc);
      for (let step = 0; step < LOOPS * STEPS; step++) {
        const t = step * stepDur;
        for (const n of notesAt(song, step % STEPS)) {
          if (n.layer === "drums") {
            insts.drums.start({ note: rings[n.note], time: t, velocity: n.velocity });
          } else {
            insts[n.layer].start({ note: n.note, time: t + (n.offset ?? 0), duration: n.steps * stepDur, velocity: n.velocity });
          }
        }
      }
    },
    { duration: LOOPS * loopSec + 2, sampleRate: 44100, channels: 2 },
  );
  return result.toWav16();
}
