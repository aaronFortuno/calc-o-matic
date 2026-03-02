// =============================================================================
// types.ts — Shared TypeScript types for the entire engine.
// All engine modules import from here; no circular dependencies.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum EntityType {
  EXTRACTOR = 'EXTRACTOR',
  CONVEYOR  = 'CONVEYOR',
  OPERATOR  = 'OPERATOR',
  RECEIVER  = 'RECEIVER',
}

/** All operator variants. Basic set unlocked initially; advanced unlocked via XP. */
export enum OperatorType {
  ADD      = 'ADD',
  SUB      = 'SUB',
  MUL      = 'MUL',
  DIV      = 'DIV',
  POWER    = 'POWER',
  MOD      = 'MOD',
  GCD      = 'GCD',
  SQUARE   = 'SQUARE',
  SQRT     = 'SQRT',
  FACTOR   = 'FACTOR',   // outputs multiple tokens (prime factors in sequence)
  IS_PRIME = 'IS_PRIME', // outputs 1 or 0
}

export enum ConveyorDirection {
  UP    = 'UP',
  DOWN  = 'DOWN',
  LEFT  = 'LEFT',
  RIGHT = 'RIGHT',
}

// ---------------------------------------------------------------------------
// Coordinates
// ---------------------------------------------------------------------------

export interface TileCoord  { x: number; y: number }
export interface ChunkCoord { cx: number; cy: number }

// ---------------------------------------------------------------------------
// Token — a numeric value travelling on conveyors
// ---------------------------------------------------------------------------

export interface Token {
  id:       string
  value:    number
  position: TileCoord
}

// ---------------------------------------------------------------------------
// Entity data payloads (one per EntityType)
// ---------------------------------------------------------------------------

export interface ExtractorData {
  value:           number              // value emitted each period
  period:          number              // ticks between emissions
  ticksUntilNext:  number              // countdown; emits when 0
  outputDirection: ConveyorDirection   // which adjacent tile receives tokens
}

export interface ConveyorData {
  direction: ConveyorDirection         // direction tokens travel
}

/**
 * OperatorData lifecycle:
 *   ticksRemaining = -1 → idle, waiting for inputs
 *   ticksRemaining > 0  → counting down after inputs filled
 *   ticksRemaining = 0  → evaluate this tick, fill outputQueue, reset to -1
 *   outputQueue.length > 0 → emitting results (one per tick)
 *
 * To add a new operator: add its OperatorType, set OPERATOR_ARITY, and add a
 * case in tick.ts evaluateOperator().
 */
export interface OperatorData {
  type:            OperatorType
  outputDirection: ConveyorDirection
  inputSlots:      (number | null)[]  // length = OPERATOR_ARITY[type]
  processingDelay: number             // ticks after inputs filled before output
  ticksRemaining:  number             // -1 = idle
  outputQueue:     number[]           // pending output values (multi-output for FACTOR)
}

export interface ReceiverData {
  expected:       number   // target value each token must match
  required:       number   // total tokens needed to complete objective
  deliveredCount: number   // correct tokens received so far
  completed:      boolean
}

export type EntityData =
  | ExtractorData
  | ConveyorData
  | OperatorData
  | ReceiverData

// ---------------------------------------------------------------------------
// Entity — a placeable game object on the grid
// ---------------------------------------------------------------------------

export interface Entity {
  id:       string
  type:     EntityType
  position: TileCoord
  data:     EntityData
}

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------

export interface WorldState {
  entities:       Record<string, Entity>  // keyed by entity id
  tileIndex:      Record<string, string>  // "x,y" → entity id (fast tile lookup)
  tokens:         Record<string, Token>   // keyed by token id
  tokenTileIndex: Record<string, string>  // "x,y" → token id
  objectives:     Objective[]
  tickCount:      number
  nextTokenId:    number                  // monotonic counter for token ids
}

// ---------------------------------------------------------------------------
// Viewport
// ---------------------------------------------------------------------------

export interface Viewport {
  offsetX: number  // canvas-space offset (pixels)
  offsetY: number
  zoom:    number  // 1.0 = 100 %
}

// ---------------------------------------------------------------------------
// Objectives & levels
// ---------------------------------------------------------------------------

export interface Objective {
  id:          string
  receiverId:  string
  description: string
  required:    number
  completed:   boolean
}

/** Serialisable level definition — used by the generator and admin import/export. */
export interface LevelDefinition {
  version:          number
  seed:             number
  difficulty:       number
  entities:         Array<Omit<Entity, never>>  // full entity snapshots
  objectives:       Objective[]
  lockedEntityIds?: string[]    // entities the player cannot erase/rotate
  allowedTools?:    string[]    // restricts toolbar to these tools only (+ eraser always allowed)
}

// ---------------------------------------------------------------------------
// Tool type — what the player currently has selected in the toolbar
// ---------------------------------------------------------------------------

export type ToolType =
  | 'extractor'
  | 'conveyor'
  | 'eraser'
  | OperatorType

// ---------------------------------------------------------------------------
// Placement result (used by world.ts and rules.ts)
// ---------------------------------------------------------------------------

export type PlacementResult =
  | { valid: true }
  | { valid: false; reason: 'OCCUPIED' | 'OUT_OF_BOUNDS' | string }

// ---------------------------------------------------------------------------
// Constants derived from types (avoids circular imports with engine modules)
// ---------------------------------------------------------------------------

/** Number of input tokens each operator type requires. */
export const OPERATOR_ARITY: Record<OperatorType, number> = {
  [OperatorType.ADD]:      2,
  [OperatorType.SUB]:      2,
  [OperatorType.MUL]:      2,
  [OperatorType.DIV]:      2,
  [OperatorType.POWER]:    2,
  [OperatorType.MOD]:      2,
  [OperatorType.GCD]:      2,
  [OperatorType.SQUARE]:   1,
  [OperatorType.SQRT]:     1,
  [OperatorType.FACTOR]:   1,
  [OperatorType.IS_PRIME]: 1,
}

/** Tile-coordinate delta for each direction. */
export const DIRECTION_DELTA: Record<ConveyorDirection, TileCoord> = {
  [ConveyorDirection.UP]:    { x:  0, y: -1 },
  [ConveyorDirection.DOWN]:  { x:  0, y:  1 },
  [ConveyorDirection.LEFT]:  { x: -1, y:  0 },
  [ConveyorDirection.RIGHT]: { x:  1, y:  0 },
}
