<script setup lang="ts">
import { computed } from 'vue'
import { useSequencerStore } from '@/stores/sequencer'
import { laneDefinition, type LaneId } from '@/models/sequencer.model'
import LaneRangeField from '@/components/LaneRangeField.vue'

const { voiceIndex, laneId } = defineProps<{ voiceIndex: number; laneId: LaneId }>()

const store = useSequencerStore()

const definition = computed(() => laneDefinition(laneId))
const lane = computed(() => store.voices[voiceIndex].lanes[laneId])

/// Each edge writes through the store so the pair can never end up inverted.
const low = computed({
  get: () => lane.value.outputMin,
  set: (value) => store.setVoiceOutputRange(voiceIndex, laneId, value, lane.value.outputMax)
})

const high = computed({
  get: () => lane.value.outputMax,
  set: (value) => store.setVoiceOutputRange(voiceIndex, laneId, lane.value.outputMin, value)
})
</script>

<template>
  <LaneRangeField
    v-model:low="low"
    v-model:high="high"
    :min="definition.min"
    :max="definition.max"
    :step="definition.step"
    :unit="definition.unit"
  />
</template>
