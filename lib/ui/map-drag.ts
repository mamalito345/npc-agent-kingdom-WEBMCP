/*
 * Shared, render-independent drag-vs-click tracking for the strategy
 * map. The map viewport (strategy-map.tsx) owns panning; settlement
 * and strategic-node buttons live inside it and used to stop the
 * pointerdown from bubbling up, which both broke panning when a drag
 * gesture started on top of an icon AND caused the underlying browser
 * "click" (fired on pointerup at the same element) to select that
 * settlement/node even though the user was only trying to pan.
 *
 * This is intentionally a plain module-level flag rather than React
 * state: it only needs to be read synchronously inside onClick
 * handlers, never to drive a render.
 */

let dragging = false;
let moved = false;

const DRAG_THRESHOLD_PX = 6;

export function beginMapDrag(): void {
  dragging = true;
  moved = false;
}

export function trackMapDragMove(distancePx: number): void {
  if (dragging && distancePx > DRAG_THRESHOLD_PX) {
    moved = true;
  }
}

export function endMapDrag(): void {
  dragging = false;
}

export function wasMapDragged(): boolean {
  return moved;
}
