// =============================================================================
// tick.ts — Discrete game loop: one tick advances the whole simulation.
//
// Tick order each step:
//   1. tickExtractors  — emit tokens onto output conveyors
//   2. tickConveyors   — move tokens forward; deposit into operators/receivers
//   3. tickOperators   — count down, evaluate, enqueue output tokens
//
// All sub-functions are pure (WorldState in → WorldState out).
// The TickEngine class wraps them in a setInterval scheduler.
//
// To add a new operator: see the extension guide at the top of operator.ts.
// =============================================================================

import type {
  WorldState,
  Token,
  TileCoord,
  ExtractorData,
  ConveyorData,
  OperatorData,
  ReceiverData,
} from './entities/types'
import {
  EntityType,
  DIRECTION_DELTA,
  OPERATOR_ARITY,
} from './entities/types'
import { tileKey } from './grid'
import { evaluateOperator } from './entities/operator'

// ---------------------------------------------------------------------------
// Internal token helpers
// ---------------------------------------------------------------------------

function mintToken(state: WorldState, value: number, position: TileCoord): WorldState {
  const id  = `t${state.nextTokenId}`
  const tok: Token = { id, value, position }
  const key = tileKey(position)
  return {
    ...state,
    nextTokenId:    state.nextTokenId + 1,
    tokens:         { ...state.tokens,         [id]:  tok },
    tokenTileIndex: { ...state.tokenTileIndex, [key]: id  },
  }
}

function burnToken(state: WorldState, tokenId: string): WorldState {
  const tok = state.tokens[tokenId]
  if (!tok) return state
  const tokens         = { ...state.tokens }
  const tokenTileIndex = { ...state.tokenTileIndex }
  delete tokens[tokenId]
  delete tokenTileIndex[tileKey(tok.position)]
  return { ...state, tokens, tokenTileIndex }
}

function moveToken(state: WorldState, tokenId: string, to: TileCoord): WorldState {
  const tok = state.tokens[tokenId]
  if (!tok) return state
  const tokenTileIndex = { ...state.tokenTileIndex }
  delete tokenTileIndex[tileKey(tok.position)]
  tokenTileIndex[tileKey(to)] = tokenId
  return {
    ...state,
    tokens:         { ...state.tokens, [tokenId]: { ...tok, position: to } },
    tokenTileIndex,
  }
}

// ---------------------------------------------------------------------------
// 1. Extractors — emit one token per period onto their output conveyor
// ---------------------------------------------------------------------------

function tickExtractors(state: WorldState): WorldState {
  let s = state

  for (const entity of Object.values(s.entities)) {
    if (entity.type !== EntityType.EXTRACTOR) continue
    const data = entity.data as ExtractorData

    if (data.ticksUntilNext > 0) {
      // Decrement countdown
      s = {
        ...s,
        entities: {
          ...s.entities,
          [entity.id]: { ...entity, data: { ...data, ticksUntilNext: data.ticksUntilNext - 1 } },
        },
      }
    } else {
      // Try to emit a token onto the output tile
      const delta      = DIRECTION_DELTA[data.outputDirection]
      const outputTile = { x: entity.position.x + delta.x, y: entity.position.y + delta.y }
      const outputKey  = tileKey(outputTile)
      const targetId   = s.tileIndex[outputKey]

      if (targetId && !s.tokenTileIndex[outputKey]) {
        const target = s.entities[targetId]
        if (target?.type === EntityType.CONVEYOR) {
          s = mintToken(s, data.value, outputTile)
        }
      }

      // Always reset the counter (backpressure: skip this emission if blocked,
      // but still reset so it tries again next period)
      s = {
        ...s,
        entities: {
          ...s.entities,
          [entity.id]: { ...entity, data: { ...data, ticksUntilNext: data.period - 1 } },
        },
      }
    }
  }

  return s
}

// ---------------------------------------------------------------------------
// 2. Conveyors — move tokens forward; deposit into operators/receivers
// ---------------------------------------------------------------------------

function tickConveyors(state: WorldState): WorldState {
  let s = state

  // Collect tokens that sit on a conveyor tile, sorted by id for determinism
  const moveable = Object.values(s.tokens)
    .filter(tok => {
      const eid = s.tileIndex[tileKey(tok.position)]
      return eid != null && s.entities[eid]?.type === EntityType.CONVEYOR
    })
    .sort((a, b) => a.id.localeCompare(b.id))

  // Track tiles that will be claimed this tick (prevents two tokens colliding)
  const claimed = new Set<string>()

  for (const tok of moveable) {
    const eid = s.tileIndex[tileKey(tok.position)]
    if (!eid) continue
    const conveyor = s.entities[eid]
    if (!conveyor || conveyor.type !== EntityType.CONVEYOR) continue

    const data      = conveyor.data as ConveyorData
    const delta     = DIRECTION_DELTA[data.direction]
    const nextTile  = { x: tok.position.x + delta.x, y: tok.position.y + delta.y }
    const nextKey   = tileKey(nextTile)
    const nextEid   = s.tileIndex[nextKey]

    if (!nextEid) continue // nothing ahead — token stays

    const nextEntity = s.entities[nextEid]
    if (!nextEntity) continue

    switch (nextEntity.type) {
      case EntityType.CONVEYOR: {
        // Move if next tile is unoccupied and not yet claimed this tick
        if (!s.tokenTileIndex[nextKey] && !claimed.has(nextKey)) {
          claimed.add(nextKey)
          s = moveToken(s, tok.id, nextTile)
        }
        break
      }

      case EntityType.OPERATOR: {
        // Deposit into first available input slot (only when operator is idle)
        const opData = nextEntity.data as OperatorData
        if (opData.ticksRemaining !== -1) break // busy

        const slotIndex = opData.inputSlots.indexOf(null)
        if (slotIndex === -1) break // all slots full

        const newSlots      = [...opData.inputSlots]
        newSlots[slotIndex] = tok.value
        s = burnToken(s, tok.id)
        s = {
          ...s,
          entities: {
            ...s.entities,
            [nextEntity.id]: {
              ...nextEntity,
              data: { ...opData, inputSlots: newSlots },
            },
          },
        }
        break
      }

      case EntityType.RECEIVER: {
        const recData = nextEntity.data as ReceiverData
        if (recData.completed) break // already done — discard token

        const correct  = tok.value === recData.expected
        s = burnToken(s, tok.id)

        if (correct) {
          const newCount  = recData.deliveredCount + 1
          const completed = newCount >= recData.required
          s = {
            ...s,
            entities: {
              ...s.entities,
              [nextEntity.id]: {
                ...nextEntity,
                data: { ...recData, deliveredCount: newCount, completed },
              },
            },
          }
          // Mirror completion onto the matching objective
          if (completed) {
            s = {
              ...s,
              objectives: s.objectives.map(obj =>
                obj.receiverId === nextEntity.id ? { ...obj, completed: true } : obj,
              ),
            }
          }
        }
        break
      }

      default:
        break
    }
  }

  return s
}

