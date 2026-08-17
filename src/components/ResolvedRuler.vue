<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSequencerStore } from '@/stores/sequencer'

const { patternLength, resolvedPattern, playheadSlot } = storeToRefs(useSequencerStore())

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const placedNotes = computed(() =>
  resolvedPattern.value.notes.map((note) => ({
    key: note.startSlot,
    label: `${noteNames[note.pitch % 12]}${Math.floor(note.pitch / 12) - 1}`,
    left: (note.startSlot / patternLength.value) * 100,
    width: ((note.span * (note.gate / 100)) / patternLength.value) * 100,
    opacity: 0.5 + (note.velocity / 127) * 0.5
  }))
)

/**
 * The strip's own edge already marks the start, so the first beat needs no line. Every fourth
 * beat opens a bar, and drawing those stronger is what gives the eye something to count by.
 */
const beatMarkers = computed(() =>
  Array.from({ length: Math.ceil(patternLength.value / 4) }, (_unused, beat) => ({
    beat,
    isBarStart: beat % 4 === 0,
    left: ((beat * 4) / patternLength.value) * 100
  })).slice(1)
)

const playheadPercentage = computed(() => (playheadSlot.value / patternLength.value) * 100)
</script>

<template>
  <div class="ruler">
    <span class="caption">Sequence</span>

    <div class="strip">
      <div
        v-for="marker in beatMarkers"
        :key="marker.beat"
        class="beat-marker"
        :class="{ bar: marker.isBarStart }"
        :style="{ left: `${marker.left}%` }"
      />

      <div
        v-for="note in placedNotes"
        :key="note.key"
        class="note"
        :style="{ left: `${note.left}%`, width: `${note.width}%`, opacity: note.opacity }"
      >
        <span>{{ note.label }}</span>
      </div>

      <div
        v-if="playheadSlot >= 0"
        class="playhead"
        :style="{ left: `${playheadPercentage}%`, width: `${100 / patternLength}%` }"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
/**
 * Horizontally inset like the lanes so its strip shares their column, but tighter vertically:
 * the row is a summary of what plays, not something to be drawn in, so it earns less height.
 */
.ruler {
  flex: none;
  display: flex;
  align-items: stretch;
  gap: var(--lane-gutter);
  padding: var(--space-2) var(--band-inset);
}

/// Typed like a lane label, so the row reads as a sibling of the lanes rather than a caption.
.caption {
  width: var(--lane-header-width);
  flex: none;
  align-self: center;
  font-size: 0.74rem;
  letter-spacing: 0.02em;
  color: var(--text-dim);
}

.strip {
  flex: 1;
  min-width: 0;
  position: relative;
  height: 28px;
  background: var(--bg-sunken);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.beat-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--bg-cell);

  &.bar {
    background: var(--border-strong);
  }
}

.note {
  position: absolute;
  top: var(--space-1);
  bottom: var(--space-1);
  min-width: 2px;
  background: var(--accent);
  border-radius: 3px;
  display: flex;
  align-items: center;
  overflow: hidden;

  span {
    padding-left: var(--space-2);
    font-size: 0.58rem;
    color: var(--accent-ink);
    white-space: nowrap;
  }
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--marker-wash);
  border-left: 1px solid var(--marker);
  pointer-events: none;
}
</style>
