# Beatmaker 2

Make music in your browser with real sampled instruments: drums, chords, bass and melody,
looping over four bars. Nothing you make can be off the beat or out of key.

**Live:** https://divyam200564384.github.io/beatmaker-2/

## Two ways to play

- **Learn**: 15 short levels in five worlds (Rhythm, Chords & feelings, Bass, Melody, and
  Sound & final track). Each level teaches one idea, lets you try it straight away, and unlocks
  the next tool or sound. Stars and progress are saved on your device.
- **Free play**: the full studio with everything unlocked. Rhythm rings for the drums, a chord box
  with suggestions, bass styles built from your chords, a melody grid you draw on, about 128
  instruments and 10 drum kits, a mixer (volume, mute, solo, space), undo/redo, a Share link that
  holds the whole song, and Save WAV.

On a laptop the four layers sit in a 2×2 grid; on a phone you switch layers with the tabs at the
bottom.

## Run it

Needs Node 20 or newer.

```sh
npm install
npm run dev                      # dev server on http://127.0.0.1:5173
npm test                         # unit and component tests (Vitest)
node scripts/browser-check.mjs   # end-to-end check in Chrome (see below)
```

`scripts/browser-check.mjs` builds the app, starts `vite preview` on port 4174, runs 13 checks
in your installed Google Chrome (via playwright-core), stops the server, and prints `PASS n/13`.
It exits non-zero if any check fails. The instruments stream from public sample hosts, so it needs
internet. To check a copy that's already running, pass its URL:
`node scripts/browser-check.mjs https://divyam200564384.github.io/beatmaker-2/`.

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Credits

- [smplr](https://github.com/danigb/smplr) (MIT)
- Soundfonts from [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts):
  MusyngKite soundfont, via gleitz/midi-js-soundfonts, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/);
  FluidR3_GM soundfont by Frank Wen, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
- Splendid Grand Piano (AKAI samples, public domain)
- smpldsnds drum-machines (public domain)
- Sonic Pi samples (CC0)
- [Beatmaker v1](https://divyam200564384.github.io/beatmaker/)
