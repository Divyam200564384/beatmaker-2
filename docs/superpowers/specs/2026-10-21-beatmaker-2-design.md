# Beatmaker 2.0: design

**Status:** awaiting review. **Date:** 2026-10-21.
**Approved prototypes:** `.superpowers/brainstorm/*/content/v2-create-studio.html` (studio) and `learn-mode.html` (Learn mode). They are git-ignored but kept locally.

## 1. Intent

Beatmaker 2.0 is a separate app from Beatmaker v1, which stays as it is at
https://divyam200564384.github.io/beatmaker/.

**Goal (in the user's words):** someone who knows nothing about music can make a
good beat or song *consciously*. They should understand what they are doing, by
building it part after part, and discover that instruments can be combined in
endless ways.

**What the user rejected:**
- v1's sweep lanes, which were confusing and hard to use on a laptop.
- A preset-picking design ("finite sounds… a 0.5 version").

**What they asked for instead:**
- Real, good sounds.
- Every part made by the user.
- **Learn mode:** a game that introduces tools one at a time with very simple
  instructions.
- **Free play:** everything unlocked for people who just want to play.

**Out of scope (decided):**
- Microphone recording. The user dropped it.
- Song sections and arrangement (intro, verse, drop). A possible later version.
- Auto-tune.
- Accounts and a server.

**Success criteria:**
1. A first-time user finishes Learn level 1 without help, on a phone and on a
   laptop.
2. Nothing a user makes can be off-beat or out of key.
3. By level 15 the user has made and shared a full 4-layer loop.
4. In Free play, every tool and all ~128 instruments and 10 drum kits are
   available at once.
5. The user does a listening check and judges that it sounds good.

## 2. The music model (shared by both modes)

**Loop:**
- 4 bars in 4/4. Each bar has 16 steps, so the loop has 64 steps.
- Tempo is 70–140 BPM, 96 by default.
- One song key, C major by default. The Key control transposes the whole song
  to any of the 12 keys, and everything still fits.

**Layers:**

| Layer | What the user does | Guardrail |
|---|---|---|
| 🥁 **Drums**: 4 rings (kick, snare/clap, hi-hat, extra percussion) | Each ring has 16 dots and repeats every bar. **Hits** (0–16) spreads hits evenly (a Euclidean rhythm). **Shift** (0–15) rotates them. Tapping a dot toggles it. Moving a slider after hand edits regenerates the ring from the sliders. | The grid is fixed, so nothing can be off-beat. |
| 🎹 **Chords**: one chord per bar | Tap a bar box, then pick from the palette. **Chord rhythm:** hold, strum or pulse. | The palette holds only chords in the key: I, ii, iii, IV, V, vi, Imaj7 and IVmaj7. Each shows a feeling word. ★ marks the common next chords after the previous bar's chord. |
| 🎸 **Bass**: derived, not drawn | Style: **lock to kick**, long, bounce (octaves), walking or off. | The bass plays the root of each bar's chord. "Lock to kick" plays it on the kick ring's hits. "Walking" steps through scale notes toward the next chord's root. |
| 🎤 **Melody**: drawn | 32 columns (8th notes) × 11 rows of the key's major pentatonic, 2 octaves plus one note. Drawing horizontally makes a held note (tie). Tapping makes separate notes. Eraser, Clear, 🎲 Idea (a random walk), Undo. | Pentatonic rows mean any note fits any palette chord. |

**Feeling words and ★ suggestions** come from the prototype:
- **Feeling words:** I "home, happy", ii "soft", iii "thoughtful", IV "warm",
  V "wants to go home", vi "sad", Imaj7 "dreamy home", IVmaj7 "floaty".
- **★ suggestions:** I→V,vi,IV · ii→V,iii · iii→vi,IV · IV→V,I,ii ·
  V→I,vi,iii · vi→IV,V,ii · Imaj7→IVmaj7,vi · IVmaj7→iii,Imaj7,V.

**Per-layer mix:**
- Each layer has an instrument (or kit), volume, 🔇 mute, 🎧 solo and **space**
  (reverb send, 0–100%).
- Drums choose one kit for all four rings. Each ring maps to a sample group in
  the kit. If a kit has no group for a ring, the nearest group is used, and the
  UI says which one.

**Defaults** for a new song in Free play are the prototype's:
- **Drums:** kick 4 hits, snare on steps 4 and 12, hi-hat 8 hits.
- **Chords:** C G Am F on electric piano.
- **Bass:** bass guitar, lock to kick.
- **Melody:** marimba, starting empty.

## 3. Sounds and licences

Sounds come from smplr 1.1.0 (MIT). Its samples are hosted on GitHub Pages
(gleitz.github.io, smpldsnds.github.io) and load on demand.

| Source | Use | Licence | Obligation |
|---|---|---|---|
| MusyngKite General MIDI soundfont (128 instruments) | Chords, bass and melody instruments | CC BY-SA 3.0 | Credits screen |
| FluidR3_GM soundfont | Fallback if MusyngKite fails to load | CC BY 3.0 | Credits screen |
| Splendid Grand Piano (AKAI Steinway samples) | "Grand piano" option | Public domain | Credit as courtesy |
| smpldsnds drum-machines: TR-808, 808-mini, LM-2, Roland CR-8000, Casio RZ-1, Casio SK-1, MFB-512, Sequential Drumtraks, Yamaha MR-10 | Drum kits | Public domain | Credit as courtesy |
| Sonic Pi drum samples | One extra "Sonic Pi" kit | CC0 | Credit as courtesy |

- **Excluded:** DrumAbuse packs, because their licence is unclear, the
  Hydrogen samples, which are GPL, and the Micro-Rhythmer-12 kit, which has
  no kick.
- **Instrument picker:** the 128 instruments are grouped as Keys, Mallets,
  Organs, Guitars, Bass, Strings, Brass, Reeds and Winds, Synth leads,
  Synth pads, Choir and voice, and World. Groups follow the General MIDI
  families.
- **Loading:**
  - An instrument loads the first time it's picked, with a progress bar.
  - The browser cache serves it after that.
  - A failed load shows "Couldn't load <name>. Retry". The previous
    instrument stays active.

## 4. Free play (the studio)

**Laptop (≥ 900 px):**
- A sticky play bar: Play/Stop, tempo, key, Undo/Redo, Share, Save WAV, and a
  menu with Home and Credits.
- Below it, four layer panels in a 2×2 grid. Each panel header has the
  instrument picker, volume, mute, solo and space.

**Phone:**
- The play bar sits at the top, with a compact overflow menu.
- One layer panel shows at a time. Tabs 🥁 🎹 🎸 🎤 sit at the bottom.
- Touch targets are at least 44 px. Rings scale to the screen width.

**Other studio features:**
- **Live feedback:** ring dots pulse, the current chord box highlights and
  the current melody column is shaded, all in time with the music.
- **Undo/redo:** covers every song change except Play/Stop, keeping the last
  100 steps.
- **Share:**
  - The whole song is encoded in the URL hash: versioned and URL-safe base64.
  - It carries the tempo, key, kit, 4 ring patterns, 4 chords, chord rhythm,
    bass style, 32 melody cells with ties, 4 instruments as General MIDI
    numbers or the grand-piano flag, and each layer's volume, mute and space.
  - Copy to clipboard, with a fallback that shows the link to copy by hand.
  - A bad link starts a default song with a message, as in v1.
- **Save WAV:**
  - Renders 2 loops plus a 2-second tail offline with smplr's renderOffline,
    then downloads a 16-bit stereo WAV.
  - A "Rendering…" status is shown while it runs.
- **The song autosaves** to localStorage, so the last song reopens after a
  reload.

## 5. Learn mode

**Home screen:**
- Two doors. **🎓 Learn** shows "Continue · Level N". **🎛️ Free play**.
- A Credits link.

**Level map:**
- 5 worlds with 15 levels, played in order.
- Earned stars appear under each level. Locked levels are greyed out.
- Any completed level can be replayed.

**A lesson is the studio with a lens.** Each level is data:

```
{ id, world, title, coach: ["one-sentence idea", …],
  compare?: [{ label, songPatch }, …],   // ▶ A / ▶ B listening buttons
  startSong: songPatch,                  // what the level starts with
  tools: [...visible controls],          // everything else hidden
  goals: [{ text, check(song) → bool }], // automatic checks
  bonus?: { text, check(song) | "self" },
  unlocks: [...] }
```

**The coach (🦉):**
- One idea per bubble, at most 2 bubbles before the user acts.
- Very simple words, no jargon without an explanation, at most about 20 words
  per bubble.
- A glowing marker shows where to tap first.

**Stars:**
- ⭐ the level is finished.
- ⭐⭐ the goals were met without pressing Hint.
- ⭐⭐⭐ the bonus was also done.
- Feeling-based goals use a simple rule check plus a **"Sounds right to me ✓"**
  button. The rule check is only a hint and never blocks the user.

**Progress:**
- Stars, the current level and unlocks are saved in localStorage.
- A "Reset progress" option sits in the menu.
- Free play is never locked.

**Levels:**

| # | Level | Idea | Goal check | Unlocks |
|---|---|---|---|---|
| 1 | Heartbeat | "Every song has a pulse you can nod to." | The kick has 4 evenly spaced hits | Kick ring |
| 2 | Clap back | "The clap answers the kick. That's a groove." | Snare/clap on steps 4 and 12 | Clap ring |
| 3 | Tick-tock | "Fast little ticks add energy." | Hi-hat hits changed to 4 or fewer, then 8 or more | Hi-hat ring |
| 4 | Shift it | "Moving beats off the clock makes them bounce." | Kick shift ≠ 0, or a kick off the quarter-note steps | Shift, extra ring, 3 kits |
| 5 | 🏆 Slow & heavy | — | Self-check + rule: kick ≤ 3 hits per bar and tempo ≤ 90 | All kits, tempo |
| 6 | Happy or sad? | "Some chords sound happy, some sad." | Ear quiz: pick the sad one (vi vs I) | Chord box |
| 7 | Chord journey | "Chords take a trip and come home." | All 4 bars filled, and either bar 4 is I (comes home) or bar 1 is I and bar 4 is V (loops back home) | ★ suggestions |
| 8 | Paint a feeling | "Starting on a sad chord makes the whole song sad." | Goal 1 (auto): bar 1 is vi or iii. Goal 2 (self-check): a maj7 chord used, "sounds dreamy" | maj7 chords, chord rhythm |
| 9 | 🏆 Rainy-day soundtrack | — | Self-check + rule: at least 2 sad chords | 5 chord instruments |
| 10 | Weight | "Bass gives music its weight." | The bass was muted and unmuted, and a style was picked | Bass and styles |
| 11 | Draw a hill | "Higher means higher notes. A tune is a shape." | Melody rises and then falls (peak not at either end) | Melody grid |
| 12 | Question & answer | "Good tunes ask, then answer, and end at home." | The last melody note in bars 3–4 is the key's root | 🎲 Idea, undo |
| 13 | Same song, new clothes | "Instruments change the feeling, not the song." | The instrument changed on 2 or more layers | All 128 instruments |
| 14 | Mix it | "Every part needs its own space." | Used volume, solo and space at least once each | Mixer, key |
| 15 | 🌟 Your first track | "Now it's all yours." | All 4 layers non-empty, then Share or Save WAV | 🎓 Graduate badge |

The coach copy above is a draft. Final wording is reviewed in the
implementation plan.

## 6. Architecture

**Stack:**
- React 18 and Vite 5, the same as v1.
- Plain CSS with design tokens.
- smplr 1.1.0 for instruments, reverb and offline rendering.
- Vitest, Testing Library and jsdom for tests, plus playwright-core for
  browser checks.
- No other runtime dependencies.

**Repo:** `C:\Users\wadha\Projects\beatmaker-2`, which is outside OneDrive. It
gets its own GitHub repo `beatmaker-2` and a GitHub Pages deploy (Actions:
test, build, deploy). The Vite `base` is `./`.

| Module | Job | Depends on |
|---|---|---|
| `music/theory.js` | Keys, pentatonic rows, palette chords (degrees → MIDI per key), feelings, ★ table | — |
| `music/euclid.js` | `euclid(hits, steps, shift)` | — |
| `music/bass.js` | Bass notes from chords, kick and style | theory |
| `music/arrange.js` | `notesAt(song, step)` → every note to trigger at that step (drums, chords with rhythm, bass, melody with ties) | all music |
| `song/model.js` | Immutable song, setters with clamping, defaults | theory |
| `song/history.js` | Undo/redo stack (100) | — |
| `song/codec.js` | Song ↔ URL hash (versioned) | model |
| `audio/instruments.js` | smplr wrapper: load and cache by id, progress, fallback kit, ring → kit group mapping | smplr |
| `audio/mixer.js` | Per-layer gain, mute/solo logic, reverb sends | — |
| `audio/clock.js` | Look-ahead scheduler (25 ms tick, 120 ms horizon), `onStep` UI callback | — |
| `audio/render.js` | Offline WAV render | arrange, instruments |
| `learn/levels.js` | The 15 levels as data and their goal checks (pure) | theory |
| `learn/progress.js` | Stars and unlocks in localStorage (with try/catch) | — |
| `ui/…` | Home, Studio (PlayBar, RhythmRings, ChordBoxes, BassPanel, MelodyGrid, LayerHeader), Learn (LevelMap, Lesson, Coach, Goals), Credits | the above |

**Data flow:**
- One `song` state lives in App, with history.
- The scheduler asks `arrange.notesAt(song, step)` for every step and plays
  the notes through `instruments` into `mixer`.
- A lesson is the studio rendered with `tools` and `unlocks` filtering which
  controls show.

## 7. Errors and edge cases

- **Audio start:** audio starts on the first Play tap, because browsers need a
  gesture. Guard against a double tap, so only one AudioContext is created.
- **Loading:** show load progress. When offline or a load fails, show a
  message and a retry button. The app never crashes.
- **iPhone:** when the silent switch is on, iOS mutes Web Audio. Show a
  one-time hint: "No sound? Check your silent switch."
- **localStorage unavailable:** the app works, but progress isn't saved, and a
  one-line notice says so.
- **Volume changes:** use `setTargetAtTime` to avoid zipper noise. That was a
  v1 issue.
- **Stop:** stops scheduling and silences active notes.

## 8. Testing

- **Unit tests, written first (TDD):**
  - theory: chords per key, transposition, ★ table
  - euclid
  - bass (each style)
  - arrange (ties, chord rhythms, solo and mute effects)
  - codec (round trip, bad input, versioning)
  - history
  - every level's goal checks (positive and negative cases)
  - progress
- **Component tests:**
  - ring tap and sliders
  - chord palette
  - melody drawing and ties
  - lesson tool filtering
  - level unlocking
- **Browser checks:** headless Chrome at 1440 px and 375 px. Load instruments,
  play, edit each layer, share-link round trip, WAV export, and complete
  levels 1–2.
- **User acceptance:** a listening and feel check by the user on a phone and a
  laptop.

## 9. Build phases

1. **Foundations:** the music modules, song, codec and history, all TDD.
2. **Sound:** instruments, mixer, clock, render.
3. **Free play studio UI:** responsive, with Share, WAV, autosave and Credits.
4. **Learn mode:** home, map, lesson lens, coach, 15 levels and progress.
5. **Polish and release:** visual design pass, browser checks, user check,
   GitHub repo and Pages deploy.
