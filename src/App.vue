<script setup lang="ts">
import { RouterView } from 'vue-router'
import ToolbarComponent from '@/components/ToolbarComponent.vue'
import { usePatchSync } from '@/composables/usePatchSync'

/// Owned by the app rather than a view: routing away must not disconnect the patch.
usePatchSync()
</script>

<template>
  <div class="layout">
    <ToolbarComponent />

    <div class="main">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </div>
  </div>
</template>

<style>
body {
  background-color: var(--bg-app);
  color: var(--text);
}
</style>

<style lang="scss" scoped>
.fade-enter-active {
  transition: opacity 0.15s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/**
 * Scrolls sideways as one piece, so the header keeps its columns lined up with the bands beneath
 * it. Vertical overflow is clipped here because each view runs its own vertical scroller, and the
 * document itself is never allowed to scroll - that is what would fetch the browser's own bars.
 */
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: auto hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
  background: var(--bg-app);
}

.layout > * {
  min-width: var(--view-min-width);
}

.main {
  flex: 1;
  min-height: 0;
  display: flex;
}

.main > * {
  flex: 1;
  min-height: 0;
}
</style>
