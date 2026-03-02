# PLAN.md — calc-o-matic Action Plan

## Overview
Build a Beltmatic-inspired browser-only educational math puzzle game (MVP) using Vite + React + TypeScript. No backend; all state lives in memory and localStorage.

---

## Phase 0 — Project Bootstrap ✅
- [x] Scaffold with Vite + React + TypeScript (manual, equivalent to `npm create vite@latest`)
- [x] Install core dependencies:
  - `zustand` (state management)
  - `i18next`, `react-i18next` (i18n)
  - `tailwindcss`, `postcss`, `autoprefixer` (styling)
  - `gh-pages` (deployment)
- [x] Install dev dependencies:
  - `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
  - `typescript`, `@types/react`, `@types/react-dom`
  - `jsdom`
- [x] Configure `vite.config.ts` (base `/calc-o-matic/`, jsdom test env, `passWithNoTests`, coverage)
- [x] Configure `tailwind.config.js` and `postcss.config.js`
- [x] Configure `tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json` (strict mode)
- [x] Set up `.gitignore` (node_modules, dist, .claude, *.tsbuildinfo, .idea)
- [x] Add scripts to `package.json`: `dev`, `build`, `preview`, `test`, `test:ui`, `test:run`, `test:coverage`, `test:e2e`, `deploy`
- [x] Add `.github/workflows/gh-pages.yml` (auto-deploy on push to `main`)
- [x] Create `src/main.tsx`, `src/App.tsx`, `src/styles/index.css`, `src/vite-env.d.ts`
- [x] Create `src/tests/setup.ts` (localStorage mock, rAF mock, jest-dom matchers)
- [x] Verified: `npm run build` passes, `npm run test:run` exits 0
- [x] Initial commit pushed to `https://github.com/aaronFortuno/calc-o-matic.git` (branch: `main`)

---

## Phase 1 — Core Type System & Engine Foundations ✅
- [x] `src/engine/entities/types.ts` — `EntityType`, `OperatorType`, `ConveyorDirection`, `TileCoord`, `ChunkCoord`, `Token`, `Entity`, `WorldState`, `Viewport`, `Objective`, `LevelDefinition`, `PlacementResult`, `OPERATOR_ARITY`, `DIRECTION_DELTA`
- [x] `src/engine/grid.ts` — `TILE_SIZE`, `CHUNK_SIZE`, `MIN_ZOOM`, `MAX_ZOOM`, `PAN_STEP`; `tileKey`, `parseTileKey`, `tileToChunk`, `chunkTopLeft`, `tileToPixel`, `pixelToTile`, `chunkToPixelRect`, `getVisibleChunks`, `clampZoom`, `createViewport`, `panViewport`, `zoomViewport`
- [x] `src/engine/world.ts` — `createWorld`, `addEntity`, `removeEntity`, `getEntityAt`, `getEntityById`, `queryEntitiesByType`, `updateEntity`, `addObjective`, `isLevelComplete`
- [x] `src/engine/tick.ts` — `tickWorld` (pure, composes `tickExtractors` → `tickConveyors` → `tickOperators`); `evaluateOperator` (all 11 operators); `TickEngine` class (start/stop/setTickRate/setState); math helpers `gcd`, `isPrime`, `primeFactors`
- [x] Verified: `npm run build` passes with zero TypeScript errors

---

## Phase 2 — Entities ✅
- [x] `src/engine/entities/extractor.ts` — `createExtractor(id, position, value, period, outputDirection)`
- [x] `src/engine/entities/conveyor.ts` — `createConveyor`, `rotateConveyor` (CW), `rotateConveyorCCW`
- [x] `src/engine/entities/operator.ts` — `BaseOperator` abstract class; all 11 implementations (`AddOperator`, `SubOperator`, `MulOperator`, `DivOperator`, `PowerOperator`, `ModOperator`, `GcdOperator`, `SquareOperator`, `SqrtOperator`, `FactorOperator`, `IsPrimeOperator`); `OPERATOR_REGISTRY`; `evaluateOperator`; `createOperator`
- [x] `src/engine/entities/receiver.ts` — `createReceiver(id, position, expected, required)`
- [x] Refactored `tick.ts`: `evaluateOperator` + math helpers moved to `operator.ts`; `tick.ts` now imports from `operator.ts`
- [x] Verified: `npm run build` passes with zero TypeScript errors

---

