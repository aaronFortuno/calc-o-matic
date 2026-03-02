// =============================================================================
// CanvasRenderer.tsx — HTML5 Canvas rendering of the game world.
//
// Renders on every animation frame (rAF loop).  All game entities, tokens, and
// grid lines are drawn directly to a <canvas>.  React overlays (Toolbar, HUD,
// etc.) sit above this element in the DOM via absolute positioning.
//
// Responsibilities:
//   - Grid lines (chunked, culled)
//   - Entities (extractor, conveyor, operator, receiver)
//   - Tokens (numeric bubbles)
//   - Pan (mouse drag, touch), zoom (wheel), click-to-place, right-click rotate
// =============================================================================

import { useEffect, useRef, useCallback } from 'react'
import { useWorldStore } from '../store/worldStore'
import { useUiStore }    from '../store/uiStore'
import {
  TILE_SIZE,
  PAN_STEP,
  getVisibleChunks,
  chunkTopLeft,
  tileToPixel,
  pixelToTile,
} from '../engine/grid'
import { EntityType, ConveyorDirection } from '../engine/entities/types'
import type {
  WorldState,
  Viewport,
  Entity,
  Token,
  ExtractorData,
  ConveyorData,
  OperatorData,
  ReceiverData,
} from '../engine/entities/types'

// ---------------------------------------------------------------------------
// Colour palette
// ---------------------------------------------------------------------------

const COLORS = {
  background:   '#111827',
  gridLine:     '#1f2937',
  gridLineMajor:'#374151',
  extractor:    '#10b981',
  extractorBg:  '#064e3b',
  conveyor:     '#6b7280',
  conveyorArrow:'#d1d5db',
  operator:     '#6366f1',
  operatorBg:   '#1e1b4b',
  operatorText: '#c7d2fe',
  receiver:     '#f59e0b',
  receiverBg:   '#451a03',
  receiverDone: '#22c55e',
  token:        '#fbbf24',
  tokenText:    '#1f2937',
  highlight:    'rgba(99,102,241,0.3)',
  completedBg:  '#14532d',
}

// ---------------------------------------------------------------------------
// Draw helpers
// ---------------------------------------------------------------------------

