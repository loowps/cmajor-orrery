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

/**
 * Pointer handling lives on the whole lane track rather than on each cell, so a single drag
 * can sweep a curve across many slots. Samples are interpolated between pointer events,
 * because a fast drag reports far fewer positions than the slots it crosses.
 *
 * Holding shift replaces the freehand path with a straight ramp from where the drag began.
 */
export function useStepPainter(options: StepPainterOptions) {
  const isPainting = ref(false)

  /// Where the pointer itself is, rather than each interpolated step it passes through.
  const paintPosition = ref<PaintPosition | null>(null)

  let anchor: PaintPosition | null = null
  let previous: PaintPosition | null = null
  let valuesBeforePaint: number[] = []
  let drawingStraightLine = false

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
    drawingStraightLine = event.shiftKey
    isPainting.value = true

    options.onPaintStart?.()
    options.applyValue(position.slot, position.normalized)
  }

  function onPointerMove(event: PointerEvent) {
    if (!isPainting.value || !anchor || !previous) {
      return
    }

    const position = positionFrom(event)
    paintPosition.value = position

    if (event.shiftKey) {
      if (!drawingStraightLine) {
        drawingStraightLine = true
      }

      options.restoreValues(valuesBeforePaint)
      paintBetween(anchor, position)
      previous = position
      return
    }

    if (drawingStraightLine) {
      drawingStraightLine = false
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
    drawingStraightLine = false

    options.onPaintEnd?.()
  }

  return { isPainting, paintPosition, onPointerDown, onPointerMove, onPointerUp }
}
