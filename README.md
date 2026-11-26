# Sketched courses

Interactive course sites built on one shared course shell and two visual engines (isometric diagrams and price charts for forex and stocks). Each lesson is a short story told with an animated scene: a problem appears, a technique fixes it, and the numbers react. Learners can break things on purpose and watch what happens.

| App                  | Site              | Topic                                                                                                          |
| -------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `apps/system-design` | Systems, Sketched | System design: requests, scaling, load balancing, caching, replication                                         |
| `apps/finance`       | Money, Mapped     | Financial education: budgeting, emergency funds, debt, compound growth, scams                                  |
| `apps/forex`         | Pips, Plotted     | Forex basics on simulated charts: candles, pips and lots, spread, stops, leverage                              |
| `apps/stocks`        | Shares, Sketched  | Stock market basics on simulated charts: shares, costs, trends, earnings, diversification, margin and shorting |
| `apps/internet`      | Wires, Sketched   | How the internet works: packets, routing, DNS, latency, CDNs, DDoS                                             |
| `apps/security`      | Locks, Sketched   | Everyday cybersecurity: passwords, password managers, 2FA, phishing, ransomware and backups                    |
| `apps/business`      | Business, Mapped  | How a business runs: supply chains, safety stock, suppliers, demand spikes, cash flow                          |

## Commands

| Command                                      | What it does                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm install`                               | Install everything (Node 22+, pnpm 12)                                                                  |
| `pnpm dev` · `pnpm dev:<app>`                | Run a site: system design at :5173; finance, forex, stocks, internet, security, business at :5174–:5179 |
| `pnpm build`                                 | Production builds into `apps/<app>/dist`                                                                |
| `pnpm test`                                  | Unit tests (Vitest) for every package                                                                   |
| `pnpm lint` · `pnpm typecheck` · `pnpm knip` | ESLint, strict TypeScript, unused code and exports                                                      |
| `pnpm validate`                              | Check every lesson and that each `catalog.json` is current                                              |
| `pnpm lessons`                               | Validate and regenerate catalogs after editing a lesson                                                 |
| `pnpm e2e`                                   | Playwright smoke tests for every app (desktop + mobile)                                                 |

## Layout

```
apps/<app>              a course: config, lessons, strings
packages/course         the shared site: shell, home, lesson page, search, progress
packages/ui             shared React components and the DiagramStage wrapper
packages/lesson-engine  generic lesson types, validation, catalog, progress, keyboard
packages/diagram-engine isometric SVG renderer, shapes, and presets (infra, money, network, security, business)
packages/chart-engine   price-chart SVG renderer, seeded prices, forex and stock trading maths and scenarios
packages/theme          Stone & Teal tokens (light/dark), fonts, theme mode
tools/validate-lessons.ts   build-time lesson checks + catalog generation
```

## Writing a lesson

1. Add `apps/<app>/src/lessons/<slug>.ts` that default-exports a lesson typed with the app's lesson type.
2. Add the slug to a chapter in that app's `chapters.ts`.
3. Run `pnpm lessons`. It fails on broken ids, links between missing nodes, flows that hop between unlinked nodes, removals of things that do not exist, unknown break actions, or disallowed markup.

See [AGENTS.md](AGENTS.md) for the full engine, preset and lesson rules, including how to add a new course.

## Before launch

- Set `AUTHOR_NAME` (and `SITE_NAME` if renaming) in each `apps/<app>/src/config.ts`.
- Deploy each app as its own static site. `vercel.json` (Vercel) and `public/_redirects` (Cloudflare Pages) already route every path to `index.html`.
