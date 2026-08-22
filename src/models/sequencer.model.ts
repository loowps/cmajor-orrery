export const maxSteps = 64
export const minPatternLength = 4
export const sceneCount = 8

export type LaneId =
  'trigger' | 'hold' | 'rate' | 'nudge' | 'ratchet' | 'pitch' | 'velocity' | 'gate'

/**
 * How far off its slot a note may be pushed, as a percentage of a 16th. Half a step either way is
 * the most the sequencer will take: at exactly half, a note pushed late can reach its neighbour's
 * moment but never overtake it, so the order a pattern is drawn in is the order it is heard in.
 */
export const maxNudgePercent = 50

/// How many times a note may be struck inside its own length.
export const maxRatchetHits = 8

export type SlotState = 'trigger' | 'hold' | 'rest'

export type LaneAdvanceMode = 'slot' | 'note'

/**
 * Which way a lane walks its window. The phase marks the cell it reads first whichever way it
 * travels, so changing direction turns the material round without moving the entry point.
 */
export type LaneDirection = 'forward' | 'reverse' | 'pendulum'

/// The patch identifies directions by position, so this order has to match the direction
/// constants in Orrery.cmajor.
export const laneDirections: LaneDirection[] = ['forward', 'reverse', 'pendulum']

export const laneDirectionLabels: Record<LaneDirection, string> = {
  forward: 'Forward',
  reverse: 'Reverse',
  pendulum: 'Pendulum'
}

export function laneDirectionIndexOf(direction: LaneDirection): number {
  return Math.max(0, laneDirections.indexOf(direction))
}

export function nextLaneDirection(direction: LaneDirection): LaneDirection {
  return laneDirections[(laneDirectionIndexOf(direction) + 1) % laneDirections.length]
}

export interface LaneDefinition {
  id: LaneId
  label: string
  min: number
  max: number
  step: number
  unit: string
  usesThreshold: boolean
  advance: LaneAdvanceMode
  defaultLength: number
  defaultValue: number
  defaultOutputMin: number
  defaultOutputMax: number
}

/**
 * A lane owns a full-length value array, but only cycles through the window that `start` and
 * `length` describe. Sliding that window over the values re-uses the same drawn material in a
 * different order, which is a faster way to find something than redrawing it.
 *
 * Values are stored as a normalised 0..1 position, and `outputMin`/`outputMax` map them onto
 * real units as the note is produced. Drawing and randomising therefore always use the lane's
 * full height, and narrowing the range squeezes a running sequence rather than flattening it.
 */
export interface LaneState {
  start: number
  length: number
  /**
   * Where inside the window the lane begins reading. The window chooses which values the lane
   * owns; the offset only rotates it within them, so two lanes can share material and still
   * answer each other rather than speaking at once.
   */
  offset: number
  direction: LaneDirection
  values: number[]
  outputMin: number
  outputMax: number
  locked: boolean
}

/**
 * Every voice keeps its own pattern length, density and hold, so voices phase against each
 * other the same way lanes phase within a voice.
 */
export interface Voice {
  enabled: boolean
  patternLength: number
  density: number
  holdAmount: number
  /**
   * How often, in steps, every lane snaps back to the start of its window. Zero means they never
   * realign and each free-runs at its own length, so switching resetting off is the same control
   * as choosing how often it happens.
   */
  resetCycleSteps: number
  /**
   * Added to every lane's own offset rather than replacing it, and wrapped inside each lane's own
   * window - so a five-long lane answers a phase of seven by turning two, and the voice stays
   * polymetric while it is being dialled.
   */
  phaseOffset: number
  lanes: Record<LaneId, LaneState>
}

export function resetCycleOf(voice: Voice): number {
  return clamp(Math.round(voice.resetCycleSteps), 0, maxSteps)
}

/// A pattern saved before the control existed has no phase, which reads the same as none.
export function phaseOffsetOf(voice: Voice): number {
  return clamp(Math.round(voice.phaseOffset ?? 0), 0, maxSteps - 1)
}

/// Both controls read as "more" when turned up, but the resolver compares against a threshold.
export function triggerThresholdOf(voice: Voice): number {
  return 1 - voice.density
}

export function holdThresholdOf(voice: Voice): number {
  return 1 - voice.holdAmount
}

export interface ResolvedNote {
  startSlot: number
  span: number
  pitch: number
  velocity: number
  gate: number
  /// How far off its slot the note sounds, as a percentage of a 16th.
  nudge: number
  /// How many times it is struck inside its own length. One is a plain note.
  ratchet: number
  /**
   * The share of passes the note sounds on. Whether this particular pass is one of them is the
   * patch's to decide, so the note is marked as one that comes and goes rather than silenced
   * here: below a hundred it is drawn as intermittent.
   */
  rate: number
}

export interface ResolvedPattern {
  slots: SlotState[]
  notes: ResolvedNote[]
  /// Which note owns each slot, so per-note lanes can be traced back to the value they read.
  noteIndexBySlot: number[]
}

/**
 * Where a pass of the pattern begins: the lane position its first slot reads, and the note count
 * the per-note lanes carry into it. A realigning voice starts every cycle from the same place, so
 * only a free-running one has anything to carry - which is why the patch reports this rather than
 * the editor deriving it from a pass number it cannot see.
 */
