import { describe, it, expect } from 'vitest'
import {
  tileKey,
  parseTileKey,
  tileToChunk,
  chunkTopLeft,
  tileToPixel,
  pixelToTile,
  getVisibleChunks,
  clampZoom,
  createViewport,
  panViewport,
  zoomViewport,
  TILE_SIZE,
  CHUNK_SIZE,
  MIN_ZOOM,
  MAX_ZOOM,
  PAN_STEP,
} from '../../engine/grid'

describe('tileKey / parseTileKey', () => {
  it('encodes and decodes a tile coordinate', () => {
    expect(tileKey({ x: 3, y: -2 })).toBe('3,-2')
    expect(parseTileKey('3,-2')).toEqual({ x: 3, y: -2 })
  })
})

describe('tileToChunk', () => {
  it('maps (0,0) to chunk (0,0)', () => {
    expect(tileToChunk({ x: 0, y: 0 })).toEqual({ cx: 0, cy: 0 })
  })
  it('maps (15,15) to chunk (0,0)', () => {
    expect(tileToChunk({ x: 15, y: 15 })).toEqual({ cx: 0, cy: 0 })
  })
  it('maps (16,0) to chunk (1,0)', () => {
    expect(tileToChunk({ x: 16, y: 0 })).toEqual({ cx: 1, cy: 0 })
  })
  it('handles negative coordinates', () => {
    expect(tileToChunk({ x: -1, y: 0 })).toEqual({ cx: -1, cy: 0 })
  })
})

describe('chunkTopLeft', () => {
  it('returns top-left tile of chunk (0,0)', () => {
    expect(chunkTopLeft({ cx: 0, cy: 0 })).toEqual({ x: 0, y: 0 })
  })
  it('returns top-left tile of chunk (1,2)', () => {
    expect(chunkTopLeft({ cx: 1, cy: 2 })).toEqual({
      x: 1 * CHUNK_SIZE,
      y: 2 * CHUNK_SIZE,
    })
  })
})

describe('tileToPixel / pixelToTile', () => {
  it('converts tile to pixel at default viewport', () => {
    const vp = createViewport()
    expect(tileToPixel({ x: 1, y: 0 }, vp)).toEqual({ x: TILE_SIZE, y: 0 })
  })

  it('converts pixel back to tile at default viewport', () => {
    const vp = createViewport()
    expect(pixelToTile(TILE_SIZE, 0, vp)).toEqual({ x: 1, y: 0 })
  })

  it('accounts for zoom', () => {
    const vp = { offsetX: 0, offsetY: 0, zoom: 2 }
    const px = tileToPixel({ x: 1, y: 0 }, vp)
    expect(px.x).toBe(TILE_SIZE * 2)
  })
})

describe('getVisibleChunks', () => {
  it('returns chunks overlapping visible area', () => {
    const vp = createViewport()
    const chunks = getVisibleChunks(vp, 1920, 1080)
    expect(chunks.length).toBeGreaterThan(0)
    // All returned chunks should have valid coordinates
    for (const c of chunks) {
      expect(typeof c.cx).toBe('number')
      expect(typeof c.cy).toBe('number')
    }
  })

  it('limits chunks for default viewport at zoom 1', () => {
    const vp = createViewport()
    const chunks = getVisibleChunks(vp, 1920, 1080)
    const maxChunks =
      (Math.ceil(1920 / (TILE_SIZE * CHUNK_SIZE)) + 1) *
      (Math.ceil(1080 / (TILE_SIZE * CHUNK_SIZE)) + 1)
    expect(chunks.length).toBeLessThanOrEqual(maxChunks)
  })
})

describe('clampZoom', () => {
  it('clamps below minimum', () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM)
  })
  it('clamps above maximum', () => {
    expect(clampZoom(100)).toBe(MAX_ZOOM)
  })
  it('passes through valid zoom', () => {
    expect(clampZoom(1.5)).toBe(1.5)
  })
  it('rejects zero zoom', () => {
    expect(clampZoom(0)).toBe(MIN_ZOOM)
  })
  it('rejects negative zoom', () => {
    expect(clampZoom(-1)).toBe(MIN_ZOOM)
  })
})

describe('panViewport', () => {
  it('pans right increases offsetX', () => {
    const vp = createViewport()
    const panned = panViewport(vp, PAN_STEP, 0)
    expect(panned.offsetX).toBe(PAN_STEP)
    expect(panned.offsetY).toBe(0)
  })

  it('double pan accumulates', () => {
    const vp = createViewport()
    const p1 = panViewport(vp, PAN_STEP, 0)
    const p2 = panViewport(p1, PAN_STEP, 0)
    expect(p2.offsetX).toBe(PAN_STEP * 2)
  })
})

describe('zoomViewport', () => {
  it('zooming in increases zoom', () => {
    const vp = createViewport()
    const zoomed = zoomViewport(vp, 0.1, 0, 0)
    expect(zoomed.zoom).toBeGreaterThan(1.0)
  })

  it('zooming out decreases zoom', () => {
    const vp = createViewport()
    const zoomed = zoomViewport(vp, -0.1, 0, 0)
    expect(zoomed.zoom).toBeLessThan(1.0)
  })

  it('zoom is clamped to range', () => {
    const vp = createViewport()
    const zoomed = zoomViewport(vp, 100, 0, 0)
    expect(zoomed.zoom).toBeLessThanOrEqual(MAX_ZOOM)
  })
})
