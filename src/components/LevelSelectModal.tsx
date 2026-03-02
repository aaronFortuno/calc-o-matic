// =============================================================================
// LevelSelectModal.tsx — Full-screen overlay for selecting tutorial or
// procedural levels.
// =============================================================================

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore }     from '../store/uiStore'
import { useWorldStore }  from '../store/worldStore'
import { usePlayerStore } from '../store/playerStore'

export function LevelSelectModal() {
  const { t } = useTranslation()
  const open            = useUiStore(s => s.levelSelectOpen)
  const close           = useUiStore(s => s.closeLevelSelect)
  const levelCatalog    = useWorldStore(s => s.levelCatalog)
  const loadCatalogLevel = useWorldStore(s => s.loadCatalogLevel)
  const generateLevel   = useWorldStore(s => s.generateLevel)
  const completedLevels = usePlayerStore(s => s.completedLevels)

  const [seed, setSeed]       = useState(1)
  const [difficulty, setDiff] = useState(1)

  if (!open) return null

  const tutorials = levelCatalog.filter(l => l.isTutorial)
  const allTutorialsDone = tutorials.every(l => completedLevels.includes(l.id))

  function handleSelect(levelId: string) {
    loadCatalogLevel(levelId)
    close()
  }

  function handleGenerate() {
    generateLevel(seed, difficulty)
    close()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={close}
    >
      <div
        className="bg-gray-900 border border-gray-600 rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-indigo-300 mb-4">
          {t('levelSelect.title')}
        </h2>

        {/* Tutorial levels */}
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {t('levelSelect.tutorials')}
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {tutorials.map(level => {
            const done = completedLevels.includes(level.id)
            return (
              <button
                key={level.id}
                onClick={() => handleSelect(level.id)}
                className={`text-left p-3 rounded-lg border transition-colors
                  ${done
                    ? 'border-green-600 bg-green-900/30 hover:bg-green-900/50'
                    : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  {done && <span className="text-green-400">&#10003;</span>}
                  <span className={`text-sm font-medium ${done ? 'text-green-300' : 'text-gray-200'}`}>
                    {t(level.name)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{t(level.description)}</p>
              </button>
            )
          })}
        </div>

        {/* Procedural section */}
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {t('levelSelect.procedural')}
        </h3>
        {allTutorialsDone ? (
          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('admin.seed')}</label>
              <input
                type="number"
                value={seed}
                onChange={e => setSeed(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('admin.difficulty')}</label>
              <input
                type="number"
                min={0}
                max={4}
                value={difficulty}
                onChange={e => setDiff(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200"
              />
            </div>
            <button
              onClick={handleGenerate}
              className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
            >
              {t('levelSelect.generate')}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            {t('levelSelect.proceduralLocked')}
          </p>
        )}

        {/* Close button */}
        <div className="mt-6 text-center">
          <button
            onClick={close}
            className="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
