// =============================================================================
// Toolbar.tsx — Tool-selection sidebar.
//
// Shows all entity tools (Extractor, Conveyor, Operators, Eraser).
// Locked operators are shown disabled with an XP requirement tooltip.
// Keyboard shortcuts 1–9 select tools in order.
// =============================================================================

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore, type ToolType } from '../store/uiStore'
import { usePlayerStore, OPERATOR_UNLOCK_XP } from '../store/playerStore'
import { useWorldStore } from '../store/worldStore'
import { OperatorType } from '../engine/entities/types'

// ---------------------------------------------------------------------------
// Tool list (ordered — index + 1 = keyboard shortcut key)
// ---------------------------------------------------------------------------

type ToolDef =
  | { type: 'extractor' | 'conveyor' | 'eraser'; label: string; shortcut: string }
  | { type: OperatorType; label: string; shortcut: string }

const BASIC_TOOLS: ToolDef[] = [
  { type: 'extractor', label: 'extractor', shortcut: '1' },
  { type: 'conveyor',  label: 'conveyor',  shortcut: '2' },
  { type: 'eraser',    label: 'eraser',    shortcut: '0' },
]

const OPERATOR_TOOLS: ToolDef[] = (Object.values(OperatorType) as OperatorType[]).map((op, i) => ({
  type:     op,
  label:    op,
  shortcut: String(i + 3),
}))

const ALL_TOOLS: ToolDef[] = [...BASIC_TOOLS, ...OPERATOR_TOOLS]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Toolbar() {
  const { t } = useTranslation()
  const selectedTool    = useUiStore(s => s.selectedTool)
  const selectTool      = useUiStore(s => s.selectTool)
  const unlockedOps     = usePlayerStore(s => s.unlockedOperators)
  const xp              = usePlayerStore(s => s.xp)
  const allowedTools    = useWorldStore(s => s.allowedTools)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      for (const tool of ALL_TOOLS) {
        if (e.key === tool.shortcut) {
          const t = tool.type as ToolType
          if (isLocked(t)) return
          selectTool(t)
          break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectTool, unlockedOps]) // eslint-disable-line react-hooks/exhaustive-deps

  function isLocked(tool: ToolType): boolean {
    // Eraser is always available
    if (tool === 'eraser') return false
    // If allowedTools is set, only listed tools (+ eraser) are available
    if (allowedTools !== null && !allowedTools.includes(tool)) return true
    if (tool === 'extractor' || tool === 'conveyor') return false
    return !unlockedOps.includes(tool as OperatorType)
  }

  function getTooltip(tool: ToolType): string {
    if (!isLocked(tool)) return t(`toolbar.tooltip.${tool}`)
    const needed = OPERATOR_UNLOCK_XP[tool as OperatorType]
    return t('toolbar.locked', { xp: needed })
  }

  return (
    <aside
      aria-label="Toolbar"
      className="absolute left-0 top-0 h-full w-16 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-2 gap-1 z-10 overflow-y-auto"
    >
      <span className="text-xs text-gray-500 uppercase tracking-widest mb-1 select-none">
        {t('toolbar.title')}
      </span>

      {/* Basic tools */}
      <div className="w-full flex flex-col items-center gap-1 pb-1 border-b border-gray-700">
        {BASIC_TOOLS.map(tool => (
          <ToolButton
            key={tool.type}
            tool={tool}
            selected={selectedTool === tool.type}
            locked={false}
            tooltip={getTooltip(tool.type)}
            label={t(`toolbar.tools.${tool.label}`)}
            onClick={() => selectTool(tool.type as ToolType)}
          />
        ))}
      </div>

      {/* Operator tools */}
      <div className="w-full flex flex-col items-center gap-1 pt-1">
        {OPERATOR_TOOLS.map(tool => {
          const locked = isLocked(tool.type)
          return (
            <ToolButton
              key={tool.type}
              tool={tool}
              selected={selectedTool === tool.type}
              locked={locked}
              tooltip={getTooltip(tool.type)}
              label={t(`toolbar.tools.${tool.label}`)}
              onClick={() => { if (!locked) selectTool(tool.type as ToolType) }}
            />
          )
        })}
      </div>

      {/* XP indicator at bottom */}
      <div className="mt-auto text-xs text-gray-500 text-center pb-1 select-none">
        {xp} XP
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// ToolButton
// ---------------------------------------------------------------------------

interface ToolButtonProps {
  tool:     ToolDef
  selected: boolean
  locked:   boolean
  tooltip:  string
  label:    string
  onClick:  () => void
}

function ToolButton({ tool, selected, locked, tooltip, label, onClick }: ToolButtonProps) {
  const icon  = getIcon(tool.type)
  const base  = 'relative w-11 h-11 rounded flex flex-col items-center justify-center text-xs font-mono transition-colors select-none'
  const state = locked
    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
    : selected
      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 cursor-pointer'

  return (
    <button
      title={tooltip}
      aria-label={label}
      aria-pressed={selected}
      disabled={locked}
      onClick={onClick}
      className={`${base} ${state}`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="text-[9px] mt-0.5 opacity-70">[{tool.shortcut}]</span>
      {locked && (
        <span className="absolute -top-0.5 -right-0.5 text-[8px] bg-yellow-600 text-yellow-100 rounded-full px-0.5">
          🔒
        </span>
      )}
    </button>
  )
}

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    extractor: '⬡',
    conveyor:  '→',
    eraser:    '✕',
    ADD:       '+',
    SUB:       '−',
    MUL:       '×',
    DIV:       '÷',
    POWER:     'xⁿ',
    MOD:       '%',
    GCD:       'G',
    SQUARE:    'x²',
    SQRT:      '√',
    FACTOR:    'P',
    IS_PRIME:  '?',
  }
  return icons[type] ?? type
}
