import {
  triggerThresholdOf,
  holdThresholdOf,
  laneDefinition,
  laneOutput,
  resetCycleOf,
  type LaneId,
  type LaneState,
  type ResolvedNote,
  type ResolvedPattern,
  type SlotState,
  type Voice
} from '@/models/sequencer.model'

export function laneValueIndex(lane: LaneState, readIndex: number): number {
  return lane.start + ((readIndex + lane.offset) % lane.length)
}

export function laneValueAt(lane: LaneState, readIndex: number): number {
  return lane.values[laneValueIndex(lane, readIndex)]
}

/**
 * Every slot is one 16th. A slot either starts a note, extends the note before it, or is
 * silent — so a step's length is emergent rather than stored, and gate is a fraction of
 * whatever length the holds produced.
 */
export function resolvePattern(voice: Voice): ResolvedPattern {
  const slots: SlotState[] = []
  const notes: ResolvedNote[] = []
  const noteIndexBySlot: number[] = []
  const triggerThreshold = triggerThresholdOf(voice)
  const holdThreshold = holdThresholdOf(voice)
  const cycle = resetCycleOf(voice)

  let currentNote: ResolvedNote | null = null
  let noteIndex = 0

  for (let slot = 0; slot < voice.patternLength; ++slot) {
    const position = lanePositionAt(voice, slot)

    if (cycle > 0 && position === 0) {
      noteIndex = 0
    }

    const trigger = readLane(voice, 'trigger', position, noteIndex)
    const hold = readLane(voice, 'hold', position, noteIndex)

    if (trigger >= triggerThreshold) {
      currentNote = {
        startSlot: slot,
        span: 1,
        pitch: readLane(voice, 'pitch', position, noteIndex),
        velocity: readLane(voice, 'velocity', position, noteIndex),
        gate: readLane(voice, 'gate', position, noteIndex)
      }

      notes.push(currentNote)
      slots.push('trigger')
      noteIndexBySlot.push(noteIndex)
      ++noteIndex
      continue
    }

    if (currentNote && hold >= holdThreshold) {
      ++currentNote.span
      slots.push('hold')
      noteIndexBySlot.push(noteIndex - 1)
      continue
    }

    currentNote = null
    slots.push('rest')
    noteIndexBySlot.push(Math.max(0, noteIndex - 1))
  }

  return { slots, notes, noteIndexBySlot }
}

/**
 * The value index a lane reads at a given pattern slot. Slot-advance lanes step with the
 * pattern; pitch and velocity step per note, and every lane maps through its own window - so
 * the slot under the playhead is rarely the cell the lane is actually reading.
 */
export function laneReadIndexAt(
  voice: Voice,
  laneId: LaneId,
  pattern: ResolvedPattern,
  slot: number
): number {
  const definition = laneDefinition(laneId)
  const readIndex =
    definition.advance === 'note'
      ? (pattern.noteIndexBySlot[slot] ?? 0)
      : lanePositionAt(voice, slot)

  return laneValueIndex(voice.lanes[laneId], readIndex)
}

/**
 * Trigger and hold decide the rhythm, so they are read at every step. Pitch, velocity and gate
 * describe a note, so they advance once per note - a five-value pitch lane plays its five values
 * in order however the rhythm falls, and no value goes unused when the density changes.
 */
function readLane(voice: Voice, laneId: LaneId, position: number, noteIndex: number): number {
  const lane = voice.lanes[laneId]
  const definition = laneDefinition(laneId)
  const readIndex = definition.advance === 'note' ? noteIndex : position

  return laneOutput(laneValueAt(lane, readIndex), lane, definition)
}

/// Where the lanes are within their reset cycle at a given slot of the pattern.
export function lanePositionAt(voice: Voice, slot: number): number {
  const cycle = resetCycleOf(voice)

  return cycle > 0 ? slot % cycle : slot
}
