const STEPS = 64;
const INTERVAL_MS = 25;
const HORIZON = 0.12;
const START_DELAY = 0.06;
const RESYNC_LATE = 0.1;
const RESYNC_AHEAD = 0.05;
const FALLBACK_BPM = 96;

// A NaN/zero tempo would make every step time NaN and spin the tick loop forever.
const safeBpm = (bpm) => (Number.isFinite(bpm) && bpm > 0 ? bpm : FALLBACK_BPM);

export function createClock({ context, getBpm, onStep }) {
  let timer = null;
  let step = 0;
  let lastTime = null; // time of the last emitted step; null before the first
  let pendingTime = 0; // time for the next step when lastTime is null

  function tick() {
    for (;;) {
      // Next step's time is computed lazily so tempo changes apply at once.
      let t = lastTime === null ? pendingTime : lastTime + 60 / safeBpm(getBpm()) / 4;
      if (t < context.currentTime - RESYNC_LATE) {
        t = context.currentTime + RESYNC_AHEAD;
      }
      if (t >= context.currentTime + HORIZON) {
        if (lastTime === null) pendingTime = t;
        return;
      }
      onStep(step, t);
      lastTime = t;
      step = (step + 1) % STEPS;
    }
  }

  return {
    start() {
      if (timer !== null) return;
      step = 0;
      lastTime = null;
      pendingTime = context.currentTime + START_DELAY;
      timer = setInterval(tick, INTERVAL_MS);
      tick();
    },
    stop() {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    },
    isRunning: () => timer !== null,
  };
}
