<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, useTemplateRef } from 'vue'
import AboutDialog from '@/components/AboutDialog.vue'
import SceneSelector from '@/components/SceneSelector.vue'
import VendorLogo from '@/components/VendorLogo.vue'
import VoiceStrip from '@/components/VoiceStrip.vue'

const route = useRoute()
const router = useRouter()

const isHome = computed(() => route.path === '/')

const about = useTemplateRef<InstanceType<typeof AboutDialog>>('about')

function navigate() {
  router.push(isHome.value ? '/voices' : '/')
}
</script>

<template>
  <footer>
    <nav>
      <button class="nav-button" @click="navigate">
        {{ isHome ? 'All voices' : 'Sequencer' }}
      </button>
    </nav>

    <SceneSelector />

    <VoiceStrip v-if="isHome" />

    <button class="brand" aria-label="About Loowps Orrery" title="About" @click="about?.open()">
      <VendorLogo class="mark" />
      <span class="name">Orrery</span>
    </button>

    <AboutDialog ref="about" />
  </footer>
</template>

<style scoped lang="scss">
footer {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  /* Even on all four sides, less the rule along the top - the eye measures the gap from the rule,
     so counting it would leave everything in the bar sitting a pixel low. */
  padding: calc(var(--band-inset) - 1px) var(--band-inset) var(--band-inset);
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
}

/// A signature rather than a control, so only a hover says it opens anything.
.brand {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
  padding: var(--space-2);
  background: transparent;
  border: none;
  border-radius: var(--radius);
  color: var(--text);
  font-size: var(--text-mark);
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--dur-control);

  &:hover {
    background: var(--bg-control-hover);
  }

  &:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 1px;
  }
}

/**
 * The negative margins on the mark and the name trim the line box back to the ink: both lines are
 * all capitals, so the room kept for ascenders, descenders and the trailing letter-space is space
 * they never use. Given back, the padding around the pair reads as even on all four sides.
 */
.mark {
  margin-top: -0.06em;
}

.name {
  --name-tracking: 0.05em;
  /* Measured: where Khand's capitals stand above the foot of the line box. */
  --name-descent: 0.2em;
  /* Trimmed rather than closed up, which would reach into the tails of the mark's slashes. */
  --name-lead: 0.05em;

  font-family: var(--font-display);
  font-size: var(--text-wordmark);
  font-weight: 500;
  letter-spacing: var(--name-tracking);
  margin-top: calc(-1 * var(--name-lead));
  margin-right: calc(-1 * var(--name-tracking));
  margin-bottom: calc(-1 * var(--name-descent));
  text-transform: uppercase;
  user-select: none;
}

.nav-button {
  height: var(--control-size);
  display: inline-flex;
  align-items: center;
  padding: 0 var(--space-6);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-dim);
  font-size: var(--text-label);
  letter-spacing: 0.02em;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color var(--dur-control),
    border-color var(--dur-control),
    color var(--dur-control);

  &:hover {
    background: var(--bg-control-hover);
    border-color: var(--border-strong);
    color: var(--text);
  }
}
</style>
