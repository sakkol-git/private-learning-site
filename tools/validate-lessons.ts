/**
 * Build-time check of every lesson in apps/system-design/src/lessons.
 *
 *   tsx validate-lessons.ts          validate, and fail if catalog.json is stale
 *   tsx validate-lessons.ts --write  validate and regenerate catalog.json
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  orderCatalog,
  toCatalogEntry,
  validateCatalog,
  validateOutline,
  type Chapter,
  type Lesson,
} from '@ss/lesson-engine';

const dir = resolve(import.meta.dirname, '../apps/system-design/src/lessons');
const catalogPath = join(dir, 'catalog.json');
const NOT_LESSONS = new Set(['chapters.ts', 'index.ts']);
const write = process.argv.includes('--write');

function fail(lines: string[]): never {
  for (const line of lines) console.error(line);
  process.exit(1);
}

const files = (await readdir(dir)).filter(
  (f) => f.endsWith('.ts') && !NOT_LESSONS.has(f) && !f.endsWith('.test.ts'),
);
if (files.length === 0) fail([`No lesson files found in ${dir}`]);

const lessons: Lesson[] = [];
for (const file of files) {
  const mod = (await import(pathToFileURL(join(dir, file)).href)) as { default?: Lesson };
  if (!mod.default) fail([`${file}: no default export`]);
  if (`${mod.default.slug}.ts` !== file)
    fail([`${file}: slug "${mod.default.slug}" must match the file name`]);
  lessons.push(mod.default);
}
const { CHAPTERS } = (await import(pathToFileURL(join(dir, 'chapters.ts')).href)) as {
  CHAPTERS: Chapter[];
};

const issues = [...validateCatalog(lessons), ...validateOutline(CHAPTERS, lessons)];
if (issues.length > 0)
  fail([
    `Lesson validation failed with ${issues.length} issue(s):`,
    ...issues.map((i) => `  • ${i}`),
  ]);

const catalog = `${JSON.stringify(orderCatalog(CHAPTERS, lessons.map(toCatalogEntry)), null, 2)}\n`;
if (write) {
  await writeFile(catalogPath, catalog);
} else {
  const current = await readFile(catalogPath, 'utf8').catch(() => '');
  if (current !== catalog) fail(['catalog.json is out of date. Run: pnpm lessons']);
}
console.log(`✓ ${lessons.length} lesson(s) valid: ${lessons.map((l) => l.slug).join(', ')}`);
