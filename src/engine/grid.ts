// =============================================================================
// grid.ts — Tile coordinates, chunk math, viewport helpers.
// All functions are pure (no side-effects, no React imports).
// =============================================================================

import type { TileCoord, ChunkCoord, Viewport } from './entities/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TILE_SIZE  = 48    // pixels per tile at zoom 1.0
export const CHUNK_SIZE = 16    // tiles per chunk edge (16×16 = 256 tiles/chunk)
export const MIN_ZOOM   = 0.25
export const MAX_ZOOM   = 4.0
export const PAN_STEP   = 96    // pixels moved per keyboard arrow-key press

// ---------------------------------------------------------------------------
// Tile key helpers — used as object-property keys throughout the engine
// ---------------------------------------------------------------------------

/** Encode a tile coordinate to a string key, e.g. "3,-2". */
export function tileKey(tile: TileCoord): string {
  return `${tile.x},${tile.y}`
}

/** Decode a string key back to a TileCoord. */
export function parseTileKey(key: string): TileCoord {
  const [x, y] = key.split(',').map(Number)
  return { x, y }
}

// ---------------------------------------------------------------------------
// Chunk math
// ---------------------------------------------------------------------------

/** Map a tile to its containing chunk (works for negative coords). */
export function tileToChunk(tile: TileCoord): ChunkCoord {
  return {
    cx: Math.floor(tile.x / CHUNK_SIZE),
    cy: Math.floor(tile.y / CHUNK_SIZE),
  }
}

/** Return the top-left tile of a chunk. */
export function chunkTopLeft(chunk: ChunkCoord): TileCoord {
  return {
    x: chunk.cx * CHUNK_SIZE,
    y: chunk.cy * CHUNK_SIZE,
  }
}

// ---------------------------------------------------------------------------
// Coordinate conversions
// ---------------------------------------------------------------------------

/** Convert a tile coordinate to canvas-space pixels given a viewport. */
export function tileToPixel(
  tile: TileCoord,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: tile.x * TILE_SIZE * viewport.zoom + viewport.offsetX,
    y: tile.y * TILE_SIZE * viewport.zoom + viewport.offsetY,
  }
}

/** Convert a canvas-space pixel to the tile it falls on. */
export function pixelToTile(
  px: number,
  py: number,
  viewport: Viewport,
): TileCoord {
  const tileW = TILE_SIZE * viewport.zoom
  return {
    x: Math.floor((px - viewport.offsetX) / tileW),
    y: Math.floor((py - viewport.offsetY) / tileW),
  }
}

/** Pixel rect (canvas-space) of a chunk — used to cull invisible chunks. */
export function chunkToPixelRect(
  chunk: ChunkCoord,
  viewport: Viewport,
): { x: number; y: number; w: number; h: number } {
  const tl   = tileToPixel(chunkTopLeft(chunk), viewport)
  const size = CHUNK_SIZE * TILE_SIZE * viewport.zoom
  return { x: tl.x, y: tl.y, w: size, h: size }
}

// ---------------------------------------------------------------------------
// Visibility culling
// ---------------------------------------------------------------------------

/**
 * Return every ChunkCoord that overlaps the visible canvas area.
 * Used by CanvasRenderer to skip drawing off-screen chunks.
 */
export function getVisibleChunks(
  viewport:     Viewport,
  canvasWidth:  number,
  canvasHeight: number,
): ChunkCoord[] {
  const tl    = pixelToTile(0, 0, viewport)
  const br    = pixelToTile(canvasWidth, canvasHeight, viewport)
  const cxMin = Math.floor(tl.x / CHUNK_SIZE)
  const cyMin = Math.floor(tl.y / CHUNK_SIZE)
  const cxMax = Math.floor(br.x / CHUNK_SIZE)
  const cyMax = Math.floor(br.y / CHUNK_SIZE)

  const chunks: ChunkCoord[] = []
  for (let cx = cxMin; cx <= cxMax; cx++) {
    for (let cy = cyMin; cy <= cyMax; cy++) {
      chunks.push({ cx, cy })
    }
  }
  return chunks
}

// ---------------------------------------------------------------------------
// Viewport helpers
// ---------------------------------------------------------------------------

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
}

export function createViewport(): Viewport {
  return { offsetX: 0, offsetY: 0, zoom: 1.0 }
}

/**
 * Compute a viewport that centers a set of tile positions on screen.
 * Falls back to default viewport if no positions are given.
 */
export function centerViewportOnEntities(
  positions: { x: number; y: number }[],
  canvasWidth: number,
  canvasHeight: number,
  zoom: number = 1.0,
): Viewport {
  if (positions.length === 0) {
    return { offsetX: canvasWidth / 2, offsetY: canvasHeight / 2, zoom }
  }

  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  for (const p of positions) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }

  // Center of the bounding box in tile-space (+1 for tile width)
  const centerTileX = (minX + maxX + 1) / 2
  const centerTileY = (minY + maxY + 1) / 2
  const ts = TILE_SIZE * zoom

  return {
    zoom,
    offsetX: canvasWidth / 2 - centerTileX * ts,
    offsetY: canvasHeight / 2 - centerTileY * ts,
  }
}

export function panViewport(
  viewport: Viewport,
  dx: number,
  dy: number,
): Viewport {
  return { ...viewport, offsetX: viewport.offsetX + dx, offsetY: viewport.offsetY + dy }
}

/**
 * Zoom toward a focal point (e.g. mouse cursor position in canvas-space).
 * @param delta  Multiplicative factor — positive zooms in, negative zooms out.
 *               Use small values like ±0.1 per scroll step.
 */
export function zoomViewport(
  viewport: Viewport,
  delta:    number,
  focalX:   number,
  focalY:   number,
): Viewport {
  const newZoom  = clampZoom(viewport.zoom * (1 + delta))
  const ratio    = newZoom / viewport.zoom
  const offsetX  = focalX - (focalX - viewport.offsetX) * ratio
  const offsetY  = focalY - (focalY - viewport.offsetY) * ratio
  return { zoom: newZoom, offsetX, offsetY }
}
