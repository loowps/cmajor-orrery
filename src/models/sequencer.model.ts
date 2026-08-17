export const maxSteps = 64
export const minPatternLength = 4
export const sceneCount = 4

export type LaneId = 'trigger' | 'hold' | 'pitch' | 'velocity' | 'gate'

export type SlotState = 'trigger' | 'hold' | 'rest'

export type LaneAdvanceMode = 'slot' | 'note'

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
  lanes: Record<LaneId, LaneState>
}

export function resetCycleOf(voice: Voice): number {
  return clamp(Math.round(voice.resetCycleSteps), 0, maxSteps)
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
}

export interface ResolvedPattern {
  slots: SlotState[]
  notes: ResolvedNote[]
  /// Which note owns each slot, so per-note lanes can be traced back to the value they read.
  noteIndexBySlot: number[]
}

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

export interface PatternSnapshot {
  version: 9
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
    lanes
  }
}
