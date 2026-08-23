<script setup lang="ts">
import { computed, ref } from 'vue'
import { clamp } from '@/models/sequencer.model'

const { start, length, slotCount } = defineProps<{
  start: number
  length: number
  slotCount: number
}>()

const emit = defineEmits<{
  change: [start: number, length: number]
}>()

type DragMode = 'start' | 'end' | 'body'

const dragMode = ref<DragMode | null>(null)
const barElement = ref<HTMLElement | null>(null)

let grabbedSlot = 0
let startWhenGrabbed = 0

const leftPercentage = computed(() => (start / slotCount) * 100)
const widthPercentage = computed(() => (length / slotCount) * 100)

/// A window covering the whole pattern excludes nothing, so it has no bounds worth printing.
const isOpen = computed(() => length >= slotCount)

/**
 * The numerals are dropped rather than clipped once the span is too short to hold them. Measured
 * as a share of the bar rather than in steps, because the bar is the same width whatever the
 * pattern length divides it into.
 */
const showsBounds = computed(() => !isOpen.value && length / slotCount >= 0.05)

function boundaryFrom(event: PointerEvent): number {
  const bounds = barElement.value!.getBoundingClientRect()
  return clamp(Math.round(((event.clientX - bounds.left) / bounds.width) * slotCount), 0, slotCount)
}

function onPointerDown(mode: DragMode, event: PointerEvent) {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  dragMode.value = mode
  grabbedSlot = boundaryFrom(event)
  startWhenGrabbed = start
  barElement.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragMode.value) {
    return
  }

  const boundary = boundaryFrom(event)

  if (dragMode.value === 'start') {
    const newStart = clamp(boundary, 0, start + length - 1)
    emit('change', newStart, start + length - newStart)
    return
  }

  if (dragMode.value === 'end') {
    emit('change', start, clamp(boundary, start + 1, slotCount) - start)
    return
  }

  const shifted = startWhenGrabbed + (boundary - grabbedSlot)
  emit('change', clamp(shifted, 0, slotCount - length), length)
}

function onPointerUp(event: PointerEvent) {
  if (!dragMode.value) {
    return
  }

  barElement.value?.releasePointerCapture(event.pointerId)
  dragMode.value = null
}

/// Bound on the bar rather than on each part of it, so the way out of a window narrowed down to
/// a slot or two is the same gesture wherever the pointer happens to have landed.
function openToWholePattern() {
  emit('change', 0, slotCount)
}
</script>

<template>
  <div
    ref="barElement"
    class="range-bar"
    :class="{ dragging: dragMode !== null }"
    title="Double-click to open the window back up to the whole pattern"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick="openToWholePattern"
  >
    <div
      class="window"
      :style="{ left: `${leftPercentage}%`, width: `${widthPercentage}%` }"
      title="Drag to slide the window through the lane's values — double-click to open it fully"
      @pointerdown="onPointerDown('body', $event)"
    >
      <template v-if="showsBounds">
        <span class="bound from">{{ start + 1 }}</span>
        <span class="bound to">{{ start + length }}</span>
      </template>
    </div>

    <div
      class="handle start"
      :style="{ left: `${leftPercentage}%` }"
      title="Drag to set the window start — double-click to open the window fully"
      @pointerdown="onPointerDown('start', $event)"
    />

    <div
      class="handle end"
      :style="{ left: `${leftPercentage + widthPercentage}%` }"
      title="Drag to set the window end — double-click to open the window fully"
      @pointerdown="onPointerDown('end', $event)"
    />
  </div>
</template>

<style scoped lang="scss">
.range-bar {
  position: relative;
  height: 8px;
  background: var(--range-track);
  border-radius: var(--radius-sm);
  touch-action: none;
  user-select: none;

  &.dragging {
    cursor: ew-resize;
  }
}

/**
 * The window is a control rather than a value, so it takes the grey ramp and leaves brass to the
 * bars above it. Its own numerals ride the two ends of the span, which is where the crushed pair
 * printed inside it was trying to go.
 */
.window {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--window-fill);
  border-radius: var(--radius-sm);
  cursor: grab;
  overflow: hidden;
  transition: background-color var(--dur-control);

  &:hover {
    background: var(--border-strong);
  }
}

/**
 * The span itself already says which slots the window covers, so the exact pair is an answer to
 * a question only asked of the lane being worked on. Held rather than removed, so reading them
 * costs no jump.
 */
.bound {
  position: absolute;
  top: -1px;
  opacity: 0;
  transition: opacity var(--dur-control);
  font-family: var(--font-mono);
  font-size: var(--text-micro);
  line-height: 10px;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  white-space: nowrap;
  pointer-events: none;
}

.bound.from {
  left: 5px;
}

.bound.to {
  right: 5px;
}

/// Dragging keeps them up even when the pointer runs off the bar, which capture lets it do.
.range-bar:hover .bound,
.range-bar.dragging .bound {
  opacity: 1;
}

/// The span itself is what you drag, so the edges are a hit area that only draws a mark once the
/// pointer has found it - two permanent handles would out-weigh the 8px bar they sit on.
.handle {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 11px;
  margin-left: -5.5px;
  cursor: ew-resize;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 4px;
    width: 3px;
    background: transparent;
    border-radius: 1px;
    transition: background-color var(--dur-control);
  }

  &:hover::after {
    background: var(--text);
  }
}
</style>
