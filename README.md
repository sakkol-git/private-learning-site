# Systems, Sketched

An interactive system design course. Each lesson is a short story told with an animated isometric diagram: a problem appears, a technique fixes it, and the numbers react. Learners can break things on purpose and watch what happens.

## Commands

| Command                                      | What it does                                                  |
| -------------------------------------------- | ------------------------------------------------------------- |
| `pnpm install`                               | Install everything (Node 22+, pnpm 12)                        |
| `pnpm dev`                                   | Run the site at http://localhost:5173                         |
| `pnpm build`                                 | Production build into `apps/system-design/dist`               |
| `pnpm test`                                  | Unit tests (Vitest) for every package                         |
| `pnpm lint` · `pnpm typecheck` · `pnpm knip` | ESLint, strict TypeScript, unused code and exports            |
| `pnpm validate`                              | Check every lesson file and that `catalog.json` is current    |
| `pnpm lessons`                               | Validate and regenerate `catalog.json` after editing a lesson |
| `pnpm --filter @ss/system-design e2e`        | Playwright smoke tests (desktop + mobile)                     |

## Layout

```
apps/system-design      the site: routes, pages, shell, lessons
  src/lessons/*.ts      one lesson per file (lazy-loaded)
  src/lessons/chapters.ts   course outline and order
packages/theme          Stone & Teal tokens (light/dark), fonts, theme mode
packages/ui             shared React components and the DiagramStage wrapper
packages/lesson-engine  lesson types, validation, catalog, progress, keyboard
packages/diagram-engine framework-free SVG renderer, step diffs, simulation
tools/validate-lessons.ts   build-time lesson checks + catalog generation
```

## Writing a lesson

1. Add `apps/system-design/src/lessons/<slug>.ts` that default-exports a `Lesson`.
2. Add the slug to a chapter in `chapters.ts`.
3. Run `pnpm lessons`. It fails on broken ids, links between missing nodes, flows that hop between unlinked nodes, removals of things that do not exist, or disallowed markup.

Each step's `change` is a diff from the previous step. Node `x`/`y` are floor grid cells. Give servers, caches and databases a `capacity` (requests per second) to show a live load pill.

## Before launch

- Set `AUTHOR_NAME` (and `SITE_NAME` if renaming) in `apps/system-design/src/config.ts`.
- Deploy `apps/system-design` as a static site. `vercel.json` (Vercel) and `public/_redirects` (Cloudflare Pages) already route every path to `index.html`.
