const MAX_PAST = 100;

export const createHistory = (song) => ({ past: [], present: song, future: [] });

export const push = (h, song) => ({
  past: [...h.past, h.present].slice(-MAX_PAST),
  present: song,
  future: [],
});

export const replace = (h, song) => ({ ...h, present: song });

export const undo = (h) => {
  if (h.past.length === 0) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
  };
};

export const redo = (h) => {
  if (h.future.length === 0) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
  };
};
