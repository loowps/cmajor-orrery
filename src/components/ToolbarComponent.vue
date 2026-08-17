<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, useTemplateRef } from 'vue'
import VoiceStrip from '@/components/VoiceStrip.vue'
import AboutDialog from '@/components/AboutDialog.vue'
import VendorLogo from '@/components/VendorLogo.vue'
import SceneSelector from '@/components/SceneSelector.vue'

const route = useRoute()
const router = useRouter()

const isHome = computed(() => route.path === '/')

const about = useTemplateRef<InstanceType<typeof AboutDialog>>('about')

function navigate() {
  router.push(isHome.value ? '/voices' : '/')
}
</script>

<template>
  <header>
    <div class="brand">
      <button class="vendor" aria-label="About Loowps Orrery" title="About" @click="about?.open()">
        <VendorLogo />
      </button>
      <span class="separator" aria-hidden="true" />
      <span class="name">Orrery</span>
    </div>

    <AboutDialog ref="about" />

    <div class="controls">
      <SceneSelector />

      <VoiceStrip v-if="isHome" />

      <nav>
        <button class="nav-button" @click="navigate">
          {{ isHome ? 'All voices' : 'Sequencer' }}
        </button>
      </nav>
    </div>
  </header>
</template>

<style scoped lang="scss">
header {
  display: flex;
  place-items: center;
  gap: var(--space-7);
  padding: var(--space-4) var(--band-inset);
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
}

/// Everything that is not the brand sits together at the right end of the bar, parted by space
/// rather than by rules.
.controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-7);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

/// The one rule in the bar, holding the wordmark and the plugin name apart.
.separator {
  width: 1px;
  height: 16px;
  flex: none;
  background: var(--border);
}

.vendor {
  height: var(--control-size);
  display: inline-flex;
  align-items: center;
  /* Trailing letter-spacing pads the right edge already, so that side gives a step back. */
  padding: 0 var(--space-3) 0 var(--space-4);
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  color: var(--text);
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 90ms ease,
    border-color 90ms ease;

  &:hover {
    background: var(--bg-control-hover);
    border-color: var(--accent-dim);
  }

  &:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: 1px;
  }
}

.name {
  font-size: 0.9rem;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.18em;
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
  font-size: 0.68rem;
  letter-spacing: 0.02em;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 90ms ease,
    border-color 90ms ease,
    color 90ms ease;

  &:hover {
    background: var(--bg-control-hover);
    border-color: var(--border-strong);
    color: var(--text);
  }
}
</style>