// ---------------------------------------------------------------------------
// 3. Operators — process inputs, emit outputs
// ---------------------------------------------------------------------------

function tickOperators(state: WorldState): WorldState {
  let s = state

  for (const entity of Object.values(s.entities)) {
    if (entity.type !== EntityType.OPERATOR) continue
    const data = entity.data as OperatorData

    // --- Step A: emit next queued output token (one per tick) ---------------
    if (data.outputQueue.length > 0) {
      const delta      = DIRECTION_DELTA[data.outputDirection]
      const outTile    = { x: entity.position.x + delta.x, y: entity.position.y + delta.y }
      const outKey     = tileKey(outTile)
      const outEid     = s.tileIndex[outKey]

      if (outEid && !s.tokenTileIndex[outKey]) {
        const outEntity = s.entities[outEid]
        if (outEntity?.type === EntityType.CONVEYOR) {
          const [first, ...rest] = data.outputQueue
          s = mintToken(s, first, outTile)
          s = {
            ...s,
            entities: {
              ...s.entities,
              [entity.id]: { ...entity, data: { ...data, outputQueue: rest } },
            },
          }
        }
      }
      continue // don't accept new inputs while draining the queue
    }

    // --- Step B: count down processing delay --------------------------------
    if (data.ticksRemaining > 0) {
      s = {
        ...s,
        entities: {
          ...s.entities,
          [entity.id]: {
            ...entity,
            data: { ...data, ticksRemaining: data.ticksRemaining - 1 },
          },
        },
      }
      continue
    }

    // --- Step C: evaluate when countdown reaches 0 --------------------------
    if (data.ticksRemaining === 0) {
      const arity  = OPERATOR_ARITY[data.type]
      const inputs = data.inputSlots.slice(0, arity) as number[]
      const result = evaluateOperator(data.type, inputs)
      const cleared: (number | null)[] = new Array(arity).fill(null)
      s = {
        ...s,
        entities: {
          ...s.entities,
          [entity.id]: {
            ...entity,
            data: {
              ...data,
              inputSlots:    cleared,
              ticksRemaining: -1,
              outputQueue:   result,
            },
          },
        },
      }
      continue
    }

    // --- Step D: start processing when all inputs arrive (ticksRemaining=-1) -
    if (data.ticksRemaining === -1) {
      const arity     = OPERATOR_ARITY[data.type]
      const allFilled = data.inputSlots.slice(0, arity).every(v => v !== null)
      if (allFilled) {
        s = {
          ...s,
          entities: {
            ...s.entities,
            [entity.id]: {
              ...entity,
              data: { ...data, ticksRemaining: data.processingDelay },
            },
          },
        }
      }
    }
  }

  return s
}

// ---------------------------------------------------------------------------
// Main tick — compose all sub-ticks in order
// ---------------------------------------------------------------------------

export function tickWorld(state: WorldState): WorldState {
  let s = tickExtractors(state)
  s     = tickConveyors(s)
  s     = tickOperators(s)
  return { ...s, tickCount: s.tickCount + 1 }
}

// ---------------------------------------------------------------------------
// TickEngine — setInterval wrapper around tickWorld
// ---------------------------------------------------------------------------

export class TickEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private _state:     WorldState
  private _tickRate:  number
  private onTick:     (state: WorldState) => void

  /** @param tickRate  Ticks per second (1–60). Default 8. */
  constructor(
    initialState: WorldState,
    onTick:       (state: WorldState) => void,
    tickRate = 8,
  ) {
    this._state    = initialState
    this._tickRate = Math.max(1, Math.min(60, tickRate))
    this.onTick    = onTick
  }

  start(): void {
    if (this.intervalId !== null) return
    this.intervalId = setInterval(() => {
      this._state = tickWorld(this._state)
      this.onTick(this._state)
    }, 1000 / this._tickRate)
  }

  stop(): void {
    if (this.intervalId === null) return
    clearInterval(this.intervalId)
    this.intervalId = null
  }

  /** Change tick rate; restarts the interval if already running. */
  setTickRate(rate: number): void {
    const wasRunning = this.isRunning()
    if (wasRunning) this.stop()
    this._tickRate = Math.max(1, Math.min(60, rate))
    if (wasRunning) this.start()
  }

  isRunning(): boolean {
    return this.intervalId !== null
  }

  get state(): WorldState   { return this._state }
  get tickRate(): number    { return this._tickRate }

  setState(state: WorldState): void { this._state = state }
}
