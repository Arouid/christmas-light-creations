// Undo history for the designer: { list: [{ d: design, label }], at }.
// Pure (tested in tests/designer.test.mjs).

export const HISTORY_MAX = 80

export const startHistory = (d, label) => ({ list: [{ d, label }], at: 0 })

// Adds a step after the current one (dropping any redo steps). merge: a
// slider or a typed number changing the same thing again replaces the step
// it made last time, so one drag (or one run of arrow keys) is one undo.
export function pushStep(h, d, label, merge = false) {
  const top = h.list[h.at]
  const same = merge && h.at > 0 && h.at === h.list.length - 1 && top.label === label
  const list = [...h.list.slice(0, same ? h.at : h.at + 1), { d, label }].slice(-HISTORY_MAX)
  return { list, at: list.length - 1 }
}
