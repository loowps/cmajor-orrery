<script setup lang="ts">
import { computed, useId } from 'vue'

const {
  label = '',
  min = 0,
  max = 1,
  step = 0.0001,
  unit = '',
  decimals = 2
} = defineProps<{
  label?: string
  min?: number
  max?: number
  step?: number
  unit?: string
  decimals?: number
}>()

const model = defineModel<number>({ required: true })

const emit = defineEmits<{
  mouseDown: [MouseEvent]
  valueChange: [number]
}>()

const sliderId = useId()

const fillPercentage = computed(() => ((model.value - min) / (max - min)) * 100 + '%')

const displayValue = computed(() => model.value.toFixed(decimals) + unit)

const onMouseDown = (event: MouseEvent) => {
  emit('mouseDown', event)
}

const onValueChange = (event: Event) => {
  emit('valueChange', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="slider-wrapper">
    <label :for="sliderId">{{ label }}</label>
    <input
      :id="sliderId"
      v-model.number="model"
      class="slider"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      @mousedown="onMouseDown"
      @input="onValueChange"
    />
    <output :for="sliderId">{{ displayValue }}</output>
  </div>
</template>

<style lang="scss" scoped>
.slider-wrapper {
  display: flex;
  gap: var(--space-5);
  place-items: center;
  font-size: 0.68rem;
  color: var(--text-dim);
}

label {
  white-space: nowrap;
  letter-spacing: 0.02em;
}

output {
  min-width: 34px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  min-width: 0;
  outline: none;
  border-radius: 3px;
  height: 4px;
  background: linear-gradient(
    to right,
    var(--accent) v-bind('fillPercentage'),
    var(--bg-sunken) v-bind('fillPercentage')
  );
}

.slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 3px;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 13px;
  width: 13px;
  background-color: var(--accent);
  border-radius: 50%;
  border: none;
  transition: box-shadow 120ms ease;
  transform: translateY(-35%);
}

.slider::-webkit-slider-thumb:hover {
  box-shadow: 0 0 0 5px var(--accent-glow);
  cursor: grab;
}

.slider:active::-webkit-slider-thumb {
  box-shadow: 0 0 0 7px var(--accent-glow);
  cursor: grabbing;
}
</style>
