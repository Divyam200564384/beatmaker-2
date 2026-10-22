import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClock } from "./clock.js";

let ctx, bpm, calls, clock;

function advance(seconds) {
  const ticks = Math.round(seconds / 0.025);
  for (let i = 0; i < ticks; i++) {
    ctx.currentTime += 0.025;
    vi.advanceTimersByTime(25);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  ctx = { currentTime: 0 };
  bpm = 120;
  calls = [];
  clock = createClock({
    context: ctx,
    getBpm: () => bpm,
    onStep: (step, time) => calls.push({ step, time }),
  });
});
afterEach(() => {
  clock.stop();
  vi.useRealTimers();
});

describe("clock", () => {
  it("schedules steps 0..4 spaced 0.125 over 0.5 s at 120 BPM", () => {
    clock.start();
    advance(0.5);
    expect(calls.map((c) => c.step)).toEqual([0, 1, 2, 3, 4]);
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i].time - calls[i - 1].time).toBeCloseTo(0.125, 10);
    }
    expect(calls[0].time).toBeCloseTo(0.06, 10);
    expect(clock.isRunning()).toBe(true);
  });

  it("start while running is a no-op", () => {
    clock.start();
    clock.start();
    advance(0.5);
    expect(calls.map((c) => c.step)).toEqual([0, 1, 2, 3, 4]);
  });

  it("wraps from 63 to 0", () => {
    clock.start();
    advance(8.5);
    const steps = calls.map((c) => c.step);
    expect(steps[63]).toBe(63);
    expect(steps[64]).toBe(0);
  });

  it("tempo change applies from next step", () => {
    clock.start();
    advance(0.3);
    const before = calls.length;
    bpm = 60;
    advance(1);
    const after = calls.slice(before - 1);
    // the step already queued keeps its time; later gaps use the new 0.25 s
    const gaps = after.slice(1).map((c, i) => c.time - after[i].time);
    expect(gaps[gaps.length - 1]).toBeCloseTo(0.25, 10);
    expect(gaps.some((g) => Math.abs(g - 0.25) < 1e-9)).toBe(true);
    expect(gaps.every((g) => g <= 0.25 + 1e-9)).toBe(true);
  });

  it("resyncs instead of bursting", () => {
    clock.start();
    advance(0.2);
    const before = calls.length;
    const lastStep = calls[before - 1].step;
    ctx.currentTime += 10;
    vi.advanceTimersByTime(25);
    const fresh = calls.slice(before);
    expect(fresh.length).toBeLessThanOrEqual(2);
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh[0].time).toBeGreaterThanOrEqual(ctx.currentTime);
    expect(fresh[0].step).toBe(lastStep + 1);
  });

  it("stop halts further calls", () => {
    clock.start();
    advance(0.2);
    clock.stop();
    const n = calls.length;
    advance(1);
    expect(calls.length).toBe(n);
    expect(clock.isRunning()).toBe(false);
  });

  it("start after stop restarts at step 0", () => {
    clock.start();
    advance(0.5);
    clock.stop();
    calls.length = 0;
    clock.start();
    advance(0.1);
    expect(calls[0].step).toBe(0);
    expect(calls[0].time).toBeCloseTo(ctx.currentTime - 0.1 + 0.06, 10);
  });
});
