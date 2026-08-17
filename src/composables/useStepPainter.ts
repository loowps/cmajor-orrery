import { ref } from 'vue'
import { clamp } from '@/models/sequencer.model'

export interface StepPainterOptions {
  slotCount: () => number
  applyValue: (slot: number, normalized: number) => void
  captureValues: () => number[]
  restoreValues: (values: number[]) => void
  onPaintStart?: () => void
  onPaintEnd?: () => void
}

interface PaintPosition {
  slot: number
  normalized: number
}

/// Command stands in for control on a Mac, where control-click is the context menu.
function isLevelling(event: PointerEvent): boolean {
  return event.ctrlKey || event.metaKey
}

/// Where a modifier wants the line to end, or nothing at all if the drag is freehand.
function lineEndFor(
  event: PointerEvent,
  anchor: PaintPosition,
  position: PaintPosition
): PaintPosition | null {
  if (isLevelling(event)) {
    return { slot: position.slot, normalized: anchor.normalized }
  }

  return event.shiftKey ? position : null
}

/**
 * Pointer handling lives on the whole lane track rather than on each cell, so a single drag
 * can sweep a curve across many slots. Samples are interpolated between pointer events,
 * because a fast drag reports far fewer positions than the slots it crosses.
 *
 * Either modifier replaces the freehand path with a line from where the drag began, redrawn
 * from the values as they were so that the line follows the pointer rather than piling up:
 * shift takes its far end from the pointer's height, control holds the height the drag started
 * at, which levels a run of steps without having to hand-draw a flat one.
 */
export function useStepPainter(options: StepPainterOptions) {
  const isPainting = ref(false)

  /// The value being written at the pointer's slot, which under control is not its height.
  const paintPosition = ref<PaintPosition | null>(null)

  let anchor: PaintPosition | null = null
  let previous: PaintPosition | null = null
  let valuesBeforePaint: number[] = []
  let drawingLine = false

  function positionFrom(event: PointerEvent): PaintPosition {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const slots = options.slotCount()
    const slot = Math.floor(((event.clientX - bounds.left) / bounds.width) * slots)
    const normalized = 1 - (event.clientY - bounds.top) / bounds.height

    return {
      slot: clamp(slot, 0, slots - 1),
      normalized: clamp(normalized, 0, 1)
    }
  }

  function paintBetween(from: PaintPosition, to: PaintPosition) {
    const distance = Math.abs(to.slot - from.slot)

    if (distance === 0) {
      options.applyValue(to.slot, to.normalized)
      return
    }

    const direction = to.slot > from.slot ? 1 : -1

    for (let stepsTaken = 0; stepsTaken <= distance; ++stepsTaken) {
      const progress = stepsTaken / distance
      options.applyValue(
        from.slot + stepsTaken * direction,
        from.normalized + (to.normalized - from.normalized) * progress
      )
    }
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)

    const position = positionFrom(event)

    valuesBeforePaint = options.captureValues()
    anchor = position
    previous = position
    paintPosition.value = position
    drawingLine = event.shiftKey || isLevelling(event)
    isPainting.value = true

    options.onPaintStart?.()
    options.applyValue(position.slot, position.normalized)
  }

  function onPointerMove(event: PointerEvent) {
    if (!isPainting.value || !anchor || !previous) {
      return
    }

    const position = positionFrom(event)
    const lineEnd = lineEndFor(event, anchor, position)

    // The readout belongs to the value, not the pointer, so it rides the line rather than the hand.
    paintPosition.value = lineEnd ?? position

    if (lineEnd) {
      drawingLine = true

      options.restoreValues(valuesBeforePaint)
      paintBetween(anchor, lineEnd)

      // Freehand resumes from where the hand actually is, not from the line it was drawing.
      previous = position
      return
    }

    if (drawingLine) {
      drawingLine = false
      previous = position
    }

    paintBetween(previous, position)
    previous = position
  }

  function onPointerUp(event: PointerEvent) {
    if (!isPainting.value) {
      return
    }

    ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)

    isPainting.value = false
    paintPosition.value = null
    anchor = null
    previous = null
    drawingLine = false

    options.onPaintEnd?.()
  }

  return { isPainting, paintPosition, onPointerDown, onPointerMove, onPointerUp }
}
