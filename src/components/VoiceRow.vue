<script setup lang="ts">
import { computed } from 'vue'
import { useSequencerStore } from '@/stores/sequencer'
import { clamp, maxSteps, minPatternLength, phaseOffsetOf } from '@/models/sequencer.model'
import { resolvePattern } from '@/models/pattern-resolver'
import NumberField from '@/components/NumberField.vue'
import VoiceRangeCell from '@/components/VoiceRangeCell.vue'
import ActionIcon from '@/components/ActionIcon.vue'

const { voiceIndex } = defineProps<{ voiceIndex: number }>()

const store = useSequencerStore()

const voice = computed(() => store.voices[voiceIndex])
const isSelected = computed(() => store.selectedVoiceIndex === voiceIndex)
const isAudible = computed(() => store.isVoiceAudible(voiceIndex))
const noteCount = computed(() => resolvePattern(voice.value).notes.length)

const steps = computed({
  get: () => voice.value.patternLength,
  set: (value) => store.setVoicePatternLength(voiceIndex, value)
})

const density = computed({
  get: () => voice.value.density,
  set: (value) => {
    voice.value.density = clamp(value, 0, 1)
  }
})

const holdAmount = computed({
  get: () => voice.value.holdAmount,
  set: (value) => {
    voice.value.holdAmount = clamp(value, 0, 1)
  }
})

const resetCycleSteps = computed({
  get: () => voice.value.resetCycleSteps,
  set: (value) => {
    voice.value.resetCycleSteps = clamp(Math.round(value), 0, maxSteps)
  }
})

const phaseOffset = computed({
  get: () => phaseOffsetOf(voice.value),
  set: (value) => store.setVoicePhaseOffset(voiceIndex, value)
})
</script>

<template>
  <div class="cell index" :class="{ selected: isSelected, silent: !isAudible }">
    <button title="Edit this voice in the sequencer" @click="store.selectVoice(voiceIndex)">
      {{ voiceIndex + 1 }}
    </button>
  </div>

  <div class="cell">
    <ActionIcon
      name="power"
      :active="voice.enabled"
      :title="voice.enabled ? 'Mute this voice' : 'Unmute this voice'"
      @click="store.toggleVoiceEnabled(voiceIndex)"
    />
  </div>

  <div class="cell">
    <button
      class="state-button solo"
      :class="{ on: store.soloedVoices[voiceIndex] }"
      title="Solo this voice"
      @click="store.toggleVoiceSolo(voiceIndex)"
    >
      Solo
    </button>
  </div>

  <div class="cell">
    <NumberField v-model="steps" :min="minPatternLength" :max="maxSteps" :step="1" />
  </div>

  <div class="cell">
    <NumberField v-model="density" :min="0" :max="1" :step="0.01" />
  </div>

  <div class="cell">
    <NumberField v-model="holdAmount" :min="0" :max="1" :step="0.01" />
  </div>

  <div class="cell reset">
    <NumberField
      v-model="resetCycleSteps"
      :min="0"
      :max="maxSteps"
      :step="1"
      zero-label="Off"
      title="How often every lane snaps back to the start of its window, or Off to let them run"
    />
  </div>

  <div class="cell">
    <NumberField
      v-model="phaseOffset"
      :min="0"
      :max="maxSteps - 1"
      :step="1"
      title="Turns every lane on by this many of its own steps, keeping the offsets they hold against each other"
    />
  </div>

  <div class="cell range">
    <VoiceRangeCell :voice-index="voiceIndex" lane-id="pitch" />
  </div>

  <div class="cell range">
    <VoiceRangeCell :voice-index="voiceIndex" lane-id="gate" />
  </div>

  <div class="cell range">
    <VoiceRangeCell :voice-index="voiceIndex" lane-id="velocity" />
  </div>

  <div class="cell notes">{{ noteCount }}</div>

  <div class="cell">
    <ActionIcon
      name="reset"
      title="Reset every unlocked lane of this voice"
      @click="store.resetVoiceAt(voiceIndex)"
    />
  </div>

  <div class="cell">
    <ActionIcon
      name="dice"
      title="Randomize every unlocked lane of this voice"
      @click="store.randomizeVoiceAt(voiceIndex)"
    />
  </div>
</template>

<style scoped lang="scss">
.cell {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: var(--space-3) 0;
}

.range :deep(.range-field) {
  flex: 1;
  min-width: 0;
}

.index button {
  width: var(--control-size);
  height: var(--control-size);
  display: grid;
  place-items: center;
  line-height: 1;
  background: var(--bg-control);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: var(--text-label);
  cursor: pointer;

  &:hover {
    border-color: var(--border-strong);
  }
}

.index.selected button {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}

.index.silent button {
  color: var(--text-faint);
}

.state-button {
  min-width: 48px;
  padding: var(--control-inset);
  background: var(--bg-control);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-faint);
  font-size: var(--text-small);
  cursor: pointer;
  transition:
    background-color var(--dur-control),
    border-color var(--dur-control),
    color var(--dur-control);

  &:hover {
    border-color: var(--border-strong);
    color: var(--text);
  }

  &.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
  }

  &.solo.on {
    background: var(--marker);
    border-color: var(--marker);
    color: var(--marker-ink);
  }
}

.notes {
  font-size: var(--text-label);
  font-variant-numeric: tabular-nums;
  color: var(--text-faint);
}

.reset {
  gap: var(--space-3);
}
</style>
