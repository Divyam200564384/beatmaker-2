// Order is fixed: the share codec stores the index into INSTRUMENTS and KITS.
export const CATEGORIES = [
  "Keys", "Mallets", "Organs", "Guitars", "Bass", "Strings", "Choir & voice", "Brass",
  "Reeds & winds", "Synth leads", "Synth pads", "Synth FX", "World", "Sound effects",
];

// General MIDI Level 1 program order (0-127), as smplr snake_case ids.
const GM_IDS = [
  "acoustic_grand_piano", "bright_acoustic_piano", "electric_grand_piano", "honkytonk_piano",
  "electric_piano_1", "electric_piano_2", "harpsichord", "clavinet",
  "celesta", "glockenspiel", "music_box", "vibraphone", "marimba", "xylophone", "tubular_bells", "dulcimer",
  "drawbar_organ", "percussive_organ", "rock_organ", "church_organ", "reed_organ", "accordion", "harmonica", "tango_accordion",
  "acoustic_guitar_nylon", "acoustic_guitar_steel", "electric_guitar_jazz", "electric_guitar_clean",
  "electric_guitar_muted", "overdriven_guitar", "distortion_guitar", "guitar_harmonics",
  "acoustic_bass", "electric_bass_finger", "electric_bass_pick", "fretless_bass",
  "slap_bass_1", "slap_bass_2", "synth_bass_1", "synth_bass_2",
  "violin", "viola", "cello", "contrabass", "tremolo_strings", "pizzicato_strings", "orchestral_harp", "timpani",
  "string_ensemble_1", "string_ensemble_2", "synth_strings_1", "synth_strings_2",
  "choir_aahs", "voice_oohs", "synth_choir", "orchestra_hit",
  "trumpet", "trombone", "tuba", "muted_trumpet", "french_horn", "brass_section", "synth_brass_1", "synth_brass_2",
  "soprano_sax", "alto_sax", "tenor_sax", "baritone_sax", "oboe", "english_horn", "bassoon", "clarinet",
  "piccolo", "flute", "recorder", "pan_flute", "blown_bottle", "shakuhachi", "whistle", "ocarina",
  "lead_1_square", "lead_2_sawtooth", "lead_3_calliope", "lead_4_chiff",
  "lead_5_charang", "lead_6_voice", "lead_7_fifths", "lead_8_bass__lead",
  "pad_1_new_age", "pad_2_warm", "pad_3_polysynth", "pad_4_choir",
  "pad_5_bowed", "pad_6_metallic", "pad_7_halo", "pad_8_sweep",
  "fx_1_rain", "fx_2_soundtrack", "fx_3_crystal", "fx_4_atmosphere",
  "fx_5_brightness", "fx_6_goblins", "fx_7_echoes", "fx_8_scifi",
  "sitar", "banjo", "shamisen", "koto", "kalimba", "bagpipe", "fiddle", "shanai",
  "tinkle_bell", "agogo", "steel_drums", "woodblock", "taiko_drum", "melodic_tom", "synth_drum", "reverse_cymbal",
  "guitar_fret_noise", "breath_noise", "seashore", "bird_tweet", "telephone_ring", "helicopter", "applause", "gunshot",
];

const FAMILY_CATEGORY = [0, 1, 2, 3, 4, 5, 5, 7, 8, 8, 9, 10, 11, 12, 12, 13];

const LABEL_OVERRIDES = {
  honkytonk_piano: "Honky-tonk piano",
  lead_8_bass__lead: "Lead 8 (bass + lead)",
};

function labelFor(id) {
  if (LABEL_OVERRIDES[id]) return LABEL_OVERRIDES[id];
  const s = id.replace(/^fx_/, "FX_").replace(/_/g, " ");
  return s[0].toUpperCase() + s.slice(1);
}

export const INSTRUMENTS = [
  ...GM_IDS.map((id, i) => ({
    id,
    label: labelFor(id),
    category: CATEGORIES[i >= 52 && i <= 54 ? 6 : FAMILY_CATEGORY[i >> 3]],
  })),
  { id: "splendid_grand_piano", label: "Grand piano (concert)", category: "Keys" },
];

const DM = "https://smpldsnds.github.io/drum-machines/";
const SP = "https://smpldsnds.github.io/sonic-pi-samples/samples/";
const named = (id, name, label = id) => ({ id, label, source: { type: "name", name } });
const dm = (id, dir, label = id) => ({ id, label, source: { type: "url", url: `${DM}${dir}/dm.json` } });

export const KITS = [
  named("TR-808", "TR-808", "Roland TR-808"),
  named("LM-2", "LM-2", "LinnDrum LM-2"),
  named("Casio-RZ1", "Casio-RZ1", "Casio RZ-1"),
  named("MFB-512", "MFB-512", "MFB-512"),
  named("Roland-CR-8000", "Roland CR-8000", "Roland CR-8000"),
  dm("808-mini", "808-mini", "808 mini"),
  dm("Casio-SK1", "Casio-SK1", "Casio SK-1"),
  dm("Drumtraks", "Sequential-Circuits-Drumtraks", "Sequential Drumtraks"),
  dm("Yamaha-MR10", "Yamaha-MR10", "Yamaha MR-10"),
  {
    id: "Sonic-Pi",
    label: "Sonic Pi",
    source: {
      type: "sampler",
      buffers: {
        kick: `${SP}drum_heavy_kick.m4a`,
        snare: `${SP}drum_snare_hard.m4a`,
        hat: `${SP}drum_cymbal_closed.m4a`,
        openhat: `${SP}drum_cymbal_open.m4a`,
        tom: `${SP}drum_tom_mid_hard.m4a`,
        cowbell: `${SP}drum_cowbell.m4a`,
      },
    },
  },
];

export const RING_CANDIDATES = {
  kick: ["kick", "bd"],
  snare: ["snare", "sd", "clap", "cp"],
  hat: ["hihat-close", "hhclosed", "closedhat", "chihat", "hithat", "hihat-closed", "ch", "hat"],
  openhat: ["hihat-open", "hhopen", "openhat", "ohihat", "oh"],
  tom: ["tom-mid", "mid-tom", "tom-m", "tom"],
  cowbell: ["cowbell", "cb"],
  rim: ["rimshot", "rim", "stick", "clave", "rs"],
};

const FALLBACK = {
  openhat: ["hat"],
  tom: ["snare"],
  cowbell: ["rim", "hat"],
  rim: ["snare"],
};

function findGroup(groupNames, want) {
  const cands = RING_CANDIDATES[want] || [];
  for (const c of cands) {
    const hit = groupNames.find((g) => g.toLowerCase().includes(c));
    if (hit !== undefined) return hit;
  }
  return undefined;
}

// Picks the group that best fits a ring id; `exact` is false when a fallback was used.
export function pickRingSample(groupNames, want) {
  const direct = findGroup(groupNames, want);
  if (direct !== undefined) return { name: direct, exact: true };
  for (const alt of FALLBACK[want] || []) {
    const hit = findGroup(groupNames, alt);
    if (hit !== undefined) return { name: hit, exact: false };
  }
  return { name: groupNames[0], exact: false };
}