export interface PassOrigin {
  position: number
  noteIndex: number
}

/// Where the pattern is read from when nothing is playing, and the first pass of one that is.
export const patternStart: PassOrigin = { position: 0, noteIndex: 0 }

export const laneDefinitions: LaneDefinition[] = [
  {
    id: 'trigger',
    label: 'Trigger',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    usesThreshold: true,
    advance: 'slot',
    defaultLength: 16,
    defaultValue: 1,
    defaultOutputMin: 0,
    defaultOutputMax: 1
  },
  {
    id: 'hold',
    label: 'Hold',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    usesThreshold: true,
    advance: 'slot',
    defaultLength: 16,
    defaultValue: 0,
    defaultOutputMin: 0,
    defaultOutputMax: 1
  },
  {
    id: 'rate',
    label: 'Rate',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    usesThreshold: false,
    advance: 'slot',
    defaultLength: 16,
    defaultValue: 1,
    defaultOutputMin: 0,
    defaultOutputMax: 100
  },
  {
    id: 'nudge',
    label: 'Nudge',
    min: -maxNudgePercent,
    max: maxNudgePercent,
    step: 1,
    unit: '%',
    usesThreshold: false,
    advance: 'slot',
    defaultLength: 16,
    defaultValue: 0.5,
    defaultOutputMin: -maxNudgePercent,
    defaultOutputMax: maxNudgePercent
  },
  {
    id: 'ratchet',
    label: 'Ratchet',
    min: 1,
    max: maxRatchetHits,
    step: 1,
    unit: '×',
    usesThreshold: false,
    advance: 'note',
    defaultLength: 16,
    defaultValue: 0,
    defaultOutputMin: 1,
    defaultOutputMax: 4
  },
  {
    id: 'gate',
    label: 'Gate',
    min: 1,
    max: 100,
    step: 1,
    unit: '%',
    usesThreshold: false,
    advance: 'note',
    defaultLength: 16,
    defaultValue: 0.5,
    defaultOutputMin: 20,
    defaultOutputMax: 95
  },
  {
    id: 'pitch',
    label: 'Pitch',
    min: 0,
    max: 127,
    step: 1,
    unit: '',
    usesThreshold: false,
    advance: 'note',
    defaultLength: 16,
    defaultValue: 0.5,
    defaultOutputMin: 48,
    defaultOutputMax: 72
  },
  {
    id: 'velocity',
    label: 'Velocity',
    min: 1,
    max: 127,
    step: 1,
    unit: '',
    usesThreshold: false,
    advance: 'note',
    defaultLength: 16,
    defaultValue: 0.5,
    defaultOutputMin: 70,
    defaultOutputMax: 120
  }
]

export const laneIds = laneDefinitions.map((definition) => definition.id)

/**
 * The patch identifies lanes by position, so this order has to match the laneTrigger..laneGate
 * constants in Orrery.cmajor.
 */
export function laneIndexOf(laneId: LaneId): number {
  return laneIds.indexOf(laneId)
}

/**
 * A whole board, frozen: every voice with its lanes and settings. The scene being edited and the
 * scene being played are separate choices, so the editor can prepare one while another sounds.
 */
export interface Scene {
  voices: Voice[]
}

export const snapshotVersion = 14

/**
 * Nothing a later build added is required to read an earlier pattern: lane direction arrived in
 * 10 and defaults to forward, 11 widened the board from four scenes to eight, and 12 to 14 added
 * the nudge, ratchet and rate lanes, whose inert values are the grid, the single strike and the
 * every-pass a pattern was already playing. Each is a longer record rather than a different one,
 * so every version still loads as what it was.
 */
export const loadableSnapshotVersions = [9, 10, 11, 12, 13, snapshotVersion]

export interface PatternSnapshot {
  version: number
  scenes: Scene[]
}

const definitionsById = new Map(laneDefinitions.map((definition) => [definition.id, definition]))

export function laneDefinition(laneId: LaneId): LaneDefinition {
  return definitionsById.get(laneId)!
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

export function quantizeToLane(value: number, definition: LaneDefinition): number {
  const stepped = Math.round(value / definition.step) * definition.step
  return clamp(Number(stepped.toFixed(4)), definition.min, definition.max)
}

/// Maps a stored 0..1 position onto the lane's live output range.
export function laneOutput(
  normalized: number,
  lane: LaneState,
  definition: LaneDefinition
): number {
  return quantizeToLane(lane.outputMin + normalized * (lane.outputMax - lane.outputMin), definition)
}

export function createLaneState(definition: LaneDefinition): LaneState {
  return {
    start: 0,
    length: definition.defaultLength,
    offset: 0,
    direction: 'forward',
    values: new Array<number>(maxSteps).fill(definition.defaultValue),
    outputMin: definition.defaultOutputMin,
    outputMax: definition.defaultOutputMax,
    locked: false
  }
}

export function createVoice(enabled: boolean): Voice {
  const lanes = {} as Record<LaneId, LaneState>

  for (const definition of laneDefinitions) {
    lanes[definition.id] = createLaneState(definition)
  }

  return {
    enabled,
    patternLength: 16,
    density: 0.58,
    holdAmount: 0.5,
    resetCycleSteps: 16,
    phaseOffset: 0,
    lanes
  }
}
