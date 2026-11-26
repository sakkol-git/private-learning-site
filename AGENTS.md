# AGENTS.md — Sketched courses

Guide for coding agents working in this repo. Read it fully before changing anything.

## What this is

A monorepo of **interactive course sites** that share one course shell and one UI, and plug in a visual engine. Each lesson is a short story told with an animated SVG scene: a problem appears, a technique fixes it, the numbers react, and the learner can break things on purpose.

| App                  | Site name         | Topic                  | Engine                              | Break-it actions                                                           |
| -------------------- | ----------------- | ---------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `apps/system-design` | Systems, Sketched | System design          | isometric diagram (infra preset)    | kill a server, spike traffic, slow the database                            |
| `apps/finance`       | Money, Mapped     | Personal finance       | isometric diagram (money preset)    | surprise bill, lose your income, rates rise, market crash, new money stops |
| `apps/forex`         | Pips, Plotted     | Forex trading basics   | price chart                         | price moves against you, news spike, weekend gap, spread widens            |
| `apps/stocks`        | Shares, Sketched  | Stock market basics    | price chart (stock market)          | earnings surprise, market sell-off, company collapses, short squeeze       |
| `apps/internet`      | Wires, Sketched   | How the internet works | isometric diagram (network preset)  | a router fails, DNS goes down, packets get lost, DDoS attack               |
| `apps/security`      | Locks, Sketched   | Everyday cybersecurity | isometric diagram (security preset) | a website leaks passwords, click the phishing link, ransomware strikes     |
| `apps/business`      | Business, Mapped  | How a business runs    | isometric diagram (business preset) | supplier is late, demand spikes, customers pay late                        |

- Static sites, **no backend** in v1. A Spring Boot API (accounts, synced progress) comes later. Do not add one.
- Each site's name and author live only in its `src/config.ts` (`SITE_NAME`, `AUTHOR_NAME`).
- **Finance, forex and stocks are education only.** Lessons teach general concepts with simplified or simulated numbers:
  - never personal advice, signals, product or broker recommendations, real tickers or live data;
  - the `notice` disclaimer in each config must stay on every lesson;
  - chart prices are always **simulated** from a seed, and companies, tickers and indexes are fictional;
  - market rules (margin, maintenance, fees) are labelled as simplified international examples, not any one country's rules.

### Originality rule (non-negotiable)

Never copy text, lesson content, illustrations, colours, CSS or code from any existing site (including designed-to-scale.vercel.app). All lesson wording, diagrams, charts and visual tokens must be original. Scheme, company and broker names in lessons must be fictional.

## Commands

Run from the repo root. Node 22+, pnpm 12.

| Command                                                                         | Use                                                               |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm install`                                                                  | Install everything                                                |
| `pnpm dev` · `dev:<app>` (finance, forex, stocks, internet, security, business) | Dev servers at :5173, then :5174–:5179 in that order              |
| `pnpm build`                                                                    | Production build of every app → `apps/<app>/dist`                 |
| `pnpm test`                                                                     | Vitest in every package                                           |
| `pnpm lint`                                                                     | ESLint (flat config, typescript-eslint strict, react-hooks)       |
| `pnpm typecheck`                                                                | `tsc` in every package and app                                    |
| `pnpm knip`                                                                     | Unused files, dependencies and exports                            |
| `pnpm format` / `pnpm format:check`                                             | Prettier                                                          |
| `pnpm validate`                                                                 | Check every app's lessons and that each `catalog.json` is current |
| `pnpm lessons`                                                                  | Validate **and regenerate** every `catalog.json`                  |
| `pnpm e2e`                                                                      | Playwright smoke tests for every app (desktop + mobile)           |

Single package: `pnpm --filter @ss/chart-engine test`. Names: `@ss/theme`, `@ss/ui`, `@ss/lesson-engine`, `@ss/diagram-engine`, `@ss/chart-engine`, `@ss/course`, `@ss/system-design`, `@ss/finance`, `@ss/forex`, `@ss/stocks`, `@ss/internet`, `@ss/security`, `@ss/business`, `@ss/tools`.

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
  src/presets/network.ts     page-load metrics; router, DNS, packet-loss and DDoS scenarios
  src/presets/security.ts    account/file metrics; breach, phishing and ransomware scenarios
  src/presets/business.ts    stock/cash metrics; supplier, demand and payment scenarios
packages/chart-engine/       price-chart SVG renderer, seeded prices, trading maths for any market
  src/market.ts              how moves become prices: pips (forex) or percent (stocks)
  src/trading.ts             tradeLevels, evaluateFx, evaluateStock, stockOrderIssue
  src/scenario.ts            playMoves: shared machinery for break-it scenarios
  src/forex.ts · stocks.ts   each market's break-it scenarios and which need an open position
  src/chart-scene.ts         chartScene(scenarios, needsPosition) lesson checks
packages/theme/              tokens.css (light + dark), base.css, fonts, theme-mode.ts
tools/validate-lessons.ts    checks every apps/*/src/lessons and writes catalogs
```

