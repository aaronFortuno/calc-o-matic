// =============================================================================
// HUD.tsx — Heads-Up Display: objectives, XP bar, simulation controls.
// Positioned at the top of the screen, above the canvas.
// =============================================================================

import { useTranslation } from 'react-i18next'
import { useWorldStore }  from '../store/worldStore'
import { usePlayerStore } from '../store/playerStore'

export function HUD() {
  const { t } = useTranslation()
  const objectives       = useWorldStore(s => s.objectives)
  const tickCount        = useWorldStore(s => s.world.tickCount)
  const tickRate         = useWorldStore(s => s.tickRate)
  const running          = useWorldStore(s => s.running)
  const startSim         = useWorldStore(s => s.startSim)
  const stopSim          = useWorldStore(s => s.stopSim)
  const resetSim         = useWorldStore(s => s.resetSim)
  const setTickRate      = useWorldStore(s => s.setTickRate)
  const currentLevelName = useWorldStore(s => s.currentLevelName)
  const seed             = useWorldStore(s => s.seed)
  const difficulty       = useWorldStore(s => s.difficulty)

  const xp    = usePlayerStore(s => s.xp)
  const level = usePlayerStore(s => s.level)

  const nextLevelXp = level * 100
  const xpInLevel   = xp % 100
  const xpPct       = Math.min(100, (xpInLevel / 100) * 100)

  return (
    <header className="absolute top-0 left-16 right-0 h-14 bg-gray-900 border-b border-gray-700 flex items-center px-4 gap-4 z-10">

      {/* Level name */}
      <div className="flex-shrink-0 text-sm font-semibold text-indigo-300 whitespace-nowrap border-r border-gray-700 pr-3">
        {currentLevelName
          ? (currentLevelName === 'levels.procedural'
              ? t(currentLevelName, { seed, difficulty })
              : t(currentLevelName))
          : t('levels.noLevel')}
      </div>

      {/* Objectives */}
      <div className="flex gap-3 flex-1 overflow-x-auto">
        {objectives.length === 0 ? (
          <span className="text-gray-500 text-sm italic">No objectives</span>
        ) : (
          objectives.map(obj => (
            <div
              key={obj.id}
              className={`flex items-center gap-2 text-sm px-2 py-1 rounded whitespace-nowrap
                ${obj.completed
                  ? 'bg-green-900 text-green-300 ring-1 ring-green-600'
                  : 'bg-gray-800 text-gray-200'}`}
            >
              {obj.completed && <span>✓</span>}
              <span>{obj.description}</span>
              {!obj.completed && (
                <span className="text-xs text-gray-400 font-mono ml-1">
                  {/* delivered count shown inside receiver on canvas */}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Simulation controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-500 font-mono">{t('hud.ticks', { count: tickCount })}</span>

        {/* Tick speed knob */}
        <div className="flex items-center gap-1">
          <button
            aria-label="Decrease tick speed"
            onClick={() => setTickRate(tickRate - 1)}
            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
          >−</button>
          <span className="text-xs text-gray-300 w-16 text-center font-mono">
            {t('hud.tickSpeed', { speed: tickRate })}
          </span>
          <button
            aria-label="Increase tick speed"
            onClick={() => setTickRate(tickRate + 1)}
            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
          >+</button>
        </div>

        {/* Start / Pause */}
        <button
          aria-label={running ? t('simulation.pause') : t('simulation.start')}
          onClick={() => running ? stopSim() : startSim()}
          className={`px-3 py-1 rounded text-sm font-semibold transition-colors
            ${running
              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
        >
          {running ? t('simulation.pause') : t('simulation.start')}
        </button>

        {/* Reset */}
        <button
          aria-label={t('simulation.reset')}
          onClick={resetSim}
          className="px-3 py-1 rounded text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200"
        >
          {t('simulation.reset')}
        </button>
      </div>

      {/* XP / Level */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          <div className="text-xs text-gray-400">{t('hud.level', { level })}</div>
          <div className="text-xs text-indigo-400 font-mono">{t('hud.xp', { xp })}</div>
        </div>
        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden" title={`${xpInLevel} / ${nextLevelXp} XP to next level`}>
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

    </header>
  )
}