const ARROW_DELTA: Record<ConveyorDirection, [number, number]> = {
  [ConveyorDirection.RIGHT]: [1, 0],
  [ConveyorDirection.LEFT]:  [-1, 0],
  [ConveyorDirection.DOWN]:  [0, 1],
  [ConveyorDirection.UP]:    [0, -1],
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawEntity(
  ctx:      CanvasRenderingContext2D,
  entity:   Entity,
  viewport: Viewport,
  world:    WorldState,
) {
  const px   = tileToPixel(entity.position, viewport)
  const ts   = TILE_SIZE * viewport.zoom
  const pad  = ts * 0.08
  const x    = px.x + pad
  const y    = px.y + pad
  const w    = ts - pad * 2
  const h    = ts - pad * 2
  const r    = ts * 0.12

  switch (entity.type) {
    case EntityType.EXTRACTOR: {
      const d = entity.data as ExtractorData
      ctx.fillStyle = COLORS.extractorBg
      drawRoundedRect(ctx, x, y, w, h, r)
      ctx.fill()
      ctx.strokeStyle = COLORS.extractor
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = COLORS.extractor
      ctx.font = `bold ${Math.max(10, ts * 0.28)}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(d.value), px.x + ts / 2, px.y + ts / 2)
      break
    }

    case EntityType.CONVEYOR: {
      const d     = entity.data as ConveyorData
      const [adx, ady] = ARROW_DELTA[d.direction]
      ctx.fillStyle = COLORS.conveyor
      ctx.globalAlpha = 0.4
      drawRoundedRect(ctx, x, y, w, h, r * 0.5)
      ctx.fill()
      ctx.globalAlpha = 1

      // Arrow
      const cx  = px.x + ts / 2
      const cy  = px.y + ts / 2
      const len = ts * 0.3
      const hw  = ts * 0.12   // half-width of arrowhead
      const tip = { x: cx + adx * len, y: cy + ady * len }
      const tail = { x: cx - adx * len, y: cy - ady * len }

      ctx.beginPath()
      ctx.moveTo(tail.x, tail.y)
      ctx.lineTo(tip.x, tip.y)
      ctx.strokeStyle = COLORS.conveyorArrow
      ctx.lineWidth = Math.max(1.5, ts * 0.06)
      ctx.lineCap = 'round'
      ctx.stroke()

      // Arrowhead
      const perpX = -ady * hw
      const perpY = adx * hw
      ctx.beginPath()
      ctx.moveTo(tip.x, tip.y)
      ctx.lineTo(tip.x - adx * hw * 1.4 + perpX, tip.y - ady * hw * 1.4 + perpY)
      ctx.lineTo(tip.x - adx * hw * 1.4 - perpX, tip.y - ady * hw * 1.4 - perpY)
      ctx.closePath()
      ctx.fillStyle = COLORS.conveyorArrow
      ctx.fill()
      break
    }

    case EntityType.OPERATOR: {
      const d = entity.data as OperatorData
      ctx.fillStyle = COLORS.operatorBg
      drawRoundedRect(ctx, x, y, w, h, r)
      ctx.fill()
      ctx.strokeStyle = COLORS.operator
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = COLORS.operatorText
      ctx.font = `bold ${Math.max(9, ts * 0.22)}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(opLabel(d.type), px.x + ts / 2, px.y + ts / 2)

      // Processing indicator
      if (d.ticksRemaining > 0) {
        ctx.strokeStyle = '#818cf8'
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
        drawRoundedRect(ctx, x - 2, y - 2, w + 4, h + 4, r + 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
      break
    }

    case EntityType.RECEIVER: {
      const d = entity.data as ReceiverData
      // Check objective progress from world
      const obj = world.objectives.find(o => {
        const eid = world.tileIndex[`${entity.position.x},${entity.position.y}`]
        return o.receiverId === eid
      })
      const done = obj?.completed ?? d.completed

      ctx.fillStyle = done ? COLORS.completedBg : COLORS.receiverBg
      drawRoundedRect(ctx, x, y, w, h, r)
      ctx.fill()
      ctx.strokeStyle = done ? COLORS.receiverDone : COLORS.receiver
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = done ? COLORS.receiverDone : COLORS.receiver
      ctx.font = `bold ${Math.max(9, ts * 0.22)}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`=${d.expected}`, px.x + ts / 2, px.y + ts / 2 - ts * 0.1)

      ctx.font = `${Math.max(8, ts * 0.18)}px monospace`
      ctx.fillText(
        `${d.deliveredCount}/${d.required}`,
        px.x + ts / 2,
        px.y + ts / 2 + ts * 0.18,
      )
      break
    }
  }
}

function drawToken(
  ctx:      CanvasRenderingContext2D,
  token:    Token,
  viewport: Viewport,
) {
  const px  = tileToPixel(token.position, viewport)
  const ts  = TILE_SIZE * viewport.zoom
  const cx  = px.x + ts / 2
  const cy  = px.y + ts / 2
  const r   = ts * 0.22

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = COLORS.token
  ctx.fill()

  ctx.fillStyle = COLORS.tokenText
  ctx.font = `bold ${Math.max(8, ts * 0.2)}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(token.value), cx, cy)
}

function opLabel(type: string): string {
  const labels: Record<string, string> = {
    ADD: '+', SUB: '−', MUL: '×', DIV: '÷',
    POWER: 'xⁿ', MOD: '%', GCD: 'gcd',
    SQUARE: 'x²', SQRT: '√', FACTOR: 'P', IS_PRIME: '?',
  }
  return labels[type] ?? type
}

// ---------------------------------------------------------------------------
// CanvasRenderer component
// ---------------------------------------------------------------------------

export function CanvasRenderer() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number>(0)
  const dragRef    = useRef<{ startX: number; startY: number; lastOffX: number; lastOffY: number } | null>(null)

  const world    = useWorldStore(s => s.world)
  const viewport = useWorldStore(s => s.viewport)
  const doPan    = useWorldStore(s => s.panViewport)
  const doZoom   = useWorldStore(s => s.zoomViewport)
  const placeEntity   = useWorldStore(s => s.placeEntity)
  const removeEntity  = useWorldStore(s => s.removeEntityAt)
  const rotateEntity  = useWorldStore(s => s.rotateEntityAt)
  const selectedTool  = useUiStore(s => s.selectedTool)

  // Refs so event handlers always see latest values without re-subscribing
  const worldRef    = useRef(world)
  const viewportRef = useRef(viewport)
  const toolRef     = useRef(selectedTool)
  useEffect(() => { worldRef.current    = world    }, [world])
  useEffect(() => { viewportRef.current = viewport }, [viewport])
  useEffect(() => { toolRef.current     = selectedTool }, [selectedTool])

  // -------------------------------------------------------------------------
  // Render loop
  // -------------------------------------------------------------------------

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { offsetX, offsetY, zoom } = viewportRef.current
    const w = canvas.width
    const h = canvas.height
    const ts = TILE_SIZE * zoom

    ctx.clearRect(0, 0, w, h)

    // Background
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, w, h)

    // Grid lines (minor every tile, major every 8 tiles)
    ctx.lineWidth = 0.5
    const startTileX = Math.floor(-offsetX / ts) - 1
    const startTileY = Math.floor(-offsetY / ts) - 1
    const endTileX   = startTileX + Math.ceil(w / ts) + 2
    const endTileY   = startTileY + Math.ceil(h / ts) + 2

    for (let tx = startTileX; tx <= endTileX; tx++) {
      const px = tx * ts + offsetX
      ctx.strokeStyle = tx % 8 === 0 ? COLORS.gridLineMajor : COLORS.gridLine
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, h)
      ctx.stroke()
    }
    for (let ty = startTileY; ty <= endTileY; ty++) {
      const py = ty * ts + offsetY
      ctx.strokeStyle = ty % 8 === 0 ? COLORS.gridLineMajor : COLORS.gridLine
      ctx.beginPath()
      ctx.moveTo(0, py)
      ctx.lineTo(w, py)
      ctx.stroke()
    }

    // Entities (chunked: only visible)
    const chunks = getVisibleChunks(viewportRef.current, w, h)
    const vWorld = worldRef.current

    for (const chunk of chunks) {
      const tl = chunkTopLeft(chunk)
      for (let dy = 0; dy < 16; dy++) {
        for (let dx = 0; dx < 16; dx++) {
          const key = `${tl.x + dx},${tl.y + dy}`
          const eid = vWorld.tileIndex[key]
          if (eid) {
            drawEntity(ctx, vWorld.entities[eid], viewportRef.current, vWorld)
          }
        }
      }
    }

    // Tokens
    for (const token of Object.values(vWorld.tokens)) {
      drawToken(ctx, token, viewportRef.current)
    }
  }, [])

  useEffect(() => {
    const loop = () => {
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  // Trigger redraw whenever world or viewport changes
  useEffect(() => { /* world/viewport refs updated above; rAF loop will pick it up */ }, [world, viewport])

  // -------------------------------------------------------------------------
  // Canvas resize
  // -------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // -------------------------------------------------------------------------
  // Mouse / keyboard interaction
  // -------------------------------------------------------------------------

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const px   = e.clientX - rect.left
    const py   = e.clientY - rect.top

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle mouse / alt+click = start pan
      dragRef.current = {
        startX: e.clientX, startY: e.clientY,
        lastOffX: viewportRef.current.offsetX,
        lastOffY: viewportRef.current.offsetY,
      }
      e.preventDefault()
      return
    }

    if (e.button === 2) {
      // Right-click = rotate conveyor
      const tile = pixelToTile(px, py, viewportRef.current)
      rotateEntity(tile)
      return
    }

    if (e.button === 0) {
      const tool = toolRef.current
      if (tool === 'eraser') {
        const tile = pixelToTile(px, py, viewportRef.current)
        removeEntity(tile)
      } else {
        const tile = pixelToTile(px, py, viewportRef.current)
        placeEntity(tile, tool)
      }
    }
  }, [placeEntity, removeEntity, rotateEntity])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    // Update via store (triggers re-render which updates ref)
    doPan(
      dragRef.current.lastOffX - viewportRef.current.offsetX + dx,
      dragRef.current.lastOffY - viewportRef.current.offsetY + dy,
    )
  }, [doPan])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect   = canvas.getBoundingClientRect()
    const focalX = e.clientX - rect.left
    const focalY = e.clientY - rect.top
    const delta  = e.deltaY < 0 ? 0.1 : -0.1
    doZoom(delta, focalX, focalY)
  }, [doZoom])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  // -------------------------------------------------------------------------
  // Keyboard (global)
  // -------------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if focus is in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'ArrowRight': doPan(-PAN_STEP, 0);  break
        case 'ArrowLeft':  doPan(PAN_STEP,  0);  break
        case 'ArrowDown':  doPan(0, -PAN_STEP);  break
        case 'ArrowUp':    doPan(0,  PAN_STEP);  break
        case '+':
        case '=':          doZoom(0.1,  window.innerWidth / 2, window.innerHeight / 2); break
        case '-':          doZoom(-0.1, window.innerWidth / 2, window.innerHeight / 2); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doPan, doZoom])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      style={{ cursor: dragRef.current ? 'grabbing' : 'crosshair' }}
    />
  )
}
