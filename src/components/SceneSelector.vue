<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSequencerStore } from '@/stores/sequencer'
import { sceneCount } from '@/models/sequencer.model'
import ActionIcon from '@/components/ActionIcon.vue'

const store = useSequencerStore()
const {
  editSceneIndex,
  parameterSceneIndex,
  soundingSceneIndex,
  isAuditioningEditScene,
  copiedScene
} = storeToRefs(store)
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
          parameter: parameterSceneIndex === index - 1,
          playing: soundingSceneIndex === index - 1
        }"
        :title="`Edit scene ${index}`"
        @click="store.selectEditScene(index - 1)"
      >
        {{ index }}
        <span class="state" />
      </button>
    </div>

    <!--
      The arrangement stays the host's: this points playback at the scene being edited for as
      long as it is on, and hands it straight back when it is switched off.
    -->
    <ActionIcon
      name="speaker"
      tone="marker"
      :active="isAuditioningEditScene"
      :title="
        isAuditioningEditScene
          ? 'Listening to the scene being edited — click to follow the Scene parameter again'
          : 'Listen to the scene being edited, leaving the Scene parameter alone'
      "
      @click="store.toggleAuditionEditScene()"
    />

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
 * is filled, and a light along the bottom says what is sounding. They are usually the same slot,
 * so the light only speaks up when they part company - fully lit for what plays, half lit for the
 * parameter waiting underneath an audition.
 */
.slot {
  position: relative;
  width: var(--control-size);
  height: var(--control-size);
  /* Eight of these is the widest the header gets, so they hold their size and the bar overflows
     rather than squashing them into unreadable slivers. */
  flex: none;
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

/// Half lit while an audition is sounding elsewhere, so the host's standing choice is still
/// visible - it is waiting underneath, not gone.
.slot.parameter .state {
  opacity: 0.55;
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
