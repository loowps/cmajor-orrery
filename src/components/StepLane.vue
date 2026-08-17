<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useSequencerStore } from '@/stores/sequencer'
import { useStepPainter } from '@/composables/useStepPainter'
import {
  clamp,
  laneDefinition,
  laneDirectionLabels,
  laneOutput,
  nextLaneDirection,
  type LaneId
} from '@/models/sequencer.model'
import { laneReadIndexAt } from '@/models/pattern-resolver'
import LaneRangeBar from '@/components/LaneRangeBar.vue'
import LaneRangeField from '@/components/LaneRangeField.vue'
import ActionIcon from '@/components/ActionIcon.vue'

const { laneId } = defineProps<{ laneId: LaneId }>()

const store = useSequencerStore()
const {
  patternLength,
  triggerThreshold,
  holdThreshold,
  playheadSlot,
  resolvedPattern,
  focusedLaneId
} = storeToRefs(store)

const definition = computed(() => laneDefinition(laneId))
const lane = computed(() => store.laneOf(laneId))

const isFocused = computed(() => focusedLaneId.value === laneId)

/// One lane takes half the available height when focused; otherwise every lane shares it.
const growth = computed(() => (isFocused.value ? 4 : 1))

const threshold = computed(() => {
  if (laneId === 'trigger') return triggerThreshold.value
  if (laneId === 'hold') return holdThreshold.value
  return null
})

/**
 * The bars are stored positions while the threshold is in output units, so the line has to be
 * projected back through the output range to sit where it actually cuts the drawn shape.
 */
const thresholdHeight = computed(() => {
  if (threshold.value === null) {
    return null
  }

  const span = lane.value.outputMax - lane.value.outputMin

  return span === 0 ? null : clamp((threshold.value - lane.value.outputMin) / span, 0, 1)
})

interface LaneCell {
  index: number
  value: number
  output: number
  isInWindow: boolean
  crossesThreshold: boolean
}

const cells = computed<LaneCell[]>(() =>
  Array.from({ length: patternLength.value }, (_unused, index) => {
    const value = lane.value.values[index]
    const output = laneOutput(value, lane.value, definition.value)
    const isInWindow = index >= lane.value.start && index < lane.value.start + lane.value.length

    return {
      index,
      value,
      output,
      isInWindow,
      crossesThreshold: threshold.value !== null && output >= threshold.value
    }
  })
)

/// The cell the lane is reading right now, which is only the playhead slot for a full-width window.
const playingCellIndex = computed(() =>
  playheadSlot.value < 0
    ? -1
    : laneReadIndexAt(store.selectedVoice, laneId, resolvedPattern.value, playheadSlot.value)
)

function emphasisFor(cell: LaneCell) {
  if (!cell.isInWindow) return 'outside'
  return threshold.value === null || cell.crossesThreshold ? 'on' : 'below'
}

const directionTitle = computed(() => {
  const current = laneDirectionLabels[lane.value.direction]
  const next = laneDirectionLabels[nextLaneDirection(lane.value.direction)]

  return `Direction: ${current} — click for ${next}`
})

const outputMin = computed({
  get: () => lane.value.outputMin,
  set: (value) => store.setOutputRange(laneId, value, lane.value.outputMax)
})

const outputMax = computed({
  get: () => lane.value.outputMax,
  set: (value) => store.setOutputRange(laneId, lane.value.outputMin, value)
})

/**
 * The line sits on the leading edge of the cell the lane reads first. Dragging it rotates the
 * lane inside its window rather than moving the window, so the material stays and only the
 * starting point moves.
 */
const phaseLeftPercentage = computed(
  () => ((lane.value.start + lane.value.offset) / patternLength.value) * 100
)

const trackElement = useTemplateRef<HTMLElement>('trackElement')
const isDraggingPhase = ref(false)

function cellIndexFrom(event: PointerEvent): number {
  const bounds = trackElement.value!.getBoundingClientRect()
  const position = ((event.clientX - bounds.left) / bounds.width) * patternLength.value

  return clamp(Math.floor(position), 0, patternLength.value - 1)
}

