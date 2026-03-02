// =============================================================================
// LevelCompleteModal.tsx — Shown when all objectives are completed.
// Offers Next Level, Replay, and Continue options.
// =============================================================================

import { useTranslation } from 'react-i18next'
import { useWorldStore }  from '../store/worldStore'
import { useUiStore }     from '../store/uiStore'
import { XP_PER_OBJECTIVE } from '../store/playerStore'

export function LevelCompleteModal() {
  const { t }        = useTranslation()
  const levelComplete = useWorldStore(s => s.levelComplete)
  const objectives    = useWorldStore(s => s.objectives)
  const nextLevel     = useWorldStore(s => s.nextLevel)
  const resetSim      = useWorldStore(s => s.resetSim)
  const dismiss       = useWorldStore(s => s.dismissLevelComplete)
  const openLevelSelect = useUiStore(s => s.openLevelSelect)

  if (!levelComplete) return null

  const xpEarned = objectives.length * XP_PER_OBJECTIVE

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={dismiss}
    >
      <div
        className="bg-gray-900 border border-gray-600 rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-green-400 mb-2">
          {t('levelComplete.title')}
        </h2>

        <p className="text-indigo-300 text-lg font-semibold mb-6">
          {t('levelComplete.xpAwarded', { xp: xpEarned })}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={nextLevel}
            className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            {t('levelComplete.nextLevel')}
          </button>

          <button
            onClick={resetSim}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold transition-colors"
          >
            {t('levelComplete.replay')}
          </button>

          <button
            onClick={() => { dismiss(); openLevelSelect() }}
            className="w-full px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm transition-colors"
          >
            {t('levelComplete.backToMenu')}
          </button>
        </div>
      </div>
    </div>
  )
}
