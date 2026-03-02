# ARCHITECTURE.md — calc-o-matic

> Living document. Update this file whenever the structure, patterns, or key APIs change.

---

## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | React 18 + TypeScript (strict) | SPA, no SSR |
| Build | Vite | Dev server + production bundler |
| State | Zustand | Lightweight store slices; no Redux boilerplate |
| Rendering | HTML5 Canvas (grid) + React (UI overlays) | Canvas handles the game world; React handles HUD/toolbar/modals |
| i18n | i18next + react-i18next | JSON locale files; English default |
| Styling | Tailwind CSS | Utility-first; no component library |
| Testing | Vitest + Testing Library | Unit tests for engine logic |
| Persistence | localStorage | Save slots, player profile, operator unlocks |
| Deployment | gh-pages / GitHub Actions | GitHub Pages target |

---

## Repository Layout

```
calc-o-matic/
├── public/
│   └── index.html                  # HTML entry point
├── src/
│   ├── main.tsx                    # React + i18n bootstrap
│   ├── App.tsx                     # Root component (canvas + UI layers)
│   ├── assets/                     # SVG icons, simple sprites
│   │
│   ├── i18n/
│   │   ├── index.ts                # i18next init & language detection
│   │   └── en.json                 # All English UI strings & tooltips
│   │
│   ├── engine/                     # Pure game logic (no React imports)
│   │   ├── grid.ts                 # Tile coords, chunk math, pan/zoom helpers
│   │   ├── world.ts                # WorldState, entity registry
│   │   ├── tick.ts                 # Game loop, tick scheduler
│   │   │
│   │   ├── entities/
│   │   │   ├── types.ts            # All shared TS types & enums
│   │   │   ├── extractor.ts        # Extractor entity
│   │   │   ├── conveyor.ts         # Conveyor entity
│   │   │   ├── operator.ts         # Operator base class + all implementations
│   │   │   └── receiver.ts         # Receiver entity
│   │   │
│   │   └── procedural/
│   │       ├── generator.ts        # Deterministic level generator (seed + difficulty)
│   │       ├── serializer.ts       # Save/load world to/from localStorage; JSON export/import
│   │       └── rules.ts            # Placement, collision, connectivity rules
│   │
│   ├── store/                      # Zustand store slices
│   │   ├── worldStore.ts           # World state slice (entities, viewport)
│   │   ├── playerStore.ts          # Player profile (XP, unlocks, completed levels)
│   │   └── uiStore.ts              # UI state (selected tool, panel visibility, tick speed)
│   │
│   ├── ui/
│   │   └── CanvasRenderer.tsx      # Canvas mount, chunk rendering, mouse/touch input
│   │
│   ├── components/
│   │   ├── Toolbar.tsx             # Tool selector strip
│   │   ├── HUD.tsx                 # Score, level, objectives overlay
│   │   ├── AdminPanel.tsx          # Admin/config panel (passphrase-gated)
│   │   └── TutorialModal.tsx       # First-run tutorial steps
│   │
│   └── styles/
│       └── index.css               # Tailwind directives + global resets
│
├── src/tests/
│   ├── engine/
│   │   ├── tick.test.ts            # Tick engine unit tests
│   │   └── operator.test.ts        # Operator evaluation unit tests
│   └── setup.ts                    # Vitest global setup
│
├── .github/
│   └── workflows/
│       └── gh-pages.yml            # Auto-deploy on push to main
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── README.md
├── PLAN.md
└── ARCHITECTURE.md
```

---

## Core Concepts & Data Flow

### 1. Entity Component System (ECS-lite)

All game objects are `Entity` objects stored in a flat registry (`WorldState.entities: Map<string, Entity>`). Each entity has:

```ts
interface Entity {
  id: string;
  type: EntityType;           // EXTRACTOR | CONVEYOR | OPERATOR | RECEIVER
  position: TileCoord;        // { x, y }
  data: ExtractorData | ConveyorData | OperatorData | ReceiverData;
}
```

### 2. Tile Grid

- The world is a discrete orthogonal grid. Each `(x, y)` tile holds **at most one** stationary component.
- Moving tokens ("items") live on conveyor segments, not on tiles directly.
- The viewport is tracked as `{ offsetX, offsetY, zoom }` and rendered in chunks of `CHUNK_SIZE × CHUNK_SIZE` tiles.