/// Every phase handler stops the event, or the track underneath would start painting values.
function onPhasePointerDown(event: PointerEvent) {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  isDraggingPhase.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPhasePointerMove(event: PointerEvent) {
  if (!isDraggingPhase.value) {
    return
  }

  event.stopPropagation()
  store.setLaneOffset(laneId, cellIndexFrom(event) - lane.value.start)
}

function onPhasePointerUp(event: PointerEvent) {
  if (!isDraggingPhase.value) {
    return
  }

  event.stopPropagation()
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  isDraggingPhase.value = false
}

const { isPainting, paintPosition, onPointerDown, onPointerMove, onPointerUp } = useStepPainter({
  slotCount: () => patternLength.value,
  applyValue: (index, normalized) => store.setValueFromNormalized(laneId, index, normalized),
  captureValues: () => store.captureLaneValues(laneId),
  restoreValues: (values) => store.restoreLaneValues(laneId, values)
})

function formatOutput(value: number) {
  return definition.value.step < 1 ? value.toFixed(2) : String(value)
}

/// Follows the pointer while drawing, so a value can be set precisely without releasing first.
const paintReadout = computed(() => {
  const position = paintPosition.value

  if (!position) {
    return null
  }

  const output = laneOutput(position.normalized, lane.value, definition.value)

  return {
    left: ((position.slot + 0.5) / patternLength.value) * 100,
    bottom: position.normalized * 100,
    isNearTop: position.normalized > 0.78,
    text: `${formatOutput(output)}${definition.value.unit}`
  }
})
</script>

<template>
  <div class="lane" :class="{ focused: isFocused }" :style="{ flexGrow: growth }">
    <div class="lane-header">
      <div class="header-row">
        <span class="lane-label">{{ definition.label }}</span>

        <!-- How the lane reads rather than something done to it, so it leads the row. -->
        <ActionIcon
          :name="lane.direction"
          compact
          :active="lane.direction !== 'forward'"
          :title="directionTitle"
          @click="store.cycleLaneDirection(laneId)"
        />

        <ActionIcon
          name="pencil"
          compact
          :active="isFocused"
          :title="isFocused ? 'Collapse this lane' : 'Enlarge this lane for editing'"
          @click="store.toggleLaneFocus(laneId)"
        />

        <ActionIcon
          name="lock"
          compact
          :active="lane.locked"
          :title="lane.locked ? 'Unlock lane' : 'Lock lane against reset and randomize'"
          @click="store.toggleLaneLock(laneId)"
        />

        <ActionIcon
          name="reset"
          compact
          title="Reset this lane to its inert value"
          @click="store.resetLane(laneId)"
        />

        <ActionIcon
          name="dice"
          compact
          title="Randomize this lane"
          @click="store.randomizeLane(laneId)"
        />
      </div>

      <!--
        A threshold lane's values are only ever compared against Density or Hold, so narrowing
        their output range would just be another way of turning those knobs.
      -->
      <LaneRangeField
        v-if="!definition.usesThreshold"
        v-model:low="outputMin"
        v-model:high="outputMax"
        :min="definition.min"
        :max="definition.max"
        :step="definition.step"
        :unit="definition.unit"
      />
    </div>

    <div class="lane-body">
      <div
        ref="trackElement"
        class="track"
        :class="{ painting: isPainting }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div
          v-for="cell in cells"
          :key="cell.index"
          class="cell"
          :class="[
            emphasisFor(cell),
            { beat: cell.index % 4 === 0, playing: cell.index === playingCellIndex }
          ]"
          :title="`${cell.index + 1}: ${formatOutput(cell.output)}${definition.unit}`"
        >
          <div class="bar" :style="{ height: `${cell.value * 100}%` }" />
        </div>

        <div
          v-if="thresholdHeight !== null"
          class="threshold"
          :style="{ bottom: `${thresholdHeight * 100}%` }"
        />

        <div
          class="phase"
          :class="{ dragging: isDraggingPhase }"
          :style="{ left: `${phaseLeftPercentage}%` }"
          title="Drag to set where in its window the lane starts reading"
          @pointerdown="onPhasePointerDown"
          @pointermove="onPhasePointerMove"
          @pointerup="onPhasePointerUp"
          @pointercancel="onPhasePointerUp"
        />

        <div
          v-if="paintReadout"
          class="paint-readout"
          :class="{ 'near-top': paintReadout.isNearTop }"
          :style="{ left: `${paintReadout.left}%`, bottom: `${paintReadout.bottom}%` }"
        >
          {{ paintReadout.text }}
        </div>
      </div>

      <LaneRangeBar
        :start="lane.start"
        :length="lane.length"
        :slot-count="patternLength"
        @change="(start, length) => store.setLaneWindow(laneId, start, length)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.lane {
  display: flex;
  align-items: stretch;
  gap: var(--lane-gutter);
  flex-basis: 0;
  /* Below this the header controls start clipping, so the stack scrolls instead of squashing. */
  min-height: var(--lane-min-height);
  padding: var(--lane-inset);
  overflow: hidden;
  transition: flex-grow 140ms ease;
}

