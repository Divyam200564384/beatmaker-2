import { describe, it, expect } from "vitest";
import { createHistory, push, replace, undo, redo } from "./history.js";

describe("history", () => {
  it("creates", () => {
    expect(createHistory(1)).toEqual({ past: [], present: 1, future: [] });
  });
  it("caps past at 100", () => {
    let h = createHistory(0);
    for (let i = 1; i <= 101; i++) h = push(h, i);
    expect(h.past).toHaveLength(100);
    expect(h.present).toBe(101);
    expect(h.past[0]).toBe(1);
  });
  it("undo/redo round trip", () => {
    const h = push(push(createHistory(0), 1), 2);
    const u = undo(h);
    expect(u.present).toBe(1);
    expect(redo(u)).toEqual(h);
  });
  it("no-ops return same object", () => {
    const h = createHistory(0);
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });
  it("push after undo clears future", () => {
    const h = push(push(createHistory(0), 1), 2);
    expect(push(undo(h), 9).future).toEqual([]);
  });
  it("replace keeps past", () => {
    const h = push(createHistory(0), 1);
    const r = replace(h, 5);
    expect(r.present).toBe(5);
    expect(r.past).toBe(h.past);
  });
});
