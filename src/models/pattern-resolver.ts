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

function wrapWithin(value: number, length: number): number {
  return ((value % length) + length) % length
}

/**
 * Where inside its window the lane has travelled to. Forward and reverse walk away from the
 * phase in either direction; pendulum folds the same count back on itself, so it turns at the
 * window's edges instead of jumping back to the start.
 */
function windowPosition(lane: LaneState, readIndex: number): number {
  if (lane.length < 2) {
    return 0
  }

  if (lane.direction === 'reverse') {
    return wrapWithin(lane.offset - readIndex, lane.length)
  }

  if (lane.direction === 'pendulum') {
    const bounce = wrapWithin(lane.offset + readIndex, lane.length * 2 - 2)
    return bounce < lane.length ? bounce : lane.length * 2 - 2 - bounce
  }

  return wrapWithin(lane.offset + readIndex, lane.length)
}

export function laneValueIndex(lane: LaneState, readIndex: number): number {
  return lane.start + windowPosition(lane, readIndex)
}

export function laneValueAt(lane: LaneState, readIndex: number): number {
  return lane.values[laneValueIndex(lane, readIndex)]
}

/**
 * Every slot is one 16th. A slot either starts a note, extends the note before it, or is
 * silent — so a step's length is emergent rather than stored, and gate is a fraction of
 * whatever length the holds produced.
 *
 * This resolves the pattern rather than a pass of it. The rate lane is the one thing that reads
 * differently from one turn to the next, and it only silences a note: the note still keeps its
 * place, its span and its turn at the per-note lanes, so everything resolved here is true of
 * every pass and the rate is carried on the note for the editor to mark.
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
        gate: readLane(voice, 'gate', position, noteIndex),
        nudge: readLane(voice, 'nudge', position, noteIndex),
        ratchet: readLane(voice, 'ratchet', position, noteIndex),
        rate: readLane(voice, 'rate', position, noteIndex)
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
