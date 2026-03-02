// =============================================================================
// tutorials.ts — Hardcoded tutorial level definitions.
//
// Tutorial 1: Conveyor basics — extractor → conveyors → receiver
// Tutorial 2: ADD operator — two extractors → ADD → receiver
// Tutorial 3: MUL operator — two extractors → MUL → receiver
// Tutorial 4: SUB operator — extractor(10) - extractor(3) → receiver(7)
// Tutorial 5: DIV operator — extractor(12) ÷ extractor(4) → receiver(3)
// Tutorial 6: Chained ops — extractor(2) × extractor(5) + extractor(4) → 14
//
// These levels always have the same layout (no RNG).
// =============================================================================

import type { LevelDefinition, Entity, Objective } from '../entities/types'
import { ConveyorDirection, OperatorType } from '../entities/types'
import { createExtractor } from '../entities/extractor'
import { createConveyor }  from '../entities/conveyor'
import { createOperator }  from '../entities/operator'
import { createReceiver }  from '../entities/receiver'

// ---------------------------------------------------------------------------
// Tutorial 1 — Straight belt
//
//  E[2] → C → C → R[2, ×3]
//  (0,0) (1,0)(2,0)(3,0)
// ---------------------------------------------------------------------------

export function tutorialLevel1(): LevelDefinition {
  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y: 0 }, 2, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT),
    createConveyor ('c2', { x: 2, y: 0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 3, y: 0 }, 2, 3),
  ]

  const objectives: Objective[] = [{
    id:          'tut1-obj1',
    receiverId:  'r1',
    description: 'Deliver 3 tokens of value 2',
    required:    3,
    completed:   false,
  }]

  return { version: 1, seed: 0, difficulty: 0, entities, objectives }
}

// ---------------------------------------------------------------------------
// Tutorial 2 — ADD: 1 + 3 = 4
//
//            E[3]           ← (2, -2) DOWN
//             |
//             C             ← (2, -1) DOWN
//             |
//  E[1] → C → ADD → C → R[4, ×3]
//  (0,0) (1,0)(2,0)(3,0)(4,0)
// ---------------------------------------------------------------------------

export function tutorialLevel2(): LevelDefinition {
  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, 1, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.ADD, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 4, y:  0 }, 4, 3),
    createExtractor('e2', { x: 2, y: -2 }, 3, 3, ConveyorDirection.DOWN),
    createConveyor ('c3', { x: 2, y: -1 }, ConveyorDirection.DOWN),
  ]

  const objectives: Objective[] = [{
    id:          'tut2-obj1',
    receiverId:  'r1',
    description: 'Deliver 3 tokens of value 1 + 3 = 4',
    required:    3,
    completed:   false,
  }]

  return { version: 1, seed: 0, difficulty: 1, entities, objectives }
}

// ---------------------------------------------------------------------------
// Tutorial 3 — MUL: 3 × 4 = 12
//
//            E[4]           ← (2, -2) DOWN
//             |
//             C             ← (2, -1) DOWN
//             |
//  E[3] → C → MUL → C → R[12, ×3]
//  (0,0) (1,0)(2,0)(3,0)(4,0)
// ---------------------------------------------------------------------------

export function tutorialLevel3(): LevelDefinition {
  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, 3, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.MUL, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 4, y:  0 }, 12, 3),
    createExtractor('e2', { x: 2, y: -2 }, 4, 3, ConveyorDirection.DOWN),
    createConveyor ('c3', { x: 2, y: -1 }, ConveyorDirection.DOWN),
  ]

  const objectives: Objective[] = [{
    id:          'tut3-obj1',
    receiverId:  'r1',
    description: 'Deliver 3 tokens of value 3 × 4 = 12',
    required:    3,
    completed:   false,
  }]

  return { version: 1, seed: 0, difficulty: 1, entities, objectives }
}

// ---------------------------------------------------------------------------
// Tutorial 4 — SUB: 10 - 3 = 7
//
//            E[3]           ← (2, -2) DOWN
//             |
//             C             ← (2, -1) DOWN
//             |
//  E[10] → C → SUB → C → R[7, ×3]
//  (0,0)  (1,0)(2,0)(3,0)(4,0)
// ---------------------------------------------------------------------------

