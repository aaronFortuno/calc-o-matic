// Root component — composes all UI layers over the Canvas renderer.
import { CanvasRenderer }  from './ui/CanvasRenderer'
import { Toolbar }         from './components/Toolbar'
import { HUD }             from './components/HUD'
import { AdminPanel }      from './components/AdminPanel'
import { TutorialModal }   from './components/TutorialModal'

function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">
      {/* Game canvas — fills the whole viewport */}
      <CanvasRenderer />

      {/* UI overlays */}
      <Toolbar />
      <HUD />
      <AdminPanel />
      <TutorialModal />
    </div>
  )
}

export default App
