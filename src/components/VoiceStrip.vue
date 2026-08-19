<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSequencerStore } from '@/stores/sequencer'
import { resolvePattern } from '@/models/pattern-resolver'

const store = useSequencerStore()
const { voices, selectedVoiceIndex } = storeToRefs(store)

const voiceSummaries = computed(() =>
  voices.value.map((voice, index) => ({
    index,
    enabled: store.isVoiceAudible(index),
    steps: voice.patternLength,
    noteCount: resolvePattern(voice).notes.length
  }))
)
</script>

<template>
  <div class="voice-strip">
    <span class="caption">Voice</span>

    <button
      v-for="summary in voiceSummaries"
      :key="summary.index"
      class="voice"
      :class="{ selected: summary.index === selectedVoiceIndex, muted: !summary.enabled }"
      :title="
        summary.enabled
          ? `${summary.noteCount} notes over ${summary.steps} steps`
          : 'Muted — select to change'
      "
      @click="store.selectVoice(summary.index)"
    >
      {{ summary.index + 1 }}
      <span class="state" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.voice-strip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.caption {
  flex: none;
  margin-right: var(--space-2);
  font-size: var(--text-label);
  letter-spacing: 0.02em;
  color: var(--text-dim);
}

/// The status light is absolutely placed, so the number can sit dead centre rather than making
/// room for it.
.voice {
  position: relative;
  width: var(--control-size);
  height: var(--control-size);
  display: grid;
  place-items: center;
  padding: 0;
  background: var(--bg-control);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: var(--text-label);
  /* Hugs the glyphs, so centring the line box centres what you actually see. */
  line-height: 1;
  cursor: pointer;
  transition:
    border-color var(--dur-control),
    background-color var(--dur-control);

  &:hover {
    background: var(--bg-control-hover);
    border-color: var(--border-strong);
  }

  &.muted {
    color: var(--text-faint);
  }

  &.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
  }
}

/// A status light rather than a control - enabling happens in the voice's own panel.
.state {
  position: absolute;
  left: var(--space-3);
  right: var(--space-3);
  bottom: 3px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent);
}

.voice.selected .state {
  background: var(--accent-ink);
}

.voice.muted .state {
  opacity: 0.22;
}
</style>
