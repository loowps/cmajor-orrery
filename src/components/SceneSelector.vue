<script setup lang="ts">
import { inject } from 'vue'
import { storeToRefs } from 'pinia'
import { useSequencerStore } from '@/stores/sequencer'
import { sceneCount } from '@/models/sequencer.model'
import type { PatchConnection } from '@/models/patch-connection.model'
import { PatchConnectionEndpoint } from '@/models/patch-connection-endpoints.enum'
import ActionIcon from '@/components/ActionIcon.vue'

const patchConnection = inject<PatchConnection>('patchConnection')

const store = useSequencerStore()
const { editSceneIndex, playingSceneIndex, copiedScene } = storeToRefs(store)

/**
 * Playback belongs to the patch, so this asks for the change rather than making it, wrapped in a
 * gesture so the host can record it. The scene parameter is echoed back and settles the marker;
 * moving it here too keeps the click responsive when nothing is listening.
 *
 * The host may point playback somewhere else at any time, which is the whole point: what is being
 * edited and what is sounding are separate choices.
 */
function select(index: number) {
  store.selectEditScene(index)
  store.setPlayingScene(index)

  patchConnection?.sendParameterGestureStart(PatchConnectionEndpoint.Scene)
  patchConnection?.sendEventOrValue(PatchConnectionEndpoint.Scene, index + 1)
  patchConnection?.sendParameterGestureEnd(PatchConnectionEndpoint.Scene)
}
</script>

<template>
  <div class="scenes">
    <span class="label">Scene</span>

    <div class="slots">
      <button
        v-for="index in sceneCount"
        :key="index"
        class="slot"
        :class="{
          editing: editSceneIndex === index - 1,
          playing: playingSceneIndex === index - 1
        }"
        :title="`Edit scene ${index}`"
        @click="select(index - 1)"
      >
        {{ index }}
        <span class="state" />
      </button>
    </div>

    <div class="clipboard">
      <ActionIcon name="copy" title="Copy this scene" @click="store.copyScene()" />
      <ActionIcon
        name="paste"
        title="Paste over this scene"
        :disabled="!copiedScene"
        @click="store.pasteScene()"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.scenes {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.label {
  font-size: 0.68rem;
  letter-spacing: 0.02em;
  color: var(--text-dim);
}

.slots {
  display: flex;
  gap: var(--space-2);
}

/**
 * Two states at once, carried the same way the voice buttons carry theirs: the scene being edited
 * is filled, and a light along the bottom says which one is playing. They are usually the same
 * slot, so the light only speaks up when they part company.
 */
.slot {
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
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
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

  &.editing {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
  }
}

/// Always drawn, so every slot keeps the same silhouette and only its brightness says who plays.
.state {
  position: absolute;
  left: var(--space-3);
  right: var(--space-3);
  bottom: 3px;
  height: 2px;
  border-radius: 2px;
  background: var(--marker);
  opacity: 0.22;
}

.slot.playing .state {
  opacity: 1;
}

.slot.editing .state {
  background: var(--accent-ink);
}

.clipboard {
  display: flex;
  gap: var(--space-2);
}
</style>