/// The lane's own surface is its boundary, so the focus ring belongs to the whole row.
.lane.focused {
  box-shadow: inset 0 0 0 1px var(--accent-dim);
}

.lane-header {
  width: var(--lane-header-width);
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: var(--space-2);
}

.header-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/// The row is five icons and a name inside the header's width, so the name gives way first.
.lane-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.74rem;
  letter-spacing: 0.02em;
  color: var(--text-dim);
}

.lane.focused .lane-label {
  color: var(--text);
}

.lane-body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.track {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--bg-sunken);
  border-radius: var(--radius-lg);
  touch-action: none;
  cursor: crosshair;
  user-select: none;

  &.painting {
    cursor: grabbing;
  }
}

.cell {
  flex: 1;
  min-width: 0;
  position: relative;
  background: var(--bg-cell);
  border-radius: 3px;
  overflow: hidden;

  &.beat {
    background: var(--bg-cell-beat);
  }

  // Slots the lane's window doesn't cover never play, so they recede rather than compete.
  &.outside {
    background: var(--bg-cell-inert);

    .bar {
      background: var(--bar-inert);
    }
  }

  /**
   * As a pseudo-element rather than the cell's own box-shadow: an inset shadow paints beneath
   * the cell's children, so the bar would cover the part of the ring it overlaps.
   */
  &.playing::after {
    content: '';
    position: absolute;
    inset: 0;
    box-shadow: inset 0 0 0 1px var(--marker);
    border-radius: inherit;
    pointer-events: none;
  }
}

.bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bar-idle);
  transition: height 40ms linear;
}

.cell.on .bar {
  background: var(--accent);
}

/**
 * A grab area wide enough to hit, with a hairline drawn down its middle. It reaches past the
 * track's padding so the line meets both edges rather than floating inside them.
 */
.phase {
  position: absolute;
  top: calc(var(--space-1) * -1);
  bottom: calc(var(--space-1) * -1);
  width: 9px;
  margin-left: -4.5px;
  cursor: ew-resize;
  touch-action: none;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 4px;
    width: 2px;
    background: var(--marker);
    border-radius: 1px;
  }

  &:hover::after,
  &.dragging::after {
    background: var(--text);
  }
}

/// Inset by the track's own padding, so the line spans exactly the cells and nothing more.
.threshold {
  position: absolute;
  left: var(--space-1);
  right: var(--space-1);
  border-top: 1px dashed var(--marker);
  pointer-events: none;
}

/**
 * `bottom` already places the pill's lower edge on the value line, so it sits above it by
 * default and only needs shifting down by its own height to flip below near the top.
 */
.paint-readout {
  position: absolute;
  transform: translate(-50%, -4px);
  padding: var(--space-1) var(--space-3);
  background: var(--accent);
  border-radius: 3px;
  color: var(--accent-ink);
  font-size: 0.6rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;

  &.near-top {
    transform: translate(-50%, calc(100% + 4px));
  }
}
</style>
