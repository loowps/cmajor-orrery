import { computed, ref, toRaw } from 'vue'
import { defineStore } from 'pinia'
import {
  triggerThresholdOf,
  clamp,
  createLaneState,
  createVoice,
  holdThresholdOf,
  laneDefinition,
  laneDefinitions,
  laneDirections,
  laneIds,
  loadableSnapshotVersions,
  maxSteps,
  minPatternLength,
  nextLaneDirection,
  quantizeToLane,
  sceneCount,
  snapshotVersion,
  type LaneId,
  type LaneState,
  type PatternSnapshot,
  type Scene,
  type Voice
} from '@/models/sequencer.model'
import { resolvePattern } from '@/models/pattern-resolver'

const voiceCount = 8

function createRandom(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state)
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Randomising covers the lane's full height, because the output range constrains it live, and
 * the whole array rather than just the window — otherwise sliding the window would only ever
 * reveal untouched material.
 *
 * `amount` moves each value towards its new draw rather than replacing it, so a low setting
 * perturbs a shape you drew instead of throwing it away.
 */
function fillLane(lane: LaneState, random: () => number, amount = 1) {
  for (let index = 0; index < maxSteps; ++index) {
    const current = lane.values[index]
    lane.values[index] = current + (random() - current) * amount
  }
}

const starterLaneLengths: Partial<Record<LaneId, number>> = {
  trigger: 16,
  hold: 7,
  rate: 3,
  nudge: 4,
  ratchet: 8,
  pitch: 5,
  velocity: 16,
  gate: 3
}

/// A new instance plays on the grid, one strike to a note, every note every pass: timing, repeats
/// and how often a step comes round are the lanes where a random draw is a mess rather than a
/// starting point, so they are left inert until drawn on.
const startersLeftFlat: LaneId[] = ['rate', 'nudge', 'ratchet']

function createStarterVoices(): Voice[] {
  const random = createRandom(0x52756e64)

  return Array.from({ length: voiceCount }, (_unused, voiceIndex) => {
    const voice = createVoice(voiceIndex === 0)

    for (const definition of laneDefinitions) {
      const lane = voice.lanes[definition.id]
      lane.length = starterLaneLengths[definition.id] ?? definition.defaultLength

      if (!startersLeftFlat.includes(definition.id)) {
        fillLane(lane, random)
      }
    }

    return voice
  })
}

function createStarterScenes(): Scene[] {
  return Array.from({ length: sceneCount }, () => ({ voices: createStarterVoices() }))
}

