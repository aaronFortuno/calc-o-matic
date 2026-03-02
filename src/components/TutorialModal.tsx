// =============================================================================
// TutorialModal.tsx — First-run tutorial overlay.
//
// Shows automatically unless localStorage has "calc-o-matic:tutorialSeen".
// Three steps; Skip / Next / Finish controls.
// =============================================================================

import { useTranslation } from 'react-i18next'
import { useUiStore, TUTORIAL_STEPS } from '../store/uiStore'

export function TutorialModal() {
  const { t }         = useTranslation()
  const visible       = useUiStore(s => s.tutorialVisible)
  const step          = useUiStore(s => s.tutorialStep)
  const nextStep      = useUiStore(s => s.nextTutorialStep)
  const skipTutorial  = useUiStore(s => s.skipTutorial)

  if (!visible) return null

  const isLast = step === TUTORIAL_STEPS - 1

  const stepKeys = ['step1', 'step2', 'step3'] as const

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40" onClick={skipTutorial}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(`tutorial.${stepKeys[step]}.title`)}
        className="bg-gray-900 border border-indigo-700 rounded-2xl p-8 w-[400px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Step indicator */}
        <div className="flex gap-2 justify-center mb-6">
          {Array.from({ length: TUTORIAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-indigo-500' : 'bg-gray-600'}`}
            />
          ))}
        </div>

        {/* Content */}
        <h2 className="text-white font-bold text-xl mb-3">
          {t(`tutorial.${stepKeys[step]}.title`)}
        </h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-8">
          {t(`tutorial.${stepKeys[step]}.body`)}
        </p>

        {/* Controls */}
        <div className="flex justify-between items-center">
          <button
            onClick={skipTutorial}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            {t('tutorial.skip')}
          </button>

          <button
            onClick={nextStep}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg px-6 py-2 text-sm"
          >
            {isLast ? t('tutorial.finish') : t('tutorial.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
