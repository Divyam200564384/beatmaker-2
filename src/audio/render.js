import { renderOffline, Reverb } from "smplr";
import { LAYERS } from "../song/model.js";
import { notesAt } from "../music/arrange.js";
import { createMixer, sendFor } from "./mixer.js";
import { loadInstrument, loadKit, ringSampleMap } from "./loaders.js";

const LOOPS = 2;
const STEPS = 64;

// Renders two loops of the song (plus a 2 s tail) to a 16-bit stereo WAV Blob.
export async function renderSongWav(song) {
  const stepDur = 60 / song.tempo / 4;
  const loopSec = STEPS * stepDur;
  const result = await renderOffline(
    async (ctx) => {
      // Same graph as live playback: instrument -> layer gain -> master -> compressor, reverb -> master.
      const mixer = createMixer(ctx);
      mixer.apply(song, { instant: true });
      let reverb = null;
      try {
        reverb = Reverb(ctx);
        reverb.connect(mixer.output);
        await reverb.ready();
      } catch {
        reverb = null; // Render dry rather than fail when the reverb can't run offline.
      }
      const [kit, chords, bass, melody] = await Promise.all([
        loadKit(ctx, song.drums.kit, { destination: mixer.input("drums") }),
        loadInstrument(ctx, song.chords.instrument, { destination: mixer.input("chords") }),
        loadInstrument(ctx, song.bass.instrument, { destination: mixer.input("bass") }),
        loadInstrument(ctx, song.melody.instrument, { destination: mixer.input("melody") }),
      ]);
      const insts = { drums: kit.inst, chords, bass, melody };
      // Instrument volume stays at smplr's default, as live; the layer gains do the mixing.
      if (reverb) for (const l of LAYERS) insts[l].output.addEffect("reverb", reverb, sendFor(song, l));
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
