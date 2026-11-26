# AGENTS.md — Sketched courses

Guide for coding agents working in this repo. Read it fully before changing anything.

## What this is

A monorepo of **interactive course sites** that share one course shell and one UI, and plug in a visual engine. Each lesson is a short story told with an animated SVG scene: a problem appears, a technique fixes it, the numbers react, and the learner can break things on purpose.

| App                  | Site name         | Topic                | Engine                           | Break-it actions                                                           |
| -------------------- | ----------------- | -------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `apps/system-design` | Systems, Sketched | System design        | isometric diagram (infra preset) | kill a server, spike traffic, slow the database                            |
| `apps/finance`       | Money, Mapped     | Personal finance     | isometric diagram (money preset) | surprise bill, lose your income, rates rise, market crash, new money stops |
| `apps/forex`         | Pips, Plotted     | Forex trading basics | price chart                      | price moves against you, news spike, weekend gap, spread widens            |

- Static sites, **no backend** in v1. A Spring Boot API (accounts, synced progress) comes later. Do not add one.
- Each site's name and author live only in its `src/config.ts` (`SITE_NAME`, `AUTHOR_NAME`).
- **Finance and forex are education only.** Lessons teach general concepts with simplified or simulated numbers:
  - never personal advice, signals, product or broker recommendations, real tickers or live data;
  - the `notice` disclaimer in each config must stay on every lesson;
  - forex prices are always **simulated** from a seed.

### Originality rule (non-negotiable)

Never copy text, lesson content, illustrations, colours, CSS or code from any existing site (including designed-to-scale.vercel.app). All lesson wording, diagrams, charts and visual tokens must be original. Scheme, company and broker names in lessons must be fictional.

## Commands

Run from the repo root. Node 22+, pnpm 12.