## Phase 3 — Persistence & Procedural Generation ✅
- [x] `src/engine/procedural/rules.ts` — `validatePlacement`, `getAdjacentEntities`, `isConveyorFeedingTile`, `isExtractorConnected`, `isReceiverConnected`, `isOperatorConnected`, `checkConnectivity`
- [x] `src/engine/procedural/serializer.ts` — `exportLevel` / `importLevel` (LevelDefinition JSON); `levelDefToWorld` (resets live state on import); `saveWorldToSlot` / `loadWorldFromSlot` / `clearSaveSlot` / `listSaveSlots` (3 localStorage save slots); `SaveSlotMeta` type
- [x] `src/engine/procedural/generator.ts` — `SeededRNG` (LCG, Numerical Recipes params); `generate({ seed, difficulty })` → LevelDefinition; four difficulty templates: D0 (straight belt), D1 (one binary op), D2 (two chained ops), D3+ (SQUARE + ADD)
- [x] Verified: `npm run build` passes with zero TypeScript errors

---

## Phase 4 — i18n ✅
- [x] `src/i18n/en.json` — all UI strings, tooltips, tutorial text, error messages
- [x] `src/i18n/index.ts` — i18next init (lng: 'en', fallbackLng: 'en', escapeValue: false)
- [x] `import './i18n'` added to `main.tsx` before React render
- [x] Verified: `npm run build` passes with zero TypeScript errors

---

## Phase 5 — UI Components ✅
- [x] `src/store/playerStore.ts` — Zustand + persist; XP, level, unlockedOperators, completedLevels; `OPERATOR_UNLOCK_XP` thresholds; `awardXP`, `completeLevel`, `resetPlayer` actions
- [x] `src/store/uiStore.ts` — selectedTool (ToolType), adminOpen, tutorialVisible/step; `selectTool`, `openAdmin/closeAdmin`, `nextTutorialStep`, `skipTutorial` actions; tutorialSeen via localStorage flag
- [x] `src/store/worldStore.ts` — WorldState, Viewport, seed, difficulty, tickRate, running; `TickEngine` as module-level singleton; `placeEntity`, `removeEntityAt`, `rotateEntityAt`; `startSim/stopSim/setTickRate/resetSim`; `generateLevel`, `importLevelJson`, `exportLevelJson`; `saveToSlot/loadFromSlot/clearSlot`
- [x] `src/ui/CanvasRenderer.tsx` — rAF render loop; chunked grid lines; entity drawing (extractor, conveyor with arrow, operator with processing indicator, receiver with progress); token bubbles; mouse pan (middle-click/alt+click drag), scroll-wheel zoom, left-click place, right-click rotate; keyboard arrow-key pan, +/- zoom; ResizeObserver for canvas sizing
- [x] `src/components/Toolbar.tsx` — tool buttons for extractor, conveyor, eraser, all 11 operators; locked operators disabled with XP tooltip; keyboard shortcuts (1/2/0 for basics, 3+ for operators); selected state ring highlight
- [x] `src/components/HUD.tsx` — objectives bar (completed state shown in green), tick counter, tick-speed +/- knob, Start/Pause/Reset buttons, XP/level display with progress bar
- [x] `src/components/AdminPanel.tsx` — gear button trigger + /#admin hash; passphrase gate; seed/difficulty inputs + Generate; tick-speed slider; Export (downloads JSON file); Import (textarea + parse + error display); 3 save slots with Save/Load/Clear
- [x] `src/components/TutorialModal.tsx` — 3-step tutorial; skip / next / finish; step dots indicator; auto-shows on first run (checks localStorage tutorialSeen flag); closes on backdrop click
- [x] `src/App.tsx` — composes CanvasRenderer + Toolbar + HUD + AdminPanel + TutorialModal
- [x] Verified: `npm run build` passes with zero TypeScript errors

---