export const useSequencerStore = defineStore('sequencer', () => {
  const scenes = ref<Scene[]>(createStarterScenes())

  /**
   * Two independent choices: the scene the editor works on, and the scene the host has asked for.
   * Keeping them apart is what lets the next section be prepared while the current one is
   * sounding, so selecting a scene to edit never writes to the parameter that arranges the track.
   */
  const editSceneIndex = ref(0)
  const parameterSceneIndex = ref(0)

  /**
   * Auditioning points playback at whatever is being edited, and stops when it is switched off -
   * a listening aid over the host's choice, like solo is over a voice's own enabled flag. It is
   * the editor's way of hearing its work without ever taking the parameter away from the host.
   */
  const isAuditioningEditScene = ref(false)

  const soundingSceneIndex = computed(() =>
    isAuditioningEditScene.value ? editSceneIndex.value : parameterSceneIndex.value
  )

  const voices = computed(() => scenes.value[editSceneIndex.value].voices)

  const selectedVoiceIndex = ref(0)
  const playheadSlots = ref<number[]>(new Array<number>(voiceCount).fill(-1))

  /// Purely a view mode: which lane is enlarged for editing, if any. Never part of a snapshot.
  const focusedLaneId = ref<LaneId | null>(null)

  /**
   * Lanes folded away to their name, so a voice can be worked on through two or three of them
   * while the rest keep their place in the order. A view mode like the focus above it, and out of
   * the snapshot for the same reason: it says how the editor is being looked through, not what
   * the voice plays.
   */
  const collapsedLaneIds = ref<Set<LaneId>>(new Set())

  function isLaneCollapsed(laneId: LaneId): boolean {
    return collapsedLaneIds.value.has(laneId)
  }

  /// How far every randomize action moves values towards their new draw.
  const randomizeAmount = ref(1)

  /// Solo is a listening aid rather than pattern data, so it stays out of the snapshot and
  /// leaves each voice's own enabled flag untouched.
  const soloedVoices = ref<boolean[]>(new Array<boolean>(voiceCount).fill(false))
  const isAnyVoiceSoloed = computed(() => soloedVoices.value.some(Boolean))

  function isVoiceAudible(index: number): boolean {
    return isAnyVoiceSoloed.value
      ? soloedVoices.value[index]
      : (voices.value[index]?.enabled ?? false)
  }

  function toggleVoiceSolo(index: number) {
    soloedVoices.value[index] = !soloedVoices.value[index]
  }

  const copiedScene = ref<Scene | null>(null)

  function selectEditScene(index: number) {
    editSceneIndex.value = clamp(Math.round(index), 0, sceneCount - 1)
  }

  /// Only ever called with what the patch reports, so the editor follows the parameter rather
  /// than predicting it.
  function setParameterScene(index: number) {
    parameterSceneIndex.value = clamp(Math.round(index), 0, sceneCount - 1)
  }

  function toggleAuditionEditScene() {
    isAuditioningEditScene.value = !isAuditioningEditScene.value
  }

  function copyScene(index: number = editSceneIndex.value) {
    copiedScene.value = structuredClone(toRaw(scenes.value[index]))
  }

  function pasteScene(index: number = editSceneIndex.value) {
    if (!copiedScene.value) {
      return
    }

    scenes.value[index] = structuredClone(toRaw(copiedScene.value))
  }

  const selectedVoice = computed(() => voices.value[selectedVoiceIndex.value])

  const resolvedPattern = computed(() => resolvePattern(selectedVoice.value))
  const triggerThreshold = computed(() => triggerThresholdOf(selectedVoice.value))
  const holdThreshold = computed(() => holdThresholdOf(selectedVoice.value))
  const playheadSlot = computed(() => playheadSlots.value[selectedVoiceIndex.value] ?? -1)

  const patternLength = computed({
    get: () => selectedVoice.value.patternLength,
    set: (value) => setPatternLength(value)
  })

  const density = computed({
    get: () => selectedVoice.value.density,
    set: (value) => {
      selectedVoice.value.density = clamp(value, 0, 1)
    }
  })

  const holdAmount = computed({
    get: () => selectedVoice.value.holdAmount,
    set: (value) => {
      selectedVoice.value.holdAmount = clamp(value, 0, 1)
    }
  })

  const resetCycleSteps = computed({
    get: () => selectedVoice.value.resetCycleSteps,
    set: (value) => {
      selectedVoice.value.resetCycleSteps = clamp(Math.round(value), 0, maxSteps)
    }
  })

  function laneOf(laneId: LaneId): LaneState {
    return selectedVoice.value.lanes[laneId]
  }

  function setValueFromNormalized(laneId: LaneId, index: number, normalized: number) {
    laneOf(laneId).values[index] = clamp(normalized, 0, 1)
  }

  function captureLaneValues(laneId: LaneId): number[] {
    return [...laneOf(laneId).values]
  }

  function restoreLaneValues(laneId: LaneId, values: number[]) {
    laneOf(laneId).values = [...values]
  }

  function setLaneWindow(laneId: LaneId, start: number, length: number) {
    const lane = laneOf(laneId)
    const limit = selectedVoice.value.patternLength
    const boundedLength = clamp(Math.round(length), 1, limit)

    lane.length = boundedLength
    lane.start = clamp(Math.round(start), 0, limit - boundedLength)
    lane.offset = clamp(lane.offset, 0, boundedLength - 1)
  }

  /// Counted from the window's own start, so sliding the window carries the phase along with it.
  function setLaneOffset(laneId: LaneId, offset: number) {
    const lane = laneOf(laneId)
    lane.offset = clamp(Math.round(offset), 0, lane.length - 1)
  }

  function cycleLaneDirection(laneId: LaneId) {
    const lane = laneOf(laneId)
    lane.direction = nextLaneDirection(lane.direction)
  }

  function normalizeLanesOf(voice: Voice) {
    for (const laneId of laneIds) {
      /// A pattern written before this lane existed simply doesn't carry it, and its inert value
      /// is what the voice was playing anyway.
      voice.lanes[laneId] ??= createLaneState(laneDefinition(laneId))

      const lane = voice.lanes[laneId]
      lane.length = clamp(lane.length, 1, voice.patternLength)
      lane.start = clamp(lane.start, 0, voice.patternLength - lane.length)
      lane.offset = clamp(Math.round(lane.offset ?? 0), 0, lane.length - 1)

      if (!laneDirections.includes(lane.direction)) {
        lane.direction = 'forward'
      }
    }
  }

  /// An inverted range would silently flip the lane's contour, so the bounds are kept in order.
  function setVoiceOutputRange(voiceIndex: number, laneId: LaneId, low: number, high: number) {
    const lane = voices.value[voiceIndex]?.lanes[laneId]

    if (!lane) {
      return
    }

    const definition = laneDefinition(laneId)
    const bounds = [quantizeToLane(low, definition), quantizeToLane(high, definition)]

    lane.outputMin = Math.min(...bounds)
    lane.outputMax = Math.max(...bounds)
  }

  function setOutputRange(laneId: LaneId, low: number, high: number) {
    setVoiceOutputRange(selectedVoiceIndex.value, laneId, low, high)
  }

  /// The two view modes are opposites, so asking for one always answers the other: a lane cannot
  /// be enlarged for editing and folded away at the same time.
  function toggleLaneFocus(laneId: LaneId) {
    focusedLaneId.value = focusedLaneId.value === laneId ? null : laneId

    if (focusedLaneId.value === laneId) {
      collapsedLaneIds.value.delete(laneId)
    }
  }

  function toggleLaneCollapsed(laneId: LaneId) {
    if (collapsedLaneIds.value.has(laneId)) {
      collapsedLaneIds.value.delete(laneId)
      return
    }

    collapsedLaneIds.value.add(laneId)

    if (focusedLaneId.value === laneId) {
      focusedLaneId.value = null
    }
  }

  function toggleLaneLock(laneId: LaneId) {
    const lane = laneOf(laneId)
    lane.locked = !lane.locked
  }

  function randomizeLane(laneId: LaneId) {
    const lane = laneOf(laneId)

    if (lane.locked) {
      return
    }

    fillLane(lane, Math.random, randomizeAmount.value)
  }

  /// Back to the lane's inert value: every step playing, no holds, a flat pitch and velocity.
  function resetLane(laneId: LaneId) {
    const lane = laneOf(laneId)

    if (lane.locked) {
      return
    }

    lane.values = new Array<number>(maxSteps).fill(laneDefinition(laneId).defaultValue)
  }

  function forEachUnlockedLane(index: number, apply: (lane: LaneState, laneId: LaneId) => void) {
    const voice = voices.value[index]

    if (!voice) {
      return
    }

    for (const laneId of laneIds) {
      const lane = voice.lanes[laneId]

      if (!lane.locked) {
        apply(lane, laneId)
      }
    }
  }

  function randomizeVoiceAt(index: number) {
    forEachUnlockedLane(index, (lane) => fillLane(lane, Math.random, randomizeAmount.value))
  }

  function resetVoiceAt(index: number) {
    forEachUnlockedLane(index, (lane, laneId) => {
      lane.values = new Array<number>(maxSteps).fill(laneDefinition(laneId).defaultValue)
    })
  }

  function randomizeVoice() {
    randomizeVoiceAt(selectedVoiceIndex.value)
  }

  function resetVoice() {
    resetVoiceAt(selectedVoiceIndex.value)
  }

  function randomizeAllVoices() {
    voices.value.forEach((_voice, index) => randomizeVoiceAt(index))
  }

  function resetAllVoices() {
    voices.value.forEach((_voice, index) => resetVoiceAt(index))
  }

  function setVoicePatternLength(index: number, length: number) {
    const voice = voices.value[index]

    if (!voice) {
      return
    }

    voice.patternLength = clamp(Math.round(length), minPatternLength, maxSteps)
    normalizeLanesOf(voice)
  }

  function setPatternLength(length: number) {
    setVoicePatternLength(selectedVoiceIndex.value, length)
  }

  function selectVoice(index: number) {
    selectedVoiceIndex.value = clamp(index, 0, voiceCount - 1)
  }

  function toggleVoiceEnabled(index: number) {
    const voice = voices.value[index]

    if (voice) {
      voice.enabled = !voice.enabled
    }
  }

  function setPlayheadSlot(voiceIndex: number, slot: number) {
    if (voiceIndex >= 0 && voiceIndex < voiceCount) {
      playheadSlots.value[voiceIndex] = slot
    }
  }

  function toSnapshot(): PatternSnapshot {
    return {
      version: snapshotVersion,
      scenes: JSON.parse(JSON.stringify(toRaw(scenes.value)))
    }
  }

  /**
   * A stored pattern outlives the build that wrote it, so a lane this build expects may simply not
   * be there - it was written before that lane existed, or a rename left the record keyed under a
   * name nothing reads any more. A voice still carrying lanes this build knows is repaired as it
   * loads; one carrying none of them is not a voice, and applying it would take the editor down.
   */
  function hasAnyLane(voice: Voice): boolean {
    return laneIds.some((laneId) => Array.isArray(voice.lanes?.[laneId]?.values))
  }

  /**
   * A pattern written by a build with fewer scenes keeps every one it had, and the scenes this
   * build adds arrive where a new instance would have left them - so widening the board reads an
   * older pattern back rather than discarding it.
   */
  function padScenes(stored: Scene[]): Scene[] {
    return Array.from(
      { length: sceneCount },
      (_unused, index) => stored[index] ?? { voices: createStarterVoices() }
    )
  }

  function isCompleteScene(scene: Scene): boolean {
    return (
      Array.isArray(scene?.voices) &&
      scene.voices.length === voiceCount &&
      scene.voices.every(hasAnyLane)
    )
  }

  function applySnapshot(snapshot: PatternSnapshot) {
    if (!loadableSnapshotVersions.includes(snapshot.version) || !Array.isArray(snapshot.scenes)) {
      return
    }

    /// Fewer scenes than this build has is an older pattern; none at all, or more than there is
    /// room for, is not a pattern this build can make sense of.
    const stored = snapshot.scenes

    if (stored.length < 1 || stored.length > sceneCount || !stored.every(isCompleteScene)) {
      return
    }

    scenes.value = padScenes(stored)
    scenes.value.forEach((scene) => scene.voices.forEach(normalizeLanesOf))
  }

  return {
    voices,
    voiceCount,
    scenes,
    sceneCount,
    editSceneIndex,
    parameterSceneIndex,
    soundingSceneIndex,
    isAuditioningEditScene,
    copiedScene,
    selectEditScene,
    setParameterScene,
    toggleAuditionEditScene,
    copyScene,
    pasteScene,
    selectedVoiceIndex,
    selectedVoice,
    patternLength,
    density,
    holdAmount,
    resetCycleSteps,
    triggerThreshold,
    holdThreshold,
    resolvedPattern,
    playheadSlot,
    playheadSlots,
    focusedLaneId,
    toggleLaneFocus,
    collapsedLaneIds,
    isLaneCollapsed,
    toggleLaneCollapsed,
    randomizeAmount,
    laneOf,
    setValueFromNormalized,
    captureLaneValues,
    restoreLaneValues,
    setLaneWindow,
    setLaneOffset,
    cycleLaneDirection,
    setOutputRange,
    setVoiceOutputRange,
    toggleLaneLock,
    randomizeLane,
    randomizeVoice,
    randomizeVoiceAt,
    randomizeAllVoices,
    resetLane,
    resetVoice,
    resetVoiceAt,
    resetAllVoices,
    setPatternLength,
    setVoicePatternLength,
    selectVoice,
    toggleVoiceEnabled,
    soloedVoices,
    isAnyVoiceSoloed,
    isVoiceAudible,
    toggleVoiceSolo,
    setPlayheadSlot,
    toSnapshot,
    applySnapshot
  }
})
