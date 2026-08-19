<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { clamp } from '@/models/sequencer.model'

const {
  min = 0,
  max = 1,
  step = 1,
  unit = '',
  title = '',
  align = 'center',
  zeroLabel = ''
} = defineProps<{
  min?: number
  max?: number
  step?: number
  unit?: string
  title?: string
  align?: 'left' | 'center' | 'right'
  /// Word to show in place of a zero, for fields where zero switches the feature off.
  zeroLabel?: string
}>()

const model = defineModel<number>({ required: true })

const inputElement = useTemplateRef<HTMLInputElement>('inputElement')

const isEditing = ref(false)
const isDragging = ref(false)

const pixelsPerStep = 3
const finePixelsPerStep = 12

let dragOriginY = 0
let valueAtDragStart = 0

const decimals = computed(() => (step < 1 ? 2 : 0))

const displayText = computed(() =>
  zeroLabel && model.value === 0 ? zeroLabel : model.value.toFixed(decimals.value) + unit
)

function quantize(value: number) {
  return clamp(Number((Math.round(value / step) * step).toFixed(4)), min, max)
}

function onPointerDown(event: PointerEvent) {
  if (isEditing.value || event.button !== 0) {
    return
  }

  event.preventDefault()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)

  dragOriginY = event.clientY
  valueAtDragStart = model.value
  isDragging.value = false
}

function onPointerMove(event: PointerEvent) {
  if (!(event.currentTarget as HTMLElement).hasPointerCapture?.(event.pointerId)) {
    return
  }

  const travelled = dragOriginY - event.clientY

  if (!isDragging.value && Math.abs(travelled) < 3) {
    return
  }

  isDragging.value = true

  const perStep = event.shiftKey ? finePixelsPerStep : pixelsPerStep
  model.value = quantize(valueAtDragStart + Math.round(travelled / perStep) * step)
}

function onPointerUp(event: PointerEvent) {
  const element = event.currentTarget as HTMLElement

  if (!element.hasPointerCapture?.(event.pointerId)) {
    return
  }

  element.releasePointerCapture(event.pointerId)

  // A press that never moved is a click, so fall through to typing.
  if (!isDragging.value) {
    beginEditing()
  }

  isDragging.value = false
}

function beginEditing() {
  isEditing.value = true

  requestAnimationFrame(() => {
    inputElement.value?.focus()
    inputElement.value?.select()
  })
}

function commit() {
  const parsed = Number.parseFloat(inputElement.value?.value ?? '')

  if (Number.isFinite(parsed)) {
    model.value = quantize(parsed)
  }

  isEditing.value = false
}

function cancel() {
  isEditing.value = false
}
</script>

<template>
  <div
    class="number-field"
    :class="{ dragging: isDragging, editing: isEditing }"
    :title="title"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <input
      v-if="isEditing"
      ref="inputElement"
      type="text"
      inputmode="decimal"
      :style="{ textAlign: align }"
      :value="model"
      @blur="commit"
      @keydown.enter="commit"
      @keydown.esc="cancel"
    />

    <span v-else class="value" :style="{ textAlign: align }">{{ displayText }}</span>
  </div>
</template>

<style scoped lang="scss">
.number-field {
  position: relative;
  width: 52px;
  height: 22px;
  flex: none;
  background: var(--bg-control);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: ns-resize;
  user-select: none;
  touch-action: none;

  &:hover {
    border-color: var(--border-strong);
    background: var(--bg-control-hover);
  }

  &.dragging {
    border-color: var(--accent);
  }

  &.editing {
    border-color: var(--accent);
    cursor: text;
    user-select: text;
  }
}

.value {
  display: block;
  line-height: 20px;
  font-size: var(--text-label);
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

input {
  width: 100%;
  height: 100%;
  background: transparent;
  border: 0 none;
  outline: none;
  font-size: var(--text-label);
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.value,
input {
  padding: 0 var(--space-2);
}
</style>