| Command                                            | Use                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm install`                                     | Install everything                                                |
| `pnpm dev` · `pnpm dev:finance` · `pnpm dev:forex` | Dev servers at :5173 · :5174 · :5175                              |
| `pnpm build`                                       | Production build of every app → `apps/<app>/dist`                 |
| `pnpm test`                                        | Vitest in every package                                           |
| `pnpm lint`                                        | ESLint (flat config, typescript-eslint strict, react-hooks)       |
| `pnpm typecheck`                                   | `tsc` in every package and app                                    |
| `pnpm knip`                                        | Unused files, dependencies and exports                            |
| `pnpm format` / `pnpm format:check`                | Prettier                                                          |
| `pnpm validate`                                    | Check every app's lessons and that each `catalog.json` is current |
| `pnpm lessons`                                     | Validate **and regenerate** every `catalog.json`                  |
| `pnpm e2e`                                         | Playwright smoke tests for every app (desktop + mobile)           |

Single package: `pnpm --filter @ss/chart-engine test`. Names: `@ss/theme`, `@ss/ui`, `@ss/lesson-engine`, `@ss/diagram-engine`, `@ss/chart-engine`, `@ss/course`, `@ss/system-design`, `@ss/finance`, `@ss/forex`, `@ss/tools`.

## Definition of done

A change is done only when all of these pass. CI (`.github/workflows/ci.yml`) runs the same list, then `pnpm e2e`.

```bash
pnpm format:check && pnpm lint && pnpm knip && pnpm validate && pnpm typecheck && pnpm test && pnpm build
```

If you touched UI, routing, keyboard handling, an engine or a preset, also run `pnpm e2e`. Shared code affects **every** site, so check them all. Never claim something works without running these. Report failures with the real output.

## Repository layout

```
apps/<app>/                  one course site: config + lessons + strings, nothing else
  src/config.ts              SITE_NAME, AUTHOR_NAME, the CourseConfig, createCourseApp()
  src/main.tsx               mounts the app, imports the theme CSS
  src/i18n/en.json           this course's strings (hero, metric labels, actions, legend, notice)
  src/lessons/<slug>.ts      one lesson per file, default export, lazy-loaded
  src/lessons/chapters.ts    CHAPTERS (outline and order) + validateScene (engine checks)
  src/lessons/catalog.json   GENERATED by `pnpm lessons`, never hand-edit
  src/lessons/index.ts       catalog + lazy loaders (+ the app's lesson type alias)
  e2e/smoke.spec.ts          Playwright
packages/course/             shared site: shell, home, lesson page, search, progress, theme hooks, base strings
packages/ui/                 presentational React components + SceneStage (the one engine wrapper)
packages/lesson-engine/      generic Lesson/Step types, validator, diagramScene checks, catalog, progress, keyboard
packages/diagram-engine/     isometric SVG renderer, step diffs, shape library
  src/presets/infra.ts       system design metrics, scenarios, summary
  src/presets/money.ts       money metrics, scenarios, summary, formatMoney
packages/chart-engine/       price-chart SVG renderer, seeded prices, trading maths
  src/forex.ts               forex break-it scenarios and what each needs
  src/chart-scene.ts         chartScene lesson checks
packages/theme/              tokens.css (light + dark), base.css, fonts, theme-mode.ts
tools/validate-lessons.ts    checks every apps/*/src/lessons and writes catalogs
```

Packages export TypeScript source directly (`"exports": "./src/index.ts"`). There is no per-package build step; Vite compiles them.

## Architecture rules

1. **Engines never import React** or anything from `ui`, `course` or apps. Each exposes an imperative stage with the same shape: `goToStep`, `play`, `pause`, `replay`, `break`, `reset`, `onMetrics`, `setReducedMotion`, `destroy` (see `EngineStage` in `packages/ui/src/SceneStage.tsx`).
   - Diagram: `createStage(svg, { initial, changes }, { scenarios, summarize, formatValue, reducedMotion, scheduler })`.
   - Chart: `createChartStage(svg, { initial, changes }, { scenarios, reducedMotion, scheduler })`.
2. Lessons are generic: `Lesson<I, C, A>`, where `I` is the engine's starting scene, `C` its step diff and `A` its action names.
   - Diagram courses use `DiagramLesson<M, A>`.
   - Forex uses `ChartLesson` (`Lesson<ChartInitial, ChartChange, ForexAction>`).
3. `packages/ui/src/SceneStage.tsx` is the **only** React wrapper around an engine. It takes a `create(svg, reducedMotion)` function, so it does not know which engine it runs. `ui` components take plain props and `labels`, with no course-specific strings or thresholds.
4. `packages/course` is the whole site. An app only supplies a `CourseConfig<M, A, I, C>`:
   - content: catalog, chapters, `loadLesson`, home text;
   - the engine: `createStage(svg, scene, reducedMotion)` and `initialMetrics(initial)`;
   - the numbers: `metricTiles` (labels, formatting and warn/fail thresholds), `actionLabels`, `legend` (tones `request`, `response`, `failed`, `check`, `up`, `down`, `stop`, `target`);
   - optionally a `notice` and overrides for the shared strings.

   Don't copy pages into an app; extend `CourseConfig` instead.

5. Dependency direction: `theme` ← `ui` → `lesson-engine` → `diagram-engine`; `chart-engine` stands alone; `course` → `ui`, `lesson-engine`, `theme`; apps → `course` + their engine + `lesson-engine` + `theme`. Never the reverse. `ui` and `course` must not import any engine.
6. **A new course is a new app plus, if needed, a preset or engine.**
   1. Copy the closest app and change its name, port and favicon.
   2. Write the preset or engine, with unit tests.
   3. Write `config.ts`, `chapters.ts` (exporting `validateScene`) and the lessons.
   4. Add a smoke test, a `dev:<app>` script and a `.claude/launch.json` entry.
7. Scenarios are **deterministic**: pure functions of the step state and elapsed time. No `Math.random` and no wall-clock reads. Seeded randomness only in `seededRandom`. Time comes from an injectable `Scheduler`.
8. Rendering is SVG, never canvas/WebGL/three.js. Colours always come from theme CSS variables.

## Diagram engine facts

- Projection (`iso.ts`): `sx = (x − y)·cos30°·UNIT`, `sy = (x + y)·sin30°·UNIT − z·UNIT`, `UNIT = 26`. Node `x`/`y` are **floor grid cells**, not pixels. Depth order is `x + y`, then `z`.
- Each shape is a pure `(node) → markup` function in `shapes.ts`. To add a node kind:
  - add it to `NodeKind`, `SHAPES` and the palette map;
  - add a `--node-<kind>` / `--node-<kind>-soft` pair to `tokens.css` in all three theme blocks.
- Links are orthogonal floor routes (straight, or a Z split at the midpoint). Lay nodes out so routes don't cross blocks. The floor and viewBox cover every node in every step.
- **Stat pill:** if a node has `value`, the pill shows `formatValue(value)`. Otherwise, if it has `capacity`, the pill shows its load (request flows ÷ capacity). A jar's coin level is `value / capacity`.
- Flow kinds: `request` = the main thing moving, `response` = what comes back, `failed` = bounces back in red, `healthCheck` = muted pings.
- **Infra preset:**
  - `killServer` kills the second healthy server; its traffic fails for 3 s, then gets rerouted. With a single server, errors stay at 100%.
  - `spikeTraffic` applies 5× load.
  - `slowDatabase` adds latency scaled by `databaseShare()`.
- **Money preset** (one simulated month per second):
  - `loseIncome` drains the jar month by month, then turns the shortfall into debt.
  - `surpriseExpense` is a bill of 1.5 months of spending. The jar pays what it can, and the rest becomes debt.
  - `rateHike` adds 5 percentage points a year on `debt`.
  - `marketDrop` takes the first market node down 35%, then recovers it to +12%.
  - `newMoneyStops` collapses the scheme. Net worth drops by the stake on the node with id **`you`**.

## Chart engine facts

- Prices: `generateSeries` is a seeded random walk (`seed`, `volatility` pips per bar, `trend`) plus scripted `shocks` (`{ bar, pips, wick }`), so lessons control key moves exactly. Bars never gap, except when a scenario adds one.
- Steps are diffs:
  - `reveal` (never goes backwards) and `style` (`candles` | `line`);
  - `spread`, `showSpread`, `showVolume`, `highlight`;
  - `add`/`remove` for levels, notes and SMA indicators;
  - `leverage`, and `balance` (which also resets the drawdown baseline);
  - `position` (`{ side, lots, openBar, stopPips?, targetPips? }`, or `null`).
- Trading maths (`trading.ts`), on EUR/USD with a USD account:
  - Sizing: 1 lot = 100,000 units = $10 a pip.
  - Entry: buys fill at the ask (close + half the spread), sells at the bid.
  - Stops and targets are in pips from the entry. A stop gapped through fills at the bar's open.
  - Margin is `units × entry ÷ leverage`, and the broker stops you out at a **50% margin level**.
  - Every metric (balance, equity, open P&L, margin level, drawdown) is **computed** from the scene. Lessons never state metrics by hand.
- A bar can carry its own `spread`, so a spread spike only affects the bars it happens on.
- Revealing bars animates one bar at a time. Scenarios append new bars after the revealed ones, one every `BAR_MS` (250 ms):
  - `priceMovesAgainst`: about 98 pips against the trade over 14 bars.
  - `newsSpike`: a 45-pip candle with a long wick.
  - `weekendGap`: a 60-pip gap.
  - `spreadWidens`: a 12-pip spread for 4 bars.

  `FOREX_ACTION_NEEDS` says which need an open position.

- The scale fits every step of the lesson (the chart never jumps between steps). It only grows when a scenario leaves the range. Price tags on the axis are pushed apart (`placeTags`) so they never overlap.

## Writing or editing a lesson

1. Create `apps/<app>/src/lessons/<slug>.ts`. The file name must equal `slug` (kebab-case). Default-export a lesson typed with the app's lesson type.
2. Add the slug to its chapter in that app's `chapters.ts`. `lesson.chapter` must equal that chapter's `title`.
3. Run `pnpm lessons` and commit the regenerated `catalog.json` with the lesson.

Shared rules (`packages/lesson-engine/src/validate.ts`):

- At least one step, and a non-empty `youWillLearn`. Each item is `{ text, stepId }` and is ticked when the learner reaches that step.
- No repeated step ids. Tags must be one of the six. `body` paragraphs may contain only `<b>` and `<code>`; they are rendered without `dangerouslySetInnerHTML`.

Scene rules:

- **Diagram** (`diagramScene`):
  - Ids are unique, and diffs only remove or update things that exist. Remove a node's links before the node.
  - Every flow hop has a link.
  - Each break action is known, and its node kind is on stage.
- **Chart** (`chartScene`):
  - Reveals stay within the series and never go backwards.
  - Notes, highlights and positions sit on bars already revealed.
  - Lots and pips are positive.
  - Each break action is known, and actions that need one have an open position.

Content style:

- 7–12 steps, following problem → idea/solution → TRY IT → trade-off → recap.
- One idea per step, short sentences, concrete numbers, and a `keyIdea` on most steps. No filler, lorem ipsum or emoji.
- **Numbers must agree** with what the engine produces. For diagrams, compute them (loan payments, compound growth). For charts, generate the lesson and read the actual numbers per step and per scenario (open P&L, closes, fills) before writing them in the text. Changing a seed, shock or position changes the numbers, so re-check afterwards.
- `short` is one or two words. It shows under the stepper circle and on the Next button.
- After layout changes, look at the step at desktop and phone widths, in light and dark.

## Code conventions

- TypeScript `strict`, plus `noUncheckedIndexedAccess` and `verbatimModuleSyntax`. Use `import type` for types.
- No `any` and no non-null assertions (`!`); lint fails on both.
- No dead code, unused exports or placeholder components. knip enforces this; un-export anything that is only used internally.
- React 19: `ref` is a normal prop and context uses `<Context value>`. Don't call `setState` synchronously inside `useEffect`; derive state instead.
- Styling: CSS Modules plus design tokens only. No UI component library, no inline colour values, no gradients, glassmorphism or emoji. Radius 8/10/14 px; motion 150–350 ms with `var(--ease)`; buttons have a hard bottom shadow.
- Engine markup built as strings must escape any lesson text (`esc` in `chart-engine/src/render.ts`).
- Fonts: IBM Plex Mono for headings, labels, numbers and buttons; IBM Plex Sans for body text. Latin subsets only.
- Strings:
  - Shared UI strings live in `packages/course/src/i18n/en.json` and are read with `useCourse().t(key, vars)`.
  - Course strings live in each app's `src/i18n/en.json`.
  - Khmer (`km`) is planned and shows as "coming soon".

## Theme

- Tokens are in `packages/theme/src/tokens.css`. **Every token must be defined in three places**: `:root`, the `prefers-color-scheme: dark` block, and `:root[data-theme='dark']`.
- Charts use the existing tokens: up candles are hollow with an `--accent` outline, down candles are filled `--fail`. Shape, not only colour, tells them apart.
- `ss:theme` and `ss:progress` live in `localStorage`. Each site runs on its own origin, so they don't collide.
- Contrast: text ≥ 4.5:1, graphics ≥ 3:1, in both themes.

## Accessibility and performance bar

- WCAG AA, full keyboard use, visible focus, an `aria-label` on every icon-only button, and support for `prefers-reduced-motion` (no packets or animated reveals; diagram scenarios still tick their metrics, chart scenarios jump to their result).
- Each stage SVG has `role="img"` and an `aria-label` summary. A debounced live region announces changes.
- Keyboard: `←`/`→` change step, `R` replays, `Space` pauses, `⌘K`/`Ctrl K` opens search.
- Initial JS ≤ 150 KB gzipped per app (about 104 KB now). Each lesson stays a separate lazy chunk. Lighthouse ≥ 95 for Performance and Accessibility.

## Testing

- **Diagram engine**: projection, depth sort, diffs, each preset's scenarios, and the stage with a manual `Scheduler` (happy-dom).
- **Chart engine**:
  - seeded series and shocks, scene diffs, trading maths (spread cost, stop, target, margin call);
  - each scenario, `chartScene`, render helpers, and the stage with a manual `Scheduler`.
- **Lesson engine**: validator, `diagramScene`, outline/catalog, progress, keyboard mapping. **Course**: `search.test.ts`.
- **Playwright**, per app (previews on :4173 system design, :4175 finance, :4176 forex):
  - System design: kill a server → errors rise, then return to 0%; progress; ⌘K search.
  - Finance: lose your income → debt; the fund absorbs a bill; a scheme collapse removes your stake.
  - Forex: 500:1 leverage → margin call to $434; a planned trade hits its target for +$600; a spread spike stops out a tight stop.
  - Wait for the lesson heading before pressing keys, and use `exact: true` for button names.
- Add or extend tests with every behaviour change.

## Gotchas

- **TypeScript is pinned to `~6.0`** because typescript-eslint doesn't support TS 7 yet.
- `catalog.json` is generated. Editing a lesson without running `pnpm lessons` fails `pnpm validate` in CI.
- `LessonPage` keeps `targetRef` so quick repeated arrow presses aren't lost. Keep that pattern if you touch navigation.
- In the stop-loss lesson, a closed trade's profit only carries into the next position if the step sets `balance`. Opening a new position replaces the old one.
- Dev preview configs live in `.claude/launch.json`. A hidden browser pane pauses `requestAnimationFrame`, so check scenarios with Playwright when the pane is hidden.
- Hosting: each app is a static SPA with its own `vercel.json` and `public/_redirects`. Deploying is a human decision; don't deploy without being asked.

## Working agreement

- Before coding a sizeable change, list the files you'll create or edit, then build.
- If something is ambiguous, state your assumption in one line and continue. Ask first only before deleting data or changing a decision recorded in this file.
- Keep commits small and focused, one logical step each. Commit only when asked.
- When reporting, use: **Files** · **Assumptions** · **Concerns** · **Tests result** · **Next step**.
- Out of scope for v1: accounts, backend, comments, quizzes, a "Design Lab", live market data, order execution of any kind.