## Phase 6 — Game Logic: Levels & Progression ✅
- [x] `src/engine/procedural/tutorials.ts` — Hardcoded tutorial level definitions + `LevelEntry` catalog type + `getLevelCatalog()`
- [x] Tutorial Level 1: extractor(2) → conveyor → conveyor → receiver(2, ×3)
- [x] Tutorial Level 2 (ADD): extractor(1) + extractor(3) → ADD → receiver(4, ×3)
- [x] Procedurally generated Level 3+ via `nextLevel()` auto-advance (increments seed/difficulty)
- [x] Progression system: XP awarded on each objective completion (25 XP each); operator unlock thresholds enforced via `playerStore`
- [x] Persistent player profile in localStorage: `unlockedOperators`, `completedLevels` (via Zustand persist in `playerStore`)
- [x] Level progression in `worldStore`: `currentLevelId`, `currentLevelName`, `levelComplete`, `levelCatalog`; actions `loadCatalogLevel`, `nextLevel`, `dismissLevelComplete`
- [x] `_onTick` callback detects newly completed objectives, awards XP, auto-stops sim and marks level complete when all objectives done
- [x] `src/components/LevelCompleteModal.tsx` — Modal shown on level completion with XP earned, Next Level / Replay / Continue buttons
- [x] HUD updated with current level name display
- [x] App auto-loads Tutorial Level 1 on first mount
- [x] i18n strings added: `levels.*`, `levelComplete.*`
- [x] Verified: `npm run build` passes with zero TypeScript errors

---

## Phase 7 — Tests ✅

> All tests live under `src/tests/`. Run with `npm run test`. Use `vi.useFakeTimers()` wherever real time would be involved. No `Math.random()` — use seeded RNG. Every test must be deterministic and fast.
>
> **Result: 14 test files, 142 tests, all passing.** `npm run build` + `npm run test:run` both green.

---

### 7.1 — Engine Unit Tests (pure logic, no React)

#### `src/tests/engine/operator.test.ts`
- **ADD**: `evaluate([3, 4])` → `7`; `evaluate([0, 0])` → `0`; `evaluate([-1, 5])` → `4`
- **SUB**: `evaluate([10, 3])` → `7`; `evaluate([3, 10])` → `-7`
- **MUL**: `evaluate([6, 7])` → `42`; `evaluate([0, 99])` → `0`
- **DIV**: `evaluate([10, 2])` → `5`; divide-by-zero → returns `null` / emits no token (must not throw)
- **SQUARE**: `evaluate([5])` → `25`; `evaluate([0])` → `0`
- **SQRT**: `evaluate([9])` → `3`; `evaluate([2])` → `~1.414` (float allowed); `evaluate([-1])` → `null`
- **POWER**: `evaluate([2, 10])` → `1024`; `evaluate([0, 0])` → `1` (math convention)
- **MOD**: `evaluate([10, 3])` → `1`; `evaluate([9, 3])` → `0`; mod-by-zero → `null`
- **GCD**: `evaluate([12, 8])` → `4`; `evaluate([7, 13])` → `1` (coprime)
- **FACTOR**: `evaluate([12])` → `[2, 2, 3]` (prime factors in ascending order); `evaluate([1])` → `[]`; `evaluate([7])` → `[7]` (prime)
- **IS_PRIME**: `evaluate([7])` → `1`; `evaluate([4])` → `0`; `evaluate([1])` → `0`; `evaluate([2])` → `1`
- **Edge cases**: all operators handle non-integer inputs per defined spec; large numbers (e.g. `evaluate([999983])` for IS_PRIME)

#### `src/tests/engine/tick.test.ts`
- Single conveyor step: token at position `(0,0)` moves to `(1,0)` after one tick (direction RIGHT)
- Chain of 3 conveyors: token reaches end after 3 ticks
- Merge conflict: two tokens arriving at the same segment in the same tick — first-in token advances, second stays queued
- Conveyor full (capacity 1): token arriving at full segment is held on the previous segment, not dropped
- Operator processing delay: operator with `delay=2` does not emit until 2 ticks after inputs are consumed
- Extractor period: extractor with `period=3` emits on ticks 0, 3, 6 and not on ticks 1, 2, 4, 5
- Receiver validates: token of correct value increments `deliveredCount`; wrong value is rejected (count unchanged)
- Receiver completes objective: `deliveredCount` reaching `required` triggers objective completion callback

#### `src/tests/engine/grid.test.ts`
- `tileToChunk({ x: 0, y: 0 })` → `{ cx: 0, cy: 0 }` (CHUNK_SIZE=16)
- `tileToChunk({ x: 15, y: 15 })` → `{ cx: 0, cy: 0 }`
- `tileToChunk({ x: 16, y: 0 })` → `{ cx: 1, cy: 0 }`
- `tileToChunk({ x: -1, y: 0 })` → `{ cx: -1, cy: 0 }` (negative coords)
- `chunkToPixel` returns correct screen-space rect given viewport offset + zoom
- `getVisibleChunks(viewport)` returns only chunks overlapping the visible screen rect
- Zoom clamped to `[MIN_ZOOM, MAX_ZOOM]` — no negative or zero zoom
- Pan offset arithmetic: double pan right → offset increases by `2 * tileSize * zoom`

