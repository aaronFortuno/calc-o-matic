// =============================================================================
// i18n/index.ts — i18next initialisation.
//
// Import this module once before rendering (in main.tsx) via:
//   import './i18n'
//
// All React components consume translations via the useTranslation() hook.
// =============================================================================

import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'

void i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    lng:          'en',
    fallbackLng:  'en',
    interpolation: {
      escapeValue: false, // React already escapes output
    },
    // Prevent missing key warnings from polluting the console in production
    saveMissing: false,
  })

export default i18next