export function tutorialLevel4(): LevelDefinition {
  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, 10, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.SUB, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 4, y:  0 }, 7, 3),
    createExtractor('e2', { x: 2, y: -2 }, 3, 3, ConveyorDirection.DOWN),
    createConveyor ('c3', { x: 2, y: -1 }, ConveyorDirection.DOWN),
  ]

  const objectives: Objective[] = [{
    id:          'tut4-obj1',
    receiverId:  'r1',
    description: 'Deliver 3 tokens of value 10 − 3 = 7',
    required:    3,
    completed:   false,
  }]

  return { version: 1, seed: 0, difficulty: 1, entities, objectives }
}

// ---------------------------------------------------------------------------
// Tutorial 5 — DIV: 12 ÷ 4 = 3
//
//            E[4]           ← (2, -2) DOWN
//             |
//             C             ← (2, -1) DOWN
//             |
//  E[12] → C → DIV → C → R[3, ×3]
//  (0,0)  (1,0)(2,0)(3,0)(4,0)
// ---------------------------------------------------------------------------

export function tutorialLevel5(): LevelDefinition {
  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, 12, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.DIV, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 4, y:  0 }, 3, 3),
    createExtractor('e2', { x: 2, y: -2 }, 4, 3, ConveyorDirection.DOWN),
    createConveyor ('c3', { x: 2, y: -1 }, ConveyorDirection.DOWN),
  ]

  const objectives: Objective[] = [{
    id:          'tut5-obj1',
    receiverId:  'r1',
    description: 'Deliver 3 tokens of value 12 ÷ 4 = 3',
    required:    3,
    completed:   false,
  }]

  return { version: 1, seed: 0, difficulty: 1, entities, objectives }
}

// ---------------------------------------------------------------------------
// Tutorial 6 — Chained: (2 × 5) + 4 = 14
//
//            E[5]         E[4]         ← (2,-2) and (4,-2)
//             |            |
//             C            C           ← (2,-1) and (4,-1)
//             |            |
//  E[2] → C → MUL → C → ADD → C → R[14, ×3]
//  (0,0) (1,0)(2,0)  (3,0)(4,0)(5,0)(6,0)
// ---------------------------------------------------------------------------

export function tutorialLevel6(): LevelDefinition {
  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, 2, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.MUL, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, OperatorType.ADD, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 6, y:  0 }, 14, 3),
    createExtractor('e2', { x: 2, y: -2 }, 5, 3, ConveyorDirection.DOWN),
    createConveyor ('c4', { x: 2, y: -1 }, ConveyorDirection.DOWN),
    createExtractor('e3', { x: 4, y: -2 }, 4, 3, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 4, y: -1 }, ConveyorDirection.DOWN),
  ]

  const objectives: Objective[] = [{
    id:          'tut6-obj1',
    receiverId:  'r1',
    description: 'Deliver 3 tokens of value (2 × 5) + 4 = 14',
    required:    3,
    completed:   false,
  }]

  return { version: 1, seed: 0, difficulty: 2, entities, objectives }
}

// ---------------------------------------------------------------------------
// Level catalog entry
// ---------------------------------------------------------------------------

export interface LevelEntry {
  id:          string
  name:        string          // i18n key
  description: string          // i18n key
  generate:    () => LevelDefinition
  isTutorial:  boolean
}

/** Ordered list of all levels (tutorials first, then procedural). */
export function getLevelCatalog(): LevelEntry[] {
  return [
    {
      id: 'tutorial-1', name: 'levels.tutorial1.name',
      description: 'levels.tutorial1.description',
      generate: tutorialLevel1, isTutorial: true,
    },
    {
      id: 'tutorial-2', name: 'levels.tutorial2.name',
      description: 'levels.tutorial2.description',
      generate: tutorialLevel2, isTutorial: true,
    },
    {
      id: 'tutorial-3', name: 'levels.tutorial3.name',
      description: 'levels.tutorial3.description',
      generate: tutorialLevel3, isTutorial: true,
    },
    {
      id: 'tutorial-4', name: 'levels.tutorial4.name',
      description: 'levels.tutorial4.description',
      generate: tutorialLevel4, isTutorial: true,
    },
    {
      id: 'tutorial-5', name: 'levels.tutorial5.name',
      description: 'levels.tutorial5.description',
      generate: tutorialLevel5, isTutorial: true,
    },
    {
      id: 'tutorial-6', name: 'levels.tutorial6.name',
      description: 'levels.tutorial6.description',
      generate: tutorialLevel6, isTutorial: true,
    },
  ]
}
