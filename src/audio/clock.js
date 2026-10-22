const STEPS = 64;
const INTERVAL_MS = 25;
const HORIZON = 0.12;
const START_DELAY = 0.06;
const RESYNC_LATE = 0.1;
const RESYNC_AHEAD = 0.05;

export function createClock({ context, getBpm, onStep }) {
  let timer = null;
  let step = 0;
  let nextTime = 0;

  function tick() {
    if (nextTime < context.currentTime - RESYNC_LATE) {
      nextTime = context.currentTime + RESYNC_AHEAD;
    }
    while (nextTime < context.currentTime + HORIZON) {
      onStep(step, nextTime);
      nextTime += 60 / getBpm() / 4;
      step = (step + 1) % STEPS;
    }
  }

  return {
    start() {
      if (timer !== null) return;
      step = 0;
      nextTime = context.currentTime + START_DELAY;
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
