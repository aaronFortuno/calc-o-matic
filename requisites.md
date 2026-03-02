You are an expert full‑stack front-end engineer. Generate a complete, runnable web application repository (MVP) called "calc-o-matic" that implements a Beltmatic-like educational math game in the browser with no backend or database. The app must be internationalization-ready (default English), procedurally generate levels or allow admin-configured levels, and unlock progressively new operator types as the player advances. The output must be a ready-to-build repository (package.json, build scripts) using Vite + React + TypeScript. Include clear README and deployment instructions for GitHub Pages.

Constraints and high-level goals

No server or external database. All data is client-side (in-memory + localStorage for persistence).
Produce a single-page app (SPA) that runs completely in the browser.
The game world is an infinite (or very large) orthogonal tile grid. For performance, implement viewport rendering & chunking/virtualization.
Provide a playable MVP: placeable components, conveyors that move numeric tokens, components that compute (operators), extractors that produce numbers, and receivers that accept/validate numbers.
Provide a procedural level generator with configurable seed/parameters and an in-app "admin/config" panel to set difficulty and procedural options.
Progressive unlocks: start simple (extractors, conveyors, +, ×), and unlock advanced operators (square, sqrt, factor, gcd, power, modulo, prime-check, etc.) based on player progress (experience, level or completed tasks).
i18n-ready: include i18next or similar with JSON translation files (en.json) and English UI text. Structure should support adding other languages later.
UX: toolbar to select/place components, pan/zoom the grid, show tooltips and contextual help, show current objectives and progression, and a small tutorial level.
Code quality: TypeScript types, modular components, comments, unit tests for the core game engine logic (tick/update, operator evaluation) using Vitest or comparable.
Provide instructions and scripts to deploy to GitHub Pages (e.g., gh-pages package or GitHub Actions job), and a short demo level included.
Tech stack (single recommended approach)

React + TypeScript + Vite
State: Zustand (lightweight, simple)
Rendering: HTML5 Canvas for the grid + React UI for overlays. Implement chunked rendering to support large worlds.
i18n: i18next with JSON locale files
Styling: Tailwind CSS (for quick UI)
Testing: Vitest + Testing Library for unit tests on game-logic modules
Persistence: localStorage for save slots and unlocked operators
Optional: use a Web Worker for the procedural level generator if heavy
Repository structure (must create)

package.json, tsconfig.json, vite.config.ts
src/
main.tsx, App.tsx
assets/ (icons, small sprites; use simple SVGs or CSS shapes)
components/
Toolbar.tsx, AdminPanel.tsx, HUD.tsx, TutorialModal.tsx
engine/
grid.ts (tile coordinates, chunking, pan/zoom)
world.ts (world state and entity registry)
tick.ts (game loop / discrete ticks)
entities/
types.ts (EntityType, OperatorType, ConveyorDirection, etc.)
extractor.ts
conveyor.ts
operator.ts (base class + implementations: AddOperator, MulOperator, SubOperator, DivOperator, SquareOperator, SqrtOperator, FactorOperator, etc.)
receiver.ts
procedural/
generator.ts (procedural level generator with seed and parameters)
serializer.ts (save / load world to localStorage)
rules.ts (collision, placement, connectivity rules)
ui/
CanvasRenderer.tsx (canvas rendering & input)
i18n/
en.json
styles/
index.css (Tailwind)
tests/
engine/tick.test.ts
engine/operator.test.ts
public/
index.html
README.md (how to run, build, deploy to GH Pages)
.gitignore
optional: .github/workflows/gh-pages.yml for automatic deployment
Functional requirements (details to implement)

