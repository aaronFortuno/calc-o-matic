# calc-o-matic

> A Beltmatic-inspired educational math puzzle game that runs entirely in your browser. Build conveyor belt networks, route numeric tokens through math operators, and solve progressively harder puzzles — no install, no server, no fuss. Try it [https://aaronfortuno.github.io/calc-o-matic/](here)

---

## What is this?

**calc-o-matic** is a factory-style math game where you place components on an infinite grid:

- **Extractors** that emit numeric tokens
- **Conveyor belts** that route those tokens around the board
- **Operator nodes** (ADD, MUL, SQRT, FACTOR…) that transform numbers
- **Receivers** that validate results and complete objectives

Complete objectives to earn XP, unlock advanced operators, and tackle increasingly complex math puzzles — all without leaving the browser tab.

---

## Features

- Tile-based factory puzzle gameplay inspired by Beltmatic
- Discrete tick simulation (1–60 ticks/sec, adjustable) with smooth token animation between ticks
- 6 tutorial levels covering conveyor basics, ADD, MUL, SUB, DIV, and chained operators
- Progressive operator unlocks (start with ADD/MUL, unlock SQRT, FACTOR, IS_PRIME, and more)
- Procedural level generator with 5 difficulty tiers (D0–D4), diverse operator templates, and seeded RNG
- Level completion awards XP with a completion modal and automatic progression
- In-app admin / config panel for level authoring, export/import, and save slots
- Animated conveyor belts with directional indicators
- Infinite (virtualized) canvas grid with pan & zoom
- Keyboard controls: arrow keys to pan, `+`/`-` to zoom, number keys to select tools
- Persistent player profile via localStorage (no account required)
- i18n-ready (English default; add new languages easily)
- Deployable to GitHub Pages with one command

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite |
| State | Zustand |
| Grid rendering | HTML5 Canvas |
| UI overlays | React + Tailwind CSS |
| i18n | i18next + react-i18next |
| Persistence | localStorage |
| Testing | Vitest + Testing Library |
| Deployment | gh-pages / GitHub Actions |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run tests

```bash
npm run test
```

Or open the Vitest UI:

```bash
npm run test:ui
```

### Build for production

```bash
npm run build
```

The output lands in `/dist`.

---

## Deploy to GitHub Pages

### Option A — manual (npm script)

```bash
npm run deploy
```

This runs `gh-pages -d dist` after a fresh build and pushes to the `gh-pages` branch of your repository.

Make sure your repository settings point GitHub Pages to the `gh-pages` branch.

### Option B — automatic (GitHub Actions)

The workflow file at `.github/workflows/gh-pages.yml` auto-deploys on every push to `main`. Enable GitHub Pages in your repo settings (source: GitHub Actions) and it will handle the rest.

---

## Admin Panel

The admin panel lets you:

- Set the procedural generator **seed** and **difficulty**
- Adjust **tick speed**
- **Export** the current level to JSON
- **Import** a previously saved level JSON

### How to open it

1. Press the hidden toggle (bottom-right corner, or navigate to `/#admin`)
2. Enter the passphrase stored in localStorage under `calc-o-matic:adminPass` (default: `admin`)

### Generate a reproducible level

In the admin panel, set:
- **Seed**: `1234`
- **Difficulty**: `2`

Click **Generate** to produce a deterministic puzzle.

---

## Adding a Translation

1. Copy `src/i18n/en.json` to `src/i18n/{lang}.json` (e.g., `es.json`)
2. Translate all string values (keep the keys identical)
3. Register the new language in `src/i18n/index.ts`:

```ts
import es from './es.json';

i18next.init({
  resources: {
    en: { translation: en },
    es: { translation: es },   // add this line
  },
  // ...
});
```

4. Optionally add a language selector component to the HUD.

---

## Adding a New Operator

1. Add a new value to the `OperatorType` enum in `src/engine/entities/types.ts`
2. Implement a class extending `BaseOperator` in `src/engine/entities/operator.ts`
3. Set an unlock XP threshold in `src/store/playerStore.ts`
4. Add translation keys to `src/i18n/en.json` (name + tooltip)
5. Write a unit test in `src/tests/engine/operator.test.ts`

---

## Level JSON Format

Levels are exported and imported as plain JSON:

```json
{
  "version": 1,
  "seed": 1234,
  "difficulty": 2,
  "entities": [
    { "id": "e1", "type": "EXTRACTOR", "position": { "x": 0, "y": 0 }, "data": { "value": 2, "period": 3 } },
    { "id": "c1", "type": "CONVEYOR",  "position": { "x": 1, "y": 0 }, "data": { "direction": "RIGHT" } },
    { "id": "r1", "type": "RECEIVER",  "position": { "x": 2, "y": 0 }, "data": { "expected": 2, "required": 3 } }
  ],
  "objectives": [
    { "receiverId": "r1", "description": "Deliver 3 tokens of value 2" }
  ]
}
```

Use the admin panel's **Export** button or call `serializer.exportLevel()` programmatically.

---

## Roadmap (post-MVP)

- Analytics export for teacher dashboards
- Multiplayer challenge mode
- Visual drag-and-drop level editor for teachers
- Optional cloud save / server sync

---

## License

MIT