#### `src/tests/engine/world.test.ts`
- `addEntity` adds entity to registry; querying by id returns it
- `removeEntity` removes entity; querying by id returns `undefined`
- `getEntityAt({ x, y })` returns correct entity or `null` for empty tile
- Placing two entities on the same tile is rejected (collision rule enforced)
- `queryEntitiesByType(EntityType.EXTRACTOR)` returns only extractors

#### `src/tests/engine/rules.test.ts`
- Placing an entity on an occupied tile returns `{ valid: false, reason: 'OCCUPIED' }`
- Placing a conveyor adjacent to an operator output is valid
- Placing an entity out of defined world bounds returns `{ valid: false, reason: 'OUT_OF_BOUNDS' }`
- An extractor with no connected conveyor on its output side is flagged as `{ connected: false }`
- A receiver connected correctly to a conveyor chain is flagged as `{ connected: true }`

#### `src/tests/engine/generator.test.ts`
- Same seed + difficulty always produces identical `LevelDefinition` output (determinism)
- Different seeds produce different layouts
- Generated level always contains at least one extractor, one conveyor, one receiver
- Generated level is solvable: simulate ticks until receiver completes, assert it completes within `MAX_TICKS`
- Difficulty parameter changes extractor count and operator complexity
- Generator with `difficulty=0` produces a trivially short conveyor path

#### `src/tests/engine/serializer.test.ts`
- `exportLevel(world)` returns valid JSON string
- `importLevel(json)` round-trips: `importLevel(exportLevel(world))` produces identical world state
- `saveToLocalStorage` + `loadFromLocalStorage` round-trip (mock `localStorage` with `vi.stubGlobal`)
- Loading from a missing localStorage key returns `null` without throwing
- Importing malformed JSON returns an error result, does not crash

---

### 7.2 — Store Integration Tests

#### `src/tests/store/playerStore.test.ts`
- `awardXP(100)` increments player XP correctly
- XP reaching threshold triggers `unlockOperator` for the correct operator
- `completeLevel(id)` adds level id to `completedLevels` and does not duplicate on repeated calls
- Store persists to localStorage on change; re-hydrates on init

#### `src/tests/store/worldStore.test.ts`
- `placeEntity` updates store and rejects placement on occupied tile
- `removeEntity` clears the tile and removes associated tokens
- `setTickSpeed(n)` updates tick interval; scheduler respects new speed
- Advancing one tick via store action reflects entity state changes (extractor emits, conveyor moves)

---

### 7.3 — Component / UX Tests (React Testing Library)

#### `src/tests/components/Toolbar.test.tsx`
- Renders all initially unlocked tools as enabled buttons
- Renders locked tools as disabled buttons with a tooltip containing unlock requirement text
- Clicking an unlocked tool updates `uiStore.selectedTool`
- Pressing keyboard number key `1`–`9` selects the corresponding tool
- Toolbar re-renders when `playerStore.unlockedOperators` changes (new tool becomes enabled)

#### `src/tests/components/HUD.test.tsx`
- Displays current level name from i18n
- Displays correct objective description and `delivered / required` progress
- Progression bar width reflects XP percentage toward next threshold
- Updates reactively when store state changes

#### `src/tests/components/AdminPanel.test.tsx`
- Panel is not visible on initial render
- Opening trigger renders passphrase input field
- Entering incorrect passphrase shows error, panel stays closed
- Entering correct passphrase opens the panel
- Seed and difficulty inputs update generator parameters in the store
- Clicking **Generate** calls `generator.generate()` with correct params
- **Export** button triggers a file download (mock `URL.createObjectURL`)
- **Import** accepts valid level JSON and loads it into the world store; rejects malformed JSON with an error message

#### `src/tests/components/TutorialModal.test.tsx`
- Renders on first run (no `calc-o-matic:tutorialSeen` key in localStorage)
- Does not render on subsequent loads when `tutorialSeen` is set
- **Next** button advances to next step; step counter increments
- **Skip** button closes the modal and sets `tutorialSeen` in localStorage
- Last step shows a **Finish** button instead of **Next**; clicking it closes the modal

---

### 7.4 — Accessibility Tests