Packages export TypeScript source directly (`"exports": "./src/index.ts"`). There is no per-package build step; Vite compiles them.

## Architecture rules

1. **Engines never import React** or anything from `ui`, `course` or apps. Each exposes an imperative stage with the same shape: `goToStep`, `play`, `pause`, `replay`, `break`, `reset`, `onMetrics`, `setReducedMotion`, `destroy` (see `EngineStage` in `packages/ui/src/SceneStage.tsx`).
   - Diagram: `createStage(svg, { initial, changes }, { scenarios, summarize, formatValue, reducedMotion, scheduler })`.
   - Chart: `createChartStage(svg, { initial, changes }, { evaluate, describe, scenarios, reducedMotion, scheduler })`, where `evaluate` is `evaluateFx` or `evaluateStock`.
2. Lessons are generic: `Lesson<I, C, A>`, where `I` is the engine's starting scene, `C` its step diff and `A` its action names.
   - Diagram courses use `DiagramLesson<M, A>`.
   - Forex uses `ChartLesson` (`Lesson<FxInitial, ChartChange, ForexAction>`), stocks `StockLesson` (`Lesson<StockInitial, ChartChange, StockAction>`).
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
- **Network preset:**
  - `routerFails` takes down the busiest router the network can route around, or the busiest overall. Its requests fail for 2 s, then reroute along the shortest remaining path (`routeAround`); extra hops add round-trip and page-load time.
  - `dnsOutage` fails every request that passes through a `dns` node.
  - `packetLoss` degrades the busiest router: +4% loss and roughly double page load.
  - `ddos` sends 20× all traffic from each `attacker` to the first `server`. A `shield` or `cdn` on the path absorbs it.
