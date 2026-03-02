import { describe, it, expect, beforeEach } from 'vitest'
import { useWorldStore } from '../../store/worldStore'
import { usePlayerStore } from '../../store/playerStore'
import { EntityType } from '../../engine/entities/types'

describe('worldStore', () => {
  beforeEach(() => {
    localStorage.clear()
    usePlayerStore.getState().resetPlayer()
    // Reset world by loading tutorial level 1
    const catalog = useWorldStore.getState().levelCatalog
    if (catalog.length > 0) {
      useWorldStore.getState().loadCatalogLevel(catalog[0].id)
    }
  })

  describe('placeEntity', () => {
    it('places a conveyor on an empty tile', () => {
      const id = useWorldStore.getState().placeEntity({ x: 10, y: 10 }, 'conveyor')
      expect(id).not.toBeNull()
      const entity = useWorldStore.getState().world.entities[id!]
      expect(entity).toBeDefined()
      expect(entity.type).toBe(EntityType.CONVEYOR)
    })

    it('rejects placement on an occupied tile', () => {
      useWorldStore.getState().placeEntity({ x: 20, y: 20 }, 'conveyor')
      const id2 = useWorldStore.getState().placeEntity({ x: 20, y: 20 }, 'conveyor')
      expect(id2).toBeNull()
    })
  })

  describe('removeEntityAt', () => {
    it('removes an entity from a tile', () => {
      useWorldStore.getState().placeEntity({ x: 15, y: 15 }, 'conveyor')
      useWorldStore.getState().removeEntityAt({ x: 15, y: 15 })
      expect(useWorldStore.getState().world.tileIndex['15,15']).toBeUndefined()
    })
  })

  describe('level management', () => {
    it('loadCatalogLevel loads tutorial level 1', () => {
      useWorldStore.getState().loadCatalogLevel('tutorial-1')
      const { currentLevelId, objectives } = useWorldStore.getState()
      expect(currentLevelId).toBe('tutorial-1')
      expect(objectives.length).toBeGreaterThan(0)
    })

    it('generateLevel creates a procedural level', () => {
      useWorldStore.getState().generateLevel(42, 1)
      const { currentLevelId, objectives } = useWorldStore.getState()
      expect(currentLevelId).toBe('procedural-42-1')
      expect(objectives.length).toBeGreaterThan(0)
    })

    it('resetSim resets objective progress', () => {
      useWorldStore.getState().loadCatalogLevel('tutorial-1')
      useWorldStore.getState().resetSim()
      const { objectives, levelComplete } = useWorldStore.getState()
      expect(objectives.every(o => !o.completed)).toBe(true)
      expect(levelComplete).toBe(false)
    })
  })

  describe('tickRate', () => {
    it('setTickRate clamps to valid range', () => {
      useWorldStore.getState().setTickRate(0)
      expect(useWorldStore.getState().tickRate).toBe(1)
      useWorldStore.getState().setTickRate(100)
      expect(useWorldStore.getState().tickRate).toBe(20)
    })
  })

  describe('export/import', () => {
    it('exportLevelJson returns valid JSON', () => {
      useWorldStore.getState().loadCatalogLevel('tutorial-1')
      const json = useWorldStore.getState().exportLevelJson()
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('importLevelJson rejects malformed JSON', () => {
      const result = useWorldStore.getState().importLevelJson('broken{')
      expect(result.success).toBe(false)
    })

    it('importLevelJson loads valid JSON', () => {
      useWorldStore.getState().loadCatalogLevel('tutorial-1')
      const json = useWorldStore.getState().exportLevelJson()
      useWorldStore.getState().loadCatalogLevel('tutorial-2')
      const result = useWorldStore.getState().importLevelJson(json)
      expect(result.success).toBe(true)
    })
  })
})
