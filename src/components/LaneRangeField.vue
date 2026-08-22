<script setup lang="ts">
import { computed, ref } from 'vue'
import { clamp } from '@/models/sequencer.model'
import NumberField from '@/components/NumberField.vue'

const {
  min = 0,
  max = 1,
  step = 1,
  unit = ''
} = defineProps<{
  min?: number
  max?: number
  step?: number
  unit?: string
}>()

const low = defineModel<number>('low', { required: true })
const high = defineModel<number>('high', { required: true })

type DragMode = 'low' | 'high' | 'span'

const dragMode = ref<DragMode | null>(null)
const railElement = ref<HTMLElement | null>(null)

let grabbedValue = 0
let lowWhenGrabbed = 0
let spanWhenGrabbed = 0

const lowFraction = computed(() => fractionOf(low.value))
const highFraction = computed(() => fractionOf(high.value))

function fractionOf(value: number) {
  return max === min ? 0 : clamp((value - min) / (max - min), 0, 1) * 100
}

function quantize(value: number) {
  return clamp(Number((Math.round(value / step) * step).toFixed(4)), min, max)
}

function valueFrom(event: PointerEvent) {
  const bounds = railElement.value!.getBoundingClientRect()
  return quantize(min + ((event.clientX - bounds.left) / bounds.width) * (max - min))
}

function onPointerDown(mode: DragMode, event: PointerEvent) {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  dragMode.value = mode
  grabbedValue = valueFrom(event)
  lowWhenGrabbed = low.value
  spanWhenGrabbed = high.value - low.value

  railElement.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragMode.value) {
    return
  }

  const value = valueFrom(event)

  // Each handle stops at the other rather than pushing it, so a range can close but not invert.
  if (dragMode.value === 'low') {
    low.value = Math.min(value, high.value)
    return
  }

  if (dragMode.value === 'high') {
    high.value = Math.max(value, low.value)
    return
  }

  const shifted = clamp(lowWhenGrabbed + (value - grabbedValue), min, max - spanWhenGrabbed)
  low.value = shifted
  high.value = shifted + spanWhenGrabbed
}

function onPointerUp(event: PointerEvent) {
  if (!dragMode.value) {
    return
  }

  railElement.value?.releasePointerCapture(event.pointerId)
  dragMode.value = null
}

/// Bound on the rail alone, so the number fields above it keep the double-click that selects
/// what they hold. The edges go one at a time because that is all the pair exposes, and outwards
/// first so neither write is ever asked to cross the one still standing.
function openToFullRange() {
  high.value = max
  low.value = min
}

const typedLow = computed({
  get: () => low.value,
  set: (value) => {
    low.value = Math.min(value, high.value)
  }
})

const typedHigh = computed({
  get: () => high.value,
  set: (value) => {
    high.value = Math.max(value, low.value)
  }
})
</script>

<template>
  <div class="range-field">
    <div class="values">
      <NumberField
        v-model="typedLow"
        :min="min"
        :max="max"
        :step="step"
        :unit="unit"
        align="left"
        title="Lowest output value — drag to change, click to type"
      />
      <NumberField
        v-model="typedHigh"
        :min="min"
        :max="max"
        :step="step"
        :unit="unit"
        align="right"
        title="Highest output value — drag to change, click to type"
      />
    </div>

    <div
      ref="railElement"
      class="rail"
      :class="{ dragging: dragMode !== null }"
      title="Drag the handles to narrow the range — double-click to open it fully"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dblclick="openToFullRange"
    >
      <div
        class="span"
        :style="{ left: `${lowFraction}%`, width: `${highFraction - lowFraction}%` }"
        title="Drag to move the whole range — double-click to open it fully"
        @pointerdown="onPointerDown('span', $event)"
      />

      <div
        class="handle"
        :style="{ left: `${lowFraction}%` }"
        @pointerdown="onPointerDown('low', $event)"
      />

      <div
        class="handle"
        :style="{ left: `${highFraction}%` }"
        @pointerdown="onPointerDown('high', $event)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
/// Fields and rail share one frame, so the pair reads as a single range control.
.range-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--bg-control);
  border: 1px solid var(--border);
  border-radius: var(--radius);

  &:hover {
    border-color: var(--border-strong);
  }
}

.values {
  display: flex;
}

.values :deep(.number-field) {
  flex: 1;
  width: auto;
  height: 18px;
  background: transparent;
  border-color: transparent;

  &:hover {
    background: var(--bg-control-hover);
  }
}

.rail {
  position: relative;
  height: 6px;
  background: var(--bg-sunken);
  border-radius: var(--radius-sm);
  touch-action: none;
  user-select: none;

  &.dragging {
    cursor: ew-resize;
  }
}

.span {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 2px;
  background: var(--accent-dim);
  border-radius: var(--radius-sm);
  cursor: grab;
  transition: background-color var(--dur-control);

  &:hover {
    background: var(--accent);
  }
}

.handle {
  position: absolute;
  top: -1px;
  bottom: -1px;
  width: 10px;
  margin-left: -5px;
  cursor: ew-resize;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 3.5px;
    width: 3px;
    background: var(--accent);
    border-radius: 2px;
  }

  &:hover::after {
    background: var(--accent-bright);
  }
}
</style>