Tile grid and world
Discrete orthogonal grid. Each tile can host zero or one stationary component (extractor, operator, receiver) and/or a conveyor occupying the tile edge(s).
Represent moving numeric tokens as "items" on conveyors; an item carries a numeric value (integer or float).
Implement tick-based simulation (e.g., 6-10 ticks/sec) where conveyors move items along a path. Provide adjustable tick speed in admin.
Entities and mechanics
Extractor: produces a numeric token periodically (configurable value or range). E.g., an extractor that outputs "2" every 3 ticks.
Conveyor: directional belts that move numeric tokens from cell to cell; support turns and merges (resolve conflicts deterministically).
Operator: consumes input tokens from one or more input sides, applies its function, and places output token onto its output side after processing delay (operator cost/time). Must support variable arity and multiple operator implementations:
Basic set unlocked initially: ADD (sum two inputs), MUL (multiply two inputs), SUB, DIV (handle divide by zero gracefully).
Advanced operators unlocked later: SQUARE, SQRT (float outputs allowed), POWER, FACTORIZE (return prime factors as list or single composite? define behavior: produce multi-output tokens or require additional conveyors? For MVP, FACTOR operator outputs the product's prime factors as multiple tokens in sequence), MOD, GCD, IS_PRIME (binary output: 1 or 0), etc.
Receiver: validates tokens arriving (expects a specific number or pattern). If it receives the expected value, it counts progress and completes objectives.
Items: numeric tokens should be serializable, and the engine must support token collisions (queue on conveyors, or drop older ones if full). Keep conservative rules for MVP: conveyors hold one item per tile segment; merges prefer first-in.
Level objectives and progression
Each level provides a set of objectives (e.g., deliver 5 tokens of value 24 to Receiver A, or produce any prime numbers consecutively).
When objectives complete, award progression points; after thresholds, unlock operators.
Provide a persistent player profile in localStorage: unlockedOperators, bestScores, completedLevels.
UI & interactions
Toolbar: shows available components (locked ones are shown as disabled with tooltips stating unlock requirements).
Drag & drop placement on the grid; right-click to rotate components (conveyors and operators).
Pan/zoom grid with mouse/touch.
Highlight connectivity when selecting a component (show which sides are inputs/outputs).
Admin panel: accessible via a secret toggle or route (e.g., /admin with passphrase stored in localStorage). Allows setting procedural generator parameters: seed, complexity, extractors count, initial inventory, unlock progression rules, tick speed. Also allow creating a manual custom level (place components) and export/import JSON of level.
Procedural generation
Implement generator that, given difficulty and seed, places small clusters of extractors, conveyors and operators forming a solvable puzzle. Provide deterministic RNG by seed and fallback random. Provide a "preview" feature where generator returns a small map snippet.
i18n and help
All UI strings must come from i18n JSON. Include en.json with all labels, tooltips, and short tutorial text.
Provide contextual help overlay or tutorial modal for the first run.
Tests
Unit tests for operator evaluation (Add, Mul, Square, Sqrt, Factor) and the tick engine (items move on conveyors, operator consumes/outputs after processing delay).
Keep tests deterministic and fast.
Performance and architecture notes
Use canvas for grid rendering; batch draw tiles & entities per visible chunk.
Keep the logic separate from rendering so the game loop can be paused or run in a worker later.
Use a simple ECS-like structure in TypeScript for entities.
Deliverables (explicit)
A repository scaffold with all files above, complete implementations for core components, and at least one tutorial level and one procedurally generated level.
README with: how to run (dev server), how to build, how to deploy to GitHub Pages (npm script using gh-pages or GitHub Actions config), how to open admin panel and change seed, and how to add translations.
Unit tests and instructions to run them.
Example en.json translation and comment where to add more languages.
Clear comments in code explaining key functions and extension points (how to add new operators).
Developer instructions for the code generator (Claude Code specific)

Produce complete files; do not output only snippets. The repository must be immediately runnable after npm install + npm run dev.
Use TypeScript strict mode where reasonable; add TODOs for edge features but implement the core game loop and basic operator set fully.
Keep graphics minimal (SVG / simple shapes) so the project remains lightweight for GitHub Pages.
For the procedural generator, include a simple deterministic algorithm that places extractors and receivers with connecting conveyors and a couple of operators forming a solvable path. Provide options for seed and difficulty.
Add a simple telemetry-free analytics toggle that records progress only in localStorage (for progression/unlock).
Include a minimal accessibility and keyboard control support (arrow keys to pan, +/- to zoom, number keys to select toolbar).
Provide an exportable level JSON format and importer in the admin panel.
Example user stories the app should cover (for generator)

As a new player, I start Tutorial Level 1: place conveyors from extractor(2) to receiver(expect 2). Objective: deliver 3 tokens of value 2.
As a player with ADD unlocked, I must combine two extractors (1 and 3) through ADD operator to produce 4 and deliver to receiver expecting 4.
As a player at intermediate difficulty, the level requires factorization: an extractor supplies 12 and a FactorOperator splits it into 3 and 2 tokens used elsewhere (explain operator outputs as sequential tokens).
Admin can set seed=1234, difficulty=2 and generate a reproducible level JSON.
README & deployment

README must contain exact commands:
npm install
npm run dev
npm run build
npm run deploy (hooked to gh-pages package) OR instructions how to enable GitHub Pages from the built /dist folder.
Include optional GitHub Action workflow file to auto-deploy on pushes to main.
Finish

After generating the repository, provide a short list of next recommended improvements (analytics export for teacher, multiplayer challenge mode, teacher/admin level editor, server optional sync). But do not implement them now.