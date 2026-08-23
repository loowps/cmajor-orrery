<script setup lang="ts">
import { computed } from 'vue'
import { useSequencerStore } from '@/stores/sequencer'
import { clamp } from '@/models/sequencer.model'
import ActionIcon from '@/components/ActionIcon.vue'
import NumberField from '@/components/NumberField.vue'

defineProps<{ title: string }>()

const emit = defineEmits<{ roll: [] }>()

const store = useSequencerStore()

const percentage = computed({
  get: () => Math.round(store.randomizeAmount * 100),
  set: (value) => {
    store.randomizeAmount = clamp(value / 100, 0, 1)
  }
})
</script>

<template>
  <div class="randomize">
    <ActionIcon name="dice" :title="title" @click="emit('roll')" />

    <span class="divider" aria-hidden="true" />

    <NumberField
      v-model="percentage"
      :min="0"
      :max="100"
      :step="1"
      unit="%"
      title="How far the dice moves values from where they are"
    />
  </div>
</template>

<style scoped lang="scss">
/// The dice and the amount it will roll with share one frame, so the pair needs no label to say so.
.randomize {
  display: flex;
  align-items: center;
  flex: none;
  background: var(--bg-control);
  border: none;
  border-radius: var(--radius);
}

/// Inset top and bottom, so the pair reads as one well parted rather than as two wells butted up.
.divider {
  width: 1px;
  align-self: stretch;
  margin: var(--space-3) 0;
  background: var(--border);
}

.randomize :deep(.action-icon) {
  background: transparent;
  border: none;
  border-radius: var(--radius) 0 0 var(--radius);
}

/// Borderless inside the frame, so only the hover fill marks it as the half you can drag.
.randomize :deep(.number-field) {
  width: 44px;
  border-radius: 0 var(--radius) var(--radius) 0;
  background: transparent;

  &:hover {
    background: var(--bg-control-hover);
  }
}
</style>
