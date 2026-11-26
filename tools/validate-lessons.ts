/**
 * Build-time check of every lesson file in apps/system-design/src/lessons.
 * Each lesson file default-exports a Lesson; index.ts (the catalog) is skipped.
 */
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateCatalog, type Lesson } from '@ss/lesson-engine';

const dir = resolve(import.meta.dirname, '../apps/system-design/src/lessons');
const files = (await readdir(dir)).filter(
  (f) => f.endsWith('.ts') && f !== 'index.ts' && !f.endsWith('.test.ts'),
);

if (files.length === 0) {
  console.error(`No lesson files found in ${dir}`);
  process.exit(1);
}

const lessons: Lesson[] = [];
for (const file of files) {
  const mod = (await import(pathToFileURL(join(dir, file)).href)) as { default?: Lesson };
  if (!mod.default) {
    console.error(`${file}: no default export`);
    process.exit(1);
  }
  lessons.push(mod.default);
}

const issues = validateCatalog(lessons);
if (issues.length > 0) {
  console.error(`Lesson validation failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`  • ${issue}`);
  process.exit(1);
}
console.log(`✓ ${lessons.length} lesson(s) valid: ${lessons.map((l) => l.slug).join(', ')}`);