- **Security preset** (conventions: accounts are `service` nodes; the same `tag` means the same password; a `shield` on the attacker's path is 2FA; the `inbox` resets linked accounts; backups are `database` nodes, and `tag: 'offline'` survives):
  - `siteBreach` exposes the first tagged account, then every account with the same tag that the attacker reaches without a shield.
  - `phishingClick` steals the inbox, then resets every account linked to it.
  - `ransomware` locks devices and online backups. With an offline backup, files restore after 2.5 s and recovery is 1 day; without one, 30 days and a $1,500 ransom.
- **Business preset** (one simulated day per second; request flows are goods per day, response flows are money per day; the `warehouse` `value` is stock):
  - `supplierDelay` stops the first supplier for 6 days. Other suppliers send up to their `capacity`, and the warehouse drains and then misses orders.
  - `demandSpike` multiplies sales 2.5× for 5 days, limited by stock.
  - `latePayments` stops incoming money for 10 days, after which the backlog is paid.

## Chart engine facts

- One engine, two markets. `ChartInitial` is `FxInitial` (`market: 'fx'`, `pip`, account `{ balance, leverage }`) or `StockInitial` (`market: 'stock'`, `company`, optional `others` tickers, account `{ cash, marginPct, maintenancePct, commission }`).
- **Move units:** pips for forex, **percent** for stocks. Volatility, trend, shocks, stop and target distances, and scenario moves all use them. Spreads are in ticks: pips for forex, cents for stocks. Prices show 5 decimals (forex) or 2 (stocks).
- Prices: `generateSeries` is a seeded random walk plus scripted `shocks` (`{ bar, move, wick }`), so lessons control key moves exactly. Bars never gap, except when a scenario adds one.
- Steps are diffs:
  - `reveal` (never goes backwards), `style` (`candles` | `line`), `compare` (stocks: plot the main ticker and `others` as % change from the first bar);
  - `spread`, `showSpread`, `showVolume`, `highlight`;
  - `add`/`remove` for levels, notes and SMA indicators;
  - forex: `leverage`, `balance` (resets the drawdown baseline); stocks: `cash` (resets the baseline), `marginPct`;
  - `position` (`{ side, size, openBar, stop?, target?, symbol? }`, or `null`). `size` is lots for forex and shares for stocks; `symbol` can pick one of `others`.
- Trading maths (`trading.ts`):
  - **Shared:** entry at the ask for buys and the bid for sells. Stops, targets and forced closes are checked bar by bar, and a level gapped through fills at the bar's open.
  - **Forex** (EUR/USD, USD account): 1 lot = 100,000 units = $10 a pip. Margin = `units × entry ÷ leverage`, with a stop-out at a **50% margin level**.
  - **Stocks:** a $`commission` is charged at open and at close.
    - `marginPct` 100 is a cash account; 50 lets you borrow half. Cash goes negative when borrowing.
    - Forced close when equity ÷ position value falls to `maintenancePct`: for longs on borrowed money, and for every short. Shorting needs a margin account.
    - `stockOrderIssue` rejects positions the account cannot afford.
  - Every metric is **computed** from the scene. Lessons never state metrics by hand. Forex: balance, equity, open P&L, margin level, drawdown. Stocks: portfolio value, cash, P&L, return, drawdown.
- A bar can carry its own `spread`, so a spread spike only affects the bars it happens on.
- Revealing bars animates one bar at a time. Scenarios append new bars after the revealed ones, one every `BAR_MS` (250 ms); comparison series move too:
  - **Forex:** `priceMovesAgainst` (about 98 pips against), `newsSpike` (a 45-pip candle with a long wick), `weekendGap` (a 60-pip gap), `spreadWidens` (a 12-pip spread for 4 bars).
  - **Stocks:** `earningsGap` (a 20% overnight gap against the trade), `marketSelloff` (about −19% for the stock, −11% for the index), `companyCollapse` (about −88% for the stock, under 1% for the index), `shortSqueeze` (the price roughly doubles in 6 days).
  - `FOREX_NEEDS_POSITION` / `STOCK_NEEDS_POSITION` say which need an open trade.
- The scale fits every step of the lesson, with separate scales for price and comparison steps, so the chart never jumps between steps. It only grows when a scenario leaves the range. Price tags are pushed apart (`placeTags`) so they never overlap. Compare mode draws lines and % tags only, with no candles or trade lines.

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
  - Sizes and distances are positive; a stock account can afford each position, and shorts need a margin account.
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
  - seeded series and shocks, scene diffs, forex and stock trading maths (spread, fees, stop, target, margin calls, shorts, affordability);
  - each scenario, `chartScene`, render helpers, and the stage with a manual `Scheduler`.
- **Lesson engine**: validator, `diagramScene`, outline/catalog, progress, keyboard mapping. **Course**: `search.test.ts`.
- **Playwright**, per app (previews on :4173 system design, :4175 finance, :4176 forex, :4177 stocks, :4178 internet, :4179 security, :4180 business):
  - System design: kill a server → errors rise, then return to 0%; progress; ⌘K search.
  - Finance: lose your income → debt; the fund absorbs a bill; a scheme collapse removes your stake.
  - Forex: 500:1 leverage → margin call to $434; a planned trade hits its target for +$600; a spread spike stops out a tight stop.
  - Stocks: a company collapse takes a single-stock holding to $1,577 but the index holding only to $9,936; an earnings gap stops out at −$256; a short squeeze ends in a −$5,911 margin call.
  - Internet: a router failure drops to 0% and recovers to 100% with 5 hops; a DNS outage leaves 83.3%; a DDoS leaves 9.5% until scrubbing restores 100%.
  - Security: a reused password loses all 4 accounts and $2,400; 2FA keeps 2 of 4 and $0; an offline backup restores files in 1 day.
  - Business: lean stock misses every order and costs $2,500; a week of buffer ends with 20 units; a second supplier keeps 100% filled; late payments push cash to −$8,000.
  - Wait for the lesson heading before pressing keys, and use `exact: true` for button names.
- Add or extend tests with every behaviour change.

## Gotchas

- **TypeScript is pinned to `~6.0`** because typescript-eslint doesn't support TS 7 yet.
- `catalog.json` is generated. Editing a lesson without running `pnpm lessons` fails `pnpm validate` in CI.
- `LessonPage` keeps `targetRef` so quick repeated arrow presses aren't lost. Keep that pattern if you touch navigation.
- A closed trade's profit only carries into the next position if the step sets `balance` (forex) or `cash` (stocks). Opening a new position replaces the old one.
- Dev preview configs live in `.claude/launch.json`. A hidden browser pane pauses `requestAnimationFrame`, so check scenarios with Playwright when the pane is hidden.
- Hosting: each app is a static SPA with its own `vercel.json` and `public/_redirects`. Deploying is a human decision; don't deploy without being asked.

## Working agreement

- Before coding a sizeable change, list the files you'll create or edit, then build.
- If something is ambiguous, state your assumption in one line and continue. Ask first only before deleting data or changing a decision recorded in this file.
- Keep commits small and focused, one logical step each. Commit only when asked.
- When reporting, use: **Files** · **Assumptions** · **Concerns** · **Tests result** · **Next step**.
- Out of scope for v1: accounts, backend, comments, quizzes, a "Design Lab", live market data, order execution of any kind.
