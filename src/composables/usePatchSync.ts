import { inject, onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSequencerStore } from '@/stores/sequencer'
import type { PatchConnection } from '@/models/patch-connection.model'
import { PatchConnectionEndpoint, storedPatternKey } from '@/models/patch-connection-endpoints.enum'
import {
  laneIds,
  laneIndexOf,
  maxSteps,
  type PatternSnapshot,
  type Voice
} from '@/models/sequencer.model'

const storedStateDebounceMs = 400

interface SentLane {
  values: number[]
  start: number
  length: number
  offset: number
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
  const { scenes, soloedVoices } = storeToRefs(store)

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

  function sendEverything() {
    sentLanes.clear()
    sendChangedLanes()
    sendSettings()
    sendSoloMask()
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

  /// The patch decides what is playing - whether that came from the host or from this editor.
  function onSceneChanged(value: number) {
    store.setPlayingScene(Math.round(value) - 1)
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
    clearTimeout(storedStateTimer)
    patchConnection?.removeStoredStateValueListener(onStoredStateChanged)
    patchConnection?.removeEndpointListener(PatchConnectionEndpoint.Playhead, onPlayheadChanged)
    patchConnection?.removeParameterListener(PatchConnectionEndpoint.Scene, onSceneChanged)
  })
}
