// Root component — composes all UI layers over the Canvas renderer.
import { useEffect }             from 'react'
import { CanvasRenderer }        from './ui/CanvasRenderer'
import { Toolbar }               from './components/Toolbar'
import { HUD }                   from './components/HUD'
import { AdminPanel }            from './components/AdminPanel'
import { TutorialModal }         from './components/TutorialModal'
import { LevelCompleteModal }    from './components/LevelCompleteModal'
import { useWorldStore }         from './store/worldStore'

function App() {
  const loadCatalogLevel = useWorldStore(s => s.loadCatalogLevel)
  const currentLevelId   = useWorldStore(s => s.currentLevelId)
  const levelCatalog     = useWorldStore(s => s.levelCatalog)

  // Auto-load the first tutorial level on mount if no level is loaded
  useEffect(() => {
    if (!currentLevelId && levelCatalog.length > 0) {
      loadCatalogLevel(levelCatalog[0].id)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">
      {/* Game canvas — fills the whole viewport */}
      <CanvasRenderer />

      {/* UI overlays */}
      <Toolbar />
      <HUD />
      <AdminPanel />
      <TutorialModal />
      <LevelCompleteModal />
    </div>
  )
}

export default App
