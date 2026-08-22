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
      <span class="readout">{{ start }} - {{ start + length }}</span>
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
  height: 13px;
  background: var(--bg-sunken);
  border-radius: var(--radius);
  touch-action: none;
  user-select: none;

  &.dragging {
    cursor: ew-resize;
  }
}

.window {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--accent-dim);
  border-radius: var(--radius);
  cursor: grab;
  overflow: hidden;
  transition: background-color var(--dur-control);

  &:hover {
    background: var(--accent);
  }
}

.readout {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--text-micro);
  font-variant-numeric: tabular-nums;
  color: var(--accent-ink);
  white-space: nowrap;
  pointer-events: none;
}

.handle {
  position: absolute;
  top: -1px;
  bottom: -1px;
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
    background: var(--accent);
    border-radius: 2px;
  }

  &:hover::after {
    background: var(--accent-bright);
  }
}
</style>
