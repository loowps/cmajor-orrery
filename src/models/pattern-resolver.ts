import {
  triggerThresholdOf,
  holdThresholdOf,
  laneDefinition,
  laneOutput,
  phaseOffsetOf,
  patternStart,
  resetCycleOf,
  type LaneId,
  type LaneState,
  type PassOrigin,
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
 *
 * The voice's phase adds to the lane's own offset before the window wraps, so each lane turns
 * through its own length and a direction reads it as it reads any other offset.
 */
function windowPosition(lane: LaneState, readIndex: number, phase: number): number {
  if (lane.length < 2) {
    return 0
  }

  const offset = lane.offset + phase

  if (lane.direction === 'reverse') {
    return wrapWithin(offset - readIndex, lane.length)
  }

  if (lane.direction === 'pendulum') {
    const bounce = wrapWithin(offset + readIndex, lane.length * 2 - 2)
    return bounce < lane.length ? bounce : lane.length * 2 - 2 - bounce
  }

  return wrapWithin(offset + readIndex, lane.length)
}

export function laneValueIndex(lane: LaneState, readIndex: number, phase = 0): number {
  return lane.start + windowPosition(lane, readIndex, phase)
}

export function laneValueAt(lane: LaneState, readIndex: number, phase = 0): number {
  return lane.values[laneValueIndex(lane, readIndex, phase)]
}

/**
 * Every slot is one 16th. A slot either starts a note, extends the note before it, or is
 * silent — so a step's length is emergent rather than stored, and gate is a fraction of
 * whatever length the holds produced.
 *
 * This resolves one pass of the pattern, taken from where that pass begins. A realigning voice
 * plays the same pass every turn, so its origin is always the pattern's start; a free-running one
 * has moved its lanes on, and reading it from the start would show it realigning when it is not.
 *
 * The rate lane is the one thing left that reads differently from one turn to the next, and it
 * only silences a note: the note still keeps its place, its span and its turn at the per-note
 * lanes, so it is carried on the note for the editor to mark rather than resolved here.
 */
export function resolvePattern(voice: Voice, origin: PassOrigin = patternStart): ResolvedPattern {
  const slots: SlotState[] = []
  const notes: ResolvedNote[] = []
  const noteIndexBySlot: number[] = []
  const triggerThreshold = triggerThresholdOf(voice)
  const holdThreshold = holdThresholdOf(voice)
  const cycle = resetCycleOf(voice)

  let currentNote: ResolvedNote | null = null
  let noteIndex = origin.noteIndex

  for (let slot = 0; slot < voice.patternLength; ++slot) {
    const position = lanePositionAt(voice, slot, origin)

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
  slot: number,
  origin: PassOrigin = patternStart
): number {
  const definition = laneDefinition(laneId)
  const readIndex =
    definition.advance === 'note'
      ? (pattern.noteIndexBySlot[slot] ?? 0)
      : lanePositionAt(voice, slot, origin)

  return laneValueIndex(voice.lanes[laneId], readIndex, phaseOffsetOf(voice))
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

  return laneOutput(laneValueAt(lane, readIndex, phaseOffsetOf(voice)), lane, definition)
}

/**
 * How far the slot-advance lanes have walked by a given slot of the pass. A reset cycle wraps
 * that walk; without one it simply carries on from wherever the pass began, which is what lets
 * a lane shorter than the pattern land somewhere new on the next turn.
 */
export function lanePositionAt(
  voice: Voice,
  slot: number,
  origin: PassOrigin = patternStart
): number {
  const cycle = resetCycleOf(voice)
  const position = origin.position + slot

  return cycle > 0 ? position % cycle : position
}
