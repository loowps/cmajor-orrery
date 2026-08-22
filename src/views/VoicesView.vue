<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSequencerStore } from '@/stores/sequencer'
import VoiceRow from '@/components/VoiceRow.vue'
import RandomizeControl from '@/components/RandomizeControl.vue'
import ActionIcon from '@/components/ActionIcon.vue'

const store = useSequencerStore()
const { voices } = storeToRefs(store)
</script>

<template>
  <main>
    <div class="table">
      <span class="heading">Voice</span>
      <span class="heading">State</span>
      <span class="heading">Solo</span>
      <span class="heading">Steps</span>
      <span class="heading">Density</span>
      <span class="heading">Hold</span>
      <span class="heading">Reset every</span>
      <span class="heading">Phase</span>
      <span class="heading">Pitch</span>
      <span class="heading">Gate</span>
      <span class="heading">Velocity</span>
      <span class="heading">Notes</span>

      <span class="heading action">
        <ActionIcon name="reset" title="Reset every voice" @click="store.resetAllVoices()" />
      </span>

      <span class="heading action">
        <RandomizeControl title="Randomize every voice" @roll="store.randomizeAllVoices()" />
      </span>

      <template v-for="(_voice, index) in voices" :key="index">
        <VoiceRow :voice-index="index" />
      </template>
    </div>
  </main>
</template>

<style scoped lang="scss">
main {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
}

.table {
  display: grid;
  /* Every column is sized to its control rather than sharing the leftover width, so the numbers
     line up down the table. The last one carries the dice-and-amount control in its heading, so
     it is wider than the plain dice buttons in the rows beneath it. */
  grid-template-columns:
    40px 34px 52px 56px 56px 56px 56px 56px
    104px 104px 104px
    46px 34px 74px;
  gap: 0 var(--space-4);
  align-items: center;
  padding: var(--band-inset);
  background: var(--bg-panel);
}

.heading {
  align-self: stretch;
  display: flex;
  align-items: flex-end;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border);
  font-size: var(--text-small);
  letter-spacing: 0.03em;
  color: var(--text-faint);
}

/// Column-header actions, applying the same operation as the column beneath to every voice.
.heading.action {
  padding-bottom: var(--space-2);
}
</style>
