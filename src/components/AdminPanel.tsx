// =============================================================================
// AdminPanel.tsx — Passphrase-gated admin/config panel.
//
// Accessible via the gear icon (bottom-right) or /#admin URL hash.
// Features: generate level, set tick speed, export/import JSON, save slots.
// =============================================================================

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorldStore }  from '../store/worldStore'
import { useUiStore }     from '../store/uiStore'
import { listSaveSlots, SAVE_SLOT_COUNT } from '../engine/procedural/serializer'
import type { SaveSlotMeta } from '../engine/procedural/serializer'

export function AdminPanel() {
  const { t } = useTranslation()
  const adminOpen  = useUiStore(s => s.adminOpen)
  const openAdmin  = useUiStore(s => s.openAdmin)
  const closeAdmin = useUiStore(s => s.closeAdmin)

  const adminPass      = useWorldStore(s => s.adminPass)
  const seed           = useWorldStore(s => s.seed)
  const difficulty     = useWorldStore(s => s.difficulty)
  const tickRate       = useWorldStore(s => s.tickRate)
  const generateLevel  = useWorldStore(s => s.generateLevel)
  const importJson     = useWorldStore(s => s.importLevelJson)
  const exportJson     = useWorldStore(s => s.exportLevelJson)
  const setTickRate    = useWorldStore(s => s.setTickRate)
  const saveToSlot     = useWorldStore(s => s.saveToSlot)
  const loadFromSlot   = useWorldStore(s => s.loadFromSlot)
  const clearSlot      = useWorldStore(s => s.clearSlot)

  const [passInput,    setPassInput]    = useState('')
  const [passOk,       setPassOk]       = useState(false)
  const [passError,    setPassError]    = useState(false)
  const [seedInput,    setSeedInput]    = useState(String(seed))
  const [diffInput,    setDiffInput]    = useState(String(difficulty))
  const [importText,   setImportText]   = useState('')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [slots,        setSlots]        = useState<Array<SaveSlotMeta | null>>([])

  const importRef = useRef<HTMLTextAreaElement>(null)

  // Refresh slot metadata when panel opens
  useEffect(() => {
    if (adminOpen && passOk) {
      setSlots(listSaveSlots())
    }
  }, [adminOpen, passOk])

  // Open via /#admin URL hash
  useEffect(() => {
    if (window.location.hash === '#admin') openAdmin()
  }, [openAdmin])

  // Keyboard shortcut: Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && adminOpen) closeAdmin()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [adminOpen, closeAdmin])

  if (!adminOpen) {
    return (
      <button
        aria-label="Open admin panel"
        onClick={openAdmin}
        className="absolute bottom-4 right-4 w-10 h-10 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-gray-400 hover:text-white z-20 transition-colors"
        title="Admin panel"
      >
        ⚙
      </button>
    )
  }

  // Passphrase gate
  if (!passOk) {
    return (
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30" onClick={closeAdmin}>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
          <h2 className="text-white font-bold text-lg mb-4">{t('admin.title')}</h2>
          <input
            autoFocus
            type="password"
            value={passInput}
            onChange={e => { setPassInput(e.target.value); setPassError(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (passInput === adminPass) { setPassOk(true); setPassInput('') }
                else setPassError(true)
              }
              if (e.key === 'Escape') closeAdmin()
            }}
            placeholder={t('admin.passphrase')}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
          />
          {passError && (
            <p className="text-red-400 text-xs mt-2">{t('admin.wrongPassphrase')}</p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                if (passInput === adminPass) { setPassOk(true); setPassInput('') }
                else setPassError(true)
              }}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3 py-2 text-sm font-semibold"
            >
              OK
            </button>
            <button
              onClick={closeAdmin}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded px-3 py-2 text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Admin panel content
  const handleGenerate = () => {
    const s = parseInt(seedInput) || 1
    const d = parseInt(diffInput) || 0
    generateLevel(s, Math.max(0, Math.min(4, d)))
    setSlots(listSaveSlots())
  }

  const handleExport = () => {
    const json = exportJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `level-${seedInput}-d${diffInput}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const result = importJson(importText)
    if (result.success) {
      setImportStatus(t('admin.importSuccess'))
      setImportText('')
      setSlots(listSaveSlots())
    } else {
      setImportStatus(t('admin.importError', { error: result.error }))
    }
  }

  const slotDate = (savedAt: number) => new Date(savedAt).toLocaleString()

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30" onClick={closeAdmin}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-lg">{t('admin.title')}</h2>
          <button onClick={closeAdmin} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Generator */}
        <section className="mb-5">
          <div className="flex gap-3 mb-2">
            <label className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-gray-400">{t('admin.seed')}</span>
              <input
                type="number"
                value={seedInput}
                onChange={e => setSeedInput(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm outline-none focus:border-indigo-500"
              />
            </label>
            <label className="flex flex-col gap-1 w-28">
              <span className="text-xs text-gray-400">{t('admin.difficulty')} (0–4)</span>
              <input
                type="number"
                min={0} max={4}
                value={diffInput}
                onChange={e => setDiffInput(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm outline-none focus:border-indigo-500"
              />
            </label>
          </div>
          <button onClick={handleGenerate} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3 py-2 text-sm font-semibold">
            {t('admin.generate')}
          </button>
        </section>

        {/* Tick speed */}
        <section className="mb-5">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">{t('admin.tickSpeed')}</span>
            <input
              type="range" min={1} max={20}
              value={tickRate}
              onChange={e => setTickRate(parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <span className="text-xs text-gray-300 text-right">{tickRate} ticks/sec</span>
          </label>
        </section>

        {/* Export */}
        <section className="mb-5">
          <button onClick={handleExport} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white rounded px-3 py-2 text-sm font-semibold">
            {t('admin.export')}
          </button>
        </section>

        {/* Import */}
        <section className="mb-5">
          <textarea
            ref={importRef}
            value={importText}
            onChange={e => { setImportText(e.target.value); setImportStatus(null) }}
            placeholder={t('admin.importPlaceholder')}
            rows={4}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs font-mono outline-none focus:border-indigo-500 resize-none"
          />
          {importStatus && (
            <p className={`text-xs mt-1 ${importStatus.startsWith(t('admin.importError', { error: '' }).slice(0,6)) ? 'text-red-400' : 'text-green-400'}`}>
              {importStatus}
            </p>
          )}
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="w-full mt-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white rounded px-3 py-2 text-sm font-semibold"
          >
            {t('admin.import')}
          </button>
        </section>

        {/* Save slots */}
        <section>
          <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Save Slots</h3>
          <div className="flex flex-col gap-2">
            {Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => {
              const meta = slots[i] ?? null
              return (
                <div key={i} className="flex items-center gap-2 bg-gray-800 rounded px-3 py-2">
                  <span className="text-sm text-gray-300 w-16">{t('admin.saveSlot', { index: i + 1 })}</span>
                  {meta ? (
                    <span className="text-xs text-gray-400 flex-1">
                      {t('admin.savedAt', { date: slotDate(meta.savedAt) })} · {t('admin.ticks', { count: meta.tickCount })}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600 flex-1 italic">{t('admin.empty')}</span>
                  )}
                  <button onClick={() => { saveToSlot(i); setSlots(listSaveSlots()) }} className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded px-2 py-0.5">{t('admin.save')}</button>
                  <button onClick={() => { if (loadFromSlot(i)) setSlots(listSaveSlots()) }} disabled={!meta} className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded px-2 py-0.5">{t('admin.load')}</button>
                  <button onClick={() => { clearSlot(i); setSlots(listSaveSlots()) }} disabled={!meta} className="text-xs bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white rounded px-2 py-0.5">{t('admin.clear')}</button>
                </div>
              )
            })}
          </div>
        </section>

      </div>
    </div>
  )
}
