/**
 * Build-time check of every course in apps/<app>/src/lessons.
 *
 *   tsx validate-lessons.ts          validate, and fail if any catalog.json is stale
 *   tsx validate-lessons.ts --write  validate and regenerate catalog.json files
 *
 * Each lessons folder has one file per lesson (default export) and a chapters.ts
 * exporting CHAPTERS (the outline) and validateScene (the engine's scene checks).
 */
import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  orderCatalog,
  toCatalogEntry,
  validateCatalog,
  validateOutline,
  type Chapter,
  type Lesson,
  type SceneValidator,
} from '@ss/lesson-engine';

const appsDir = resolve(import.meta.dirname, '../apps');
const NOT_LESSONS = new Set(['chapters.ts', 'index.ts']);
const write = process.argv.includes('--write');

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

async function checkCourse(app: string): Promise<string[]> {
  const dir = join(appsDir, app, 'src/lessons');
  const files = (await readdir(dir)).filter(
    (f) => f.endsWith('.ts') && !NOT_LESSONS.has(f) && !f.endsWith('.test.ts'),
  );
  if (files.length === 0) return [`${app}: no lesson files in ${dir}`];

  const issues: string[] = [];
  const lessons: Lesson[] = [];
  for (const file of files) {
    const mod = (await import(pathToFileURL(join(dir, file)).href)) as { default?: Lesson };
    if (!mod.default) issues.push(`${file}: no default export`);
    else if (`${mod.default.slug}.ts` !== file) {
      issues.push(`${file}: slug "${mod.default.slug}" must match the file name`);
    } else lessons.push(mod.default);
  }
  const outline = (await import(pathToFileURL(join(dir, 'chapters.ts')).href)) as {
    CHAPTERS: Chapter[];
    validateScene?: SceneValidator<unknown, unknown>;
  };
  if (!outline.validateScene) issues.push('chapters.ts does not export validateScene');
  issues.push(
    ...validateCatalog(lessons, outline.validateScene ? { scene: outline.validateScene } : {}),
    ...validateOutline(outline.CHAPTERS, lessons),
  );
  if (issues.length > 0) return issues.map((i) => `${app}: ${i}`);

  const catalogPath = join(dir, 'catalog.json');
  const catalog = `${JSON.stringify(orderCatalog(outline.CHAPTERS, lessons.map(toCatalogEntry)), null, 2)}\n`;
  if (write) await writeFile(catalogPath, catalog);
  else if ((await readFile(catalogPath, 'utf8').catch(() => '')) !== catalog) {
    return [`${app}: catalog.json is out of date. Run: pnpm lessons`];
  }
  console.log(
    `✓ ${app}: ${lessons.length} lesson(s) valid: ${lessons.map((l) => l.slug).join(', ')}`,
  );
  return [];
}

const apps: string[] = [];
for (const app of await readdir(appsDir)) {
  if (await exists(join(appsDir, app, 'src/lessons/chapters.ts'))) apps.push(app);
}
const issues = (await Promise.all(apps.map(checkCourse))).flat();
if (issues.length > 0) {
  console.error(`Lesson validation failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`  • ${issue}`);
  process.exit(1);
}