```
TileCoord  →  ChunkCoord  (via  chunkOf(tile))
ChunkCoord →  pixel rect  (via  chunkToPixel(chunk, viewport))
```

### 3. Game Loop (Tick Engine)

`tick.ts` runs a `setInterval`-based scheduler at a configurable rate (default 8 ticks/sec).

Each tick:
1. **Extractor tick** — produce tokens if `ticksUntilNext === 0`; enqueue to output conveyor
2. **Conveyor tick** — advance each item one segment forward; resolve merges (first-in wins; extras queued)
3. **Operator tick** — if all input slots are filled, consume inputs, run `evaluate()`, decrement processing delay; output when ready
4. **Receiver tick** — check arriving tokens against objective; award XP on match

### 4. Operators

All operators extend a base class:

```ts
abstract class BaseOperator {
  abstract type: OperatorType;
  abstract arity: number;           // number of input tokens required
  abstract evaluate(inputs: number[]): number | number[];
}
```

**Initially unlocked:** `ADD`, `SUB`, `MUL`, `DIV`
**Progressively unlocked:** `SQUARE`, `SQRT`, `POWER`, `MOD`, `GCD`, `FACTOR`, `IS_PRIME`

`FACTOR` produces **multiple tokens** (prime factors in sequence) onto its output conveyor.

### 5. Zustand Store Slices

| Store | Key State | Key Actions |
|---|---|---|
| `worldStore` | `entities`, `tokens`, `viewport`, `tickSpeed` | `placeEntity`, `removeEntity`, `moveToken`, `setViewport` |
| `playerStore` | `xp`, `level`, `unlockedOperators`, `completedLevels` | `awardXP`, `unlockOperator`, `completeLevel` |
| `uiStore` | `selectedTool`, `adminOpen`, `tutorialStep` | `selectTool`, `toggleAdmin`, `advanceTutorial` |

### 6. Rendering Pipeline

```
Zustand worldStore
       │
       ▼
CanvasRenderer.tsx
  └── useEffect / requestAnimationFrame
        ├── clearCanvas()
        ├── for each visible chunk:
        │     drawTileBackground()
        │     drawEntities()       ← grid.ts helpers
        │     drawTokens()
        └── (React overlays: HUD, Toolbar, AdminPanel via normal DOM)
```

Canvas handles all game-world rendering. React components handle all UI overlays. They share state through Zustand.

### 7. Procedural Generator

`generator.ts` uses a **seeded LCG (linear congruential generator)** for determinism:

```
given (seed, difficulty) →
  place N extractors (values 1–9)
  route conveyors connecting them
  insert 1–3 operator nodes
  place receiver with target = result of operator chain
  return LevelDefinition
```

Output is a `LevelDefinition` JSON object that is both playable and exportable.

### 8. Persistence

- **Player profile** (`localStorage['calc-o-matic:player']`): XP, unlocked operators, completed levels
- **Save slots** (`localStorage['calc-o-matic:save:{n}']`): full world snapshot (entities + tokens + objectives)
- **Level export**: admin panel serialises current world to downloadable JSON; importer reads it back

### 9. i18n

All user-visible strings come from `en.json` via `useTranslation()` hook:
```tsx
const { t } = useTranslation();
<span>{t('toolbar.conveyor')}</span>
```

To add a new language: copy `en.json` to `{lang}.json`, translate values, add the language code to `i18next` resources config in `src/i18n/index.ts`.

---

## Key Extension Points

| To add… | Where to change |
|---|---|
| A new operator type | Add entry to `OperatorType` enum in `types.ts`; add class in `operator.ts`; add unlock threshold in `playerStore.ts`; add i18n key in `en.json` |
| A new entity type | Add to `EntityType` enum; create `entity.ts`; register in `world.ts`; add render case in `CanvasRenderer.tsx` |
| A new language | Add `{lang}.json` in `src/i18n/`; register in `src/i18n/index.ts` |
| A new level | Define `LevelDefinition` object; register in level list; or use admin panel + export |
| A Web Worker for generator | Move `generator.ts` logic to `generator.worker.ts`; call via `new Worker()` in `AdminPanel.tsx` |

---

## Testing Strategy

- **Unit tests only** for the engine layer (`src/tests/engine/`)
- Tests must be deterministic: no `Date.now()`, no `Math.random()` — use seeded RNG or fixed inputs
- Tests must be fast: no real timers (`vi.useFakeTimers()` where needed)
- Run with: `npm run test`
