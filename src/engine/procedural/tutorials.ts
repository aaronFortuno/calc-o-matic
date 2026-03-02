// =============================================================================
// tutorials.ts — Hardcoded tutorial level definitions.
//
// Tutorial Level 1: extractor(2) → conveyor → conveyor → receiver(2, ×3)
// Tutorial Level 2: extractor(1) + extractor(3) → ADD → receiver(4, ×3)
//
// These levels always have the same layout (no RNG).  They are indexed by
// the level catalog in worldStore alongside procedurally generated levels.
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
// Tutorial 2 — ADD operator
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
    // Second extractor feeds from above
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
// Level catalog entry
// ---------------------------------------------------------------------------

export interface LevelEntry {
  id:          string
  name:        string          // i18n key or plain string
  description: string          // i18n key or plain string
  generate:    () => LevelDefinition
  isTutorial:  boolean
}

/** Ordered list of all levels (tutorials first, then procedural). */
export function getLevelCatalog(): LevelEntry[] {
  return [
    {
      id:          'tutorial-1',
      name:        'levels.tutorial1.name',
      description: 'levels.tutorial1.description',
      generate:    tutorialLevel1,
      isTutorial:  true,
    },
    {
      id:          'tutorial-2',
      name:        'levels.tutorial2.name',
      description: 'levels.tutorial2.description',
      generate:    tutorialLevel2,
      isTutorial:  true,
    },
    // Procedural levels are added dynamically via generateLevel()
  ]
}