#### `src/tests/a11y/keyboard.test.ts`
- Arrow key `ArrowRight` pans viewport offset by `PAN_STEP` pixels
- Arrow key `ArrowLeft` pans in opposite direction
- `+` key increases zoom; `-` key decreases zoom; zoom stays within `[MIN_ZOOM, MAX_ZOOM]`
- `Escape` closes any open modal or panel
- All interactive buttons have accessible `aria-label` or visible text
- Toolbar buttons are focusable and activatable via `Enter`/`Space`

---

### 7.5 — i18n Tests

#### `src/tests/i18n/translations.test.ts`
- Every key present in `en.json` has a non-empty string value
- No `t('missing.key')` calls in the codebase that are absent from `en.json` (use a key-coverage script or snapshot)
- `useTranslation` hook returns the correct English string for a known key
- Switching language (if a second locale is added) updates rendered text without page reload

---

### 7.6 — End-to-End / Smoke Tests (Playwright — optional but recommended)

File: `e2e/tutorial.spec.ts`

- **Tutorial Level 1 full playthrough**: open app → tutorial modal appears → dismiss → select conveyor tool → place conveyors from extractor to receiver → start simulation → receiver completes 3 deliveries → objective complete banner shown
- **Admin panel access**: navigate to `/#admin` → passphrase prompt → enter correct passphrase → panel opens → seed field is editable
- **Level export/import round-trip**: export current level → reload page → import JSON → same entities appear on grid
- **Progression unlock**: complete Tutorial Level 1 → XP awarded → MUL operator becomes enabled in toolbar

---

### 7.7 — Performance / Regression Tests

#### `src/tests/perf/rendering.test.ts`
- Simulating 1000 ticks with 50 entities completes in under 500 ms (use `performance.now()`)
- `getVisibleChunks` with a 1920×1080 viewport and zoom=1 returns at most `ceil(1920/tileSize / CHUNK_SIZE + 1) * ceil(1080/tileSize / CHUNK_SIZE + 1)` chunks
- Token queue does not grow unboundedly after 500 ticks when conveyors are saturated — excess tokens are held or dropped per spec, never accumulate in memory without bound

---

### 7.8 — Test Infrastructure Checklist
- [x] `src/tests/setup.ts` — Vitest global setup: mock `localStorage`, mock `requestAnimationFrame`, jest-dom matchers
- [ ] `vitest.config.ts` — coverage thresholds: 80% lines/branches for `src/engine/` and `src/store/`; lower threshold acceptable for UI components
- [ ] CI step runs `npm run test -- --run` (non-watch) on every PR
- [x] `npm run test:coverage` script already configured; output to `/coverage`
- [ ] Add `npm run test:e2e` script for Playwright (separate from unit test run)

---

## Phase 7.5 — Visual & Gameplay Overhaul ✅
- [x] **Token emission fix**: Freshly minted tokens no longer skip the first conveyor tile (same-tick movement prevention via `preExistingTokenIds` set in `tickWorld`)
- [x] **Smooth token animation**: Canvas renderer now interpolates token positions between ticks using lerp, creating fluid movement along conveyor belts
- [x] **Improved conveyor visuals**: Animated dashed belt lines that move in the belt direction, plus chevron directional arrows
- [x] **6 tutorial levels**: Conveyor basics, ADD, MUL, SUB, DIV, Chained operators (MUL→ADD)
- [x] **Procedural generator overhaul**: D0 (belt), D1 (ADD/MUL/SUB/DIV), D2 (two chained ops), D3 (5 templates: SQUARE+ADD, SQRT+ADD, MUL−SUB, ADD%MOD, MUL÷DIV), D4 (4 expert templates with 3–4 extractors)
- [x] **Test updates**: tick.test.ts updated for same-tick prevention; all 142 tests passing
- [x] Verified: `npm run build` + `npm run test:run` both green

---

## Phase 8 — Accessibility & Polish
- [ ] Keyboard controls: arrow keys to pan, `+`/`-` to zoom, number keys to select toolbar item
- [ ] Tooltips on hover for all toolbar items
- [ ] Connectivity highlight when selecting a component
- [ ] Responsive layout (desktop-first but functional on tablet)

---

## Phase 9 — Build & Deploy
- [ ] Verify `npm run build` produces `/dist` with correct base path
- [ ] Test `npm run deploy` via `gh-pages` package
- [ ] Verify GitHub Actions workflow (optional) auto-deploys on push to `main`
- [ ] Write final `README.md` deployment section

---

## Recommended Future Improvements (out of scope for MVP)
- Analytics export for teacher dashboards
- Multiplayer challenge mode
- Teacher/admin level editor (drag-and-drop level authoring)
- Optional server sync (cloud save)
