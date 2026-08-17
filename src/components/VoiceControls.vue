<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSequencerStore } from '@/stores/sequencer'
import { maxSteps, minPatternLength } from '@/models/sequencer.model'
import NumberField from '@/components/NumberField.vue'
import ActionIcon from '@/components/ActionIcon.vue'
import RandomizeControl from '@/components/RandomizeControl.vue'

const store = useSequencerStore()
const { selectedVoice, selectedVoiceIndex, patternLength, density, holdAmount, resetCycleSteps } =
  storeToRefs(store)
</script>

<template>
  <div class="voice-controls">
    <div class="scope-group">
      <ActionIcon
        name="power"
        :active="selectedVoice.enabled"
        :title="selectedVoice.enabled ? 'Mute this voice' : 'Unmute this voice'"
        @click="store.toggleVoiceEnabled(selectedVoiceIndex)"
      />
      <span class="scope">Voice {{ selectedVoiceIndex + 1 }}</span>
    </div>

    <div class="fields">
      <div class="field">
        <span class="label">Steps</span>
        <NumberField
          v-model="patternLength"
          :min="minPatternLength"
          :max="maxSteps"
          :step="1"
          title="This voice's loop length in 16ths"
        />
      </div>

      <div class="field">
        <span class="label">Density</span>
        <NumberField
          v-model="density"
          :min="0"
          :max="1"
          :step="0.01"
          title="How much of the trigger lane clears the threshold, so how many slots fire"
        />
      </div>

      <div class="field">
        <span class="label">Hold</span>
        <NumberField
          v-model="holdAmount"
          :min="0"
          :max="1"
          :step="0.01"
          title="How much of the hold lane clears the threshold, so how long notes run"
        />
      </div>

      <div class="field">
        <span class="label">Reset every</span>
        <NumberField
          v-model="resetCycleSteps"
          :min="0"
          :max="maxSteps"
          :step="1"
          zero-label="Off"
          title="How often every lane snaps back to the start of its window, or Off to let them run"
        />
      </div>
    </div>

    <div class="actions">
      <ActionIcon
        name="reset"
        title="Reset every unlocked lane of this voice"
        @click="store.resetVoice()"
      />
      <RandomizeControl
        title="Randomize every unlocked lane of this voice"
        @roll="store.randomizeVoice()"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
/**
 * Laid out on the lanes' grid: the voice group takes their header column and the fields start
 * where their tracks do, so the band lines up with the stack beneath rather than merely sharing
 * its left edge.
 */
.voice-controls {
  display: flex;
  align-items: center;
  gap: var(--lane-gutter);
  padding: var(--band-inset);
  background: var(--bg-panel);
  /// The same groove that parts the lanes, so only the header sits behind a bright line.
  border-bottom: 1px solid var(--seam);
}

.scope-group {
  width: var(--lane-header-width);
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.fields {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-7);
}

.scope {
  font-size: 0.68rem;
  letter-spacing: 0.02em;
  color: var(--accent);
}

.field {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.label {
  font-size: 0.68rem;
  letter-spacing: 0.02em;
  color: var(--text-dim);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}
</style>
