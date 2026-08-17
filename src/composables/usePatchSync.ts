import { inject, onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSequencerStore } from '@/stores/sequencer'
import type { PatchConnection } from '@/models/patch-connection.model'
import { PatchConnectionEndpoint, storedPatternKey } from '@/models/patch-connection-endpoints.enum'
import {
  laneDirectionIndexOf,
  laneIds,
  laneIndexOf,
  maxSteps,
  type PatternSnapshot,
  type Voice
} from '@/models/sequencer.model'

const storedStateDebounceMs = 400

/// Direction travels as its wire index, so a sent lane is comparable field by field.
interface SentLane {
  values: number[]
  start: number
  length: number
  offset: number
  direction: number
  outputMin: number
  outputMax: number
}

/**
 * The patch holds every scene, because the host can switch scenes while the editor is closed -
 * so all of them are uploaded, not just the one being played. The data is far too large to be
 * parameters, so it travels as addressed struct events and persists through the stored state.
 */
export function usePatchSync() {
  const patchConnection = inject<PatchConnection>('patchConnection')
  const store = useSequencerStore()
  const { scenes, soloedVoices, editSceneIndex, isAuditioningEditScene } = storeToRefs(store)

  const sentLanes = new Map<string, SentLane>()

  let storedStateTimer: ReturnType<typeof setTimeout> | undefined
  let isApplyingStoredState = false

  function sendLaneIfChanged(
    sceneIndex: number,
    voiceIndex: number,
    laneIndex: number,
    lane: SentLane
  ) {
    const key = `${sceneIndex}:${voiceIndex}:${laneIndex}`
    const sent = sentLanes.get(key)

    if (!sent || sent.values.some((value, index) => value !== lane.values[index])) {
      patchConnection?.sendEventOrValue(PatchConnectionEndpoint.LaneValues, {
        scene: sceneIndex,
        voice: voiceIndex,
        lane: laneIndex,
        values: lane.values
      })
    }

    const settingsChanged =
      !sent ||
      sent.start !== lane.start ||
      sent.length !== lane.length ||
      sent.offset !== lane.offset ||
      sent.direction !== lane.direction ||
      sent.outputMin !== lane.outputMin ||
      sent.outputMax !== lane.outputMax

    if (settingsChanged) {
      patchConnection?.sendEventOrValue(PatchConnectionEndpoint.LaneSettings, {
        scene: sceneIndex,
        voice: voiceIndex,
        lane: laneIndex,
        start: lane.start,
        length: lane.length,
        offset: lane.offset,
        direction: lane.direction,
        low: lane.outputMin,
        high: lane.outputMax
      })
    }

    sentLanes.set(key, { ...lane, values: [...lane.values] })
  }

  function sendChangedLanes() {
    scenes.value.forEach((scene, sceneIndex) => {
      scene.voices.forEach((voice, voiceIndex) => {
        for (const laneId of laneIds) {
          const lane = voice.lanes[laneId]

          sendLaneIfChanged(sceneIndex, voiceIndex, laneIndexOf(laneId), {
            values: lane.values.slice(0, maxSteps),
            start: lane.start,
            length: lane.length,
            offset: lane.offset,
            direction: laneDirectionIndexOf(lane.direction),
            outputMin: lane.outputMin,
            outputMax: lane.outputMax
          })
        }
      })
    })
  }

  function sendVoiceSettings(sceneIndex: number, voice: Voice, voiceIndex: number) {
    patchConnection?.sendEventOrValue(PatchConnectionEndpoint.VoiceSettings, {
      scene: sceneIndex,
      voice: voiceIndex,
      on: voice.enabled ? 1 : 0,
      steps: voice.patternLength,
      density: voice.density,
      hold: voice.holdAmount,
      cycle: voice.resetCycleSteps
    })
  }

  function sendSettings() {
    scenes.value.forEach((scene, sceneIndex) => {
      scene.voices.forEach((voice, voiceIndex) => sendVoiceSettings(sceneIndex, voice, voiceIndex))
    })
  }

  /// Solo is the editor's own overlay, so it stays out of the scenes and rides alongside them.
  function sendSoloMask() {
    const mask = soloedVoices.value.reduce(
      (bits, isSoloed, index) => (isSoloed ? bits | (1 << index) : bits),
      0
    )

    patchConnection?.sendEventOrValue(PatchConnectionEndpoint.SoloMask, mask)
  }

  /**
   * The scene parameter belongs to the host and is never written from here, so hearing the scene
   * being edited is asked for separately. Zero hands playback back to whatever the host wants.
   */
  function sendAuditionScene() {
    patchConnection?.sendEventOrValue(
      PatchConnectionEndpoint.AuditionScene,
      isAuditioningEditScene.value ? editSceneIndex.value + 1 : 0
    )
  }

  function sendEverything() {
    sentLanes.clear()
    sendChangedLanes()
    sendSettings()
    sendSoloMask()
    sendAuditionScene()
  }

  function scheduleStoredStateWrite() {
    if (isApplyingStoredState) {
      return
    }

    clearTimeout(storedStateTimer)
    storedStateTimer = setTimeout(() => {
      patchConnection?.sendStoredStateValue(storedPatternKey, store.toSnapshot())
    }, storedStateDebounceMs)
  }

  function onStoredStateChanged(message: { key: string; value: PatternSnapshot | undefined }) {
    if (message.key !== storedPatternKey || !message.value) {
      return
    }

    isApplyingStoredState = true
    store.applySnapshot(message.value)
    isApplyingStoredState = false

    sendEverything()
  }

  function onPlayheadChanged(position: { voice: number; slot: number }) {
    store.setPlayheadSlot(position.voice, position.slot)
  }

  function onSceneChanged(value: number) {
    store.setParameterScene(Math.round(value) - 1)
  }

  /// Every scene is watched, since editing one that is not playing still has to reach the patch.
  const stopWatching = watch(
    [scenes, soloedVoices],
    () => {
      sendChangedLanes()
      sendSettings()
      sendSoloMask()
      scheduleStoredStateWrite()
    },
    { deep: true }
  )

  /// Which scene is being edited only matters to the patch while the editor is listening to it,
  /// and it is a view choice either way, so it stays out of the stored state.
  const stopWatchingAudition = watch([editSceneIndex, isAuditioningEditScene], sendAuditionScene)

  onMounted(() => {
    patchConnection?.addStoredStateValueListener(onStoredStateChanged)
    patchConnection?.addEndpointListener(PatchConnectionEndpoint.Playhead, onPlayheadChanged)
    patchConnection?.addParameterListener(PatchConnectionEndpoint.Scene, onSceneChanged)
    patchConnection?.requestStoredStateValue(storedPatternKey)
    patchConnection?.requestParameterValue(PatchConnectionEndpoint.Scene)

    sendEverything()
  })

  onBeforeUnmount(() => {
    stopWatching()
    stopWatchingAudition()
    clearTimeout(storedStateTimer)

    // The audition belongs to the open editor, so closing it hands playback back to the host
    // rather than leaving the parameter overridden by a window that is no longer there.
    patchConnection?.sendEventOrValue(PatchConnectionEndpoint.AuditionScene, 0)

    patchConnection?.removeStoredStateValueListener(onStoredStateChanged)
    patchConnection?.removeEndpointListener(PatchConnectionEndpoint.Playhead, onPlayheadChanged)
    patchConnection?.removeParameterListener(PatchConnectionEndpoint.Scene, onSceneChanged)
  })
}
