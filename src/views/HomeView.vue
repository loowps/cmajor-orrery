<script setup lang="ts">
import { laneIds } from '@/models/sequencer.model'
import VoiceControls from '@/components/VoiceControls.vue'
import ResolvedRuler from '@/components/ResolvedRuler.vue'
import StepLane from '@/components/StepLane.vue'
</script>

<template>
  <main>
    <VoiceControls />

    <div class="sequencer">
      <ResolvedRuler />
      <StepLane v-for="laneId in laneIds" :key="laneId" :lane-id="laneId" />
    </div>
  </main>
</template>

<style scoped lang="scss">
main {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/**
 * The lane stack takes whatever height is left and the lanes divide it between them, so a taller
 * window means taller lanes rather than empty space. Once every lane is down to its minimum there
 * is nothing left to give, so the stack scrolls rather than squashing its controls away.
 *
 * The stack sits on the app surface rather than on a panel of its own, so the two bands that do
 * carry one - the voice header and the footer - are the only things in the window standing above
 * it. The lanes sit flush on that surface, parted by a hairline groove, and no height is spent on
 * gaps between panels.
 */
.sequencer {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-app);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}

.sequencer > * + * {
  border-top: 1px solid var(--seam);
}
</style>
