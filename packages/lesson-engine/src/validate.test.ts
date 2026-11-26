import { describe, expect, it } from 'vitest';
import type { Lesson, Step } from './types';
import { validateCatalog, validateLesson } from './validate';

const STEP: Step = {
  id: 's1',
  short: 'Start',
  tag: 'PROBLEM',
  title: 'Start',
  body: ['One <b>server</b> runs <code>app.js</code>.'],
  change: { flows: [{ route: ['users', 'web'], kind: 'request', ratePerSec: 5 }] },
};

function lesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    slug: 'demo',
    chapter: 'Basics',
    title: 'Demo',
    summary: 'A demo lesson.',
    minutes: 3,
    level: 'beginner',
    youWillLearn: [{ text: 'Something', stepId: 's1' }],
    initial: {
      nodes: [
        { id: 'users', kind: 'users', label: 'Users', x: 0, y: 0 },
        { id: 'web', kind: 'server', label: 'Web', x: 4, y: 0 },
      ],
      links: [{ id: 'u-web', from: 'users', to: 'web' }],
      metrics: { users: 10, requestsPerSec: 5, p95LatencyMs: 50, errorRatePct: 0, healthy: [1, 1] },
    },
    steps: [STEP],
    ...overrides,
  };
}

describe('validateLesson', () => {
  it('accepts a valid lesson', () => {
    expect(validateLesson(lesson())).toEqual([]);
  });

  it('fails on no steps and empty youWillLearn', () => {
    const issues = validateLesson(lesson({ steps: [], youWillLearn: [] }));
    expect(issues).toContain('demo lesson: has no steps');
    expect(issues).toContain('demo lesson: youWillLearn is empty');
  });

  it('fails when a link references a missing node', () => {
    const base = lesson();
    const issues = validateLesson({
      ...base,
      initial: { ...base.initial, links: [{ id: 'x', from: 'users', to: 'db' }] },
    });
    expect(issues).toContain('demo initial: link "x" references missing node "db"');
  });

  it('fails when a flow references a missing node or an unlinked hop', () => {
    const base = lesson();
    const step = STEP;
    const issues = validateLesson({
      ...base,
      initial: {
        ...base.initial,
        nodes: [...base.initial.nodes, { id: 'db', kind: 'database', label: 'DB', x: 8, y: 0 }],
      },
      steps: [
        {
          ...step,
          change: {
            flows: [{ route: ['users', 'web', 'db', 'ghost'], kind: 'request', ratePerSec: 1 }],
          },
        },
      ],
    });
    expect(issues).toContain('demo step 1 (s1): flow references missing node "ghost"');
    expect(issues).toContain('demo step 1 (s1): flow hop web → db has no link');
  });

  it('fails when ids repeat', () => {
    const base = lesson();
    const step = STEP;
    const issues = validateLesson({
      ...base,
      steps: [
        step,
        {
          ...step,
          change: { add: { nodes: [{ id: 'web', kind: 'server', label: 'Again', x: 1, y: 1 }] } },
        },
      ],
    });
    expect(issues).toContain('demo lesson: step id "s1" repeats');
    expect(issues).toContain('demo step 2 (s1): adds duplicate node "web"');
  });

  it('fails when a step removes something that does not exist', () => {
    const base = lesson();
    const issues = validateLesson({
      ...base,
      steps: [{ ...STEP, change: { remove: { nodes: ['nope'], links: ['gone'] } } }],
    });
    expect(issues).toContain('demo step 1 (s1): removes missing node "nope"');
    expect(issues).toContain('demo step 1 (s1): removes missing link "gone"');
  });

  it('rejects markup other than <b> and <code>', () => {
    const base = lesson();
    const issues = validateLesson({ ...base, steps: [{ ...STEP, body: ['<i>no</i>'] }] });
    expect(issues).toContain('demo step 1 (s1): body uses disallowed markup <i>');
  });

  it('rejects duplicate slugs across the catalog', () => {
    expect(validateCatalog([lesson(), lesson()])).toEqual([
      'slug "demo" is used by more than one lesson',
    ]);
  });

  it('checks break actions against the course preset', () => {
    const needs = { killServer: ['server'], slowDatabase: ['database'] } as const;
    const withActions = (breakActions: string[]) => lesson({ steps: [{ ...STEP, breakActions }] });
    expect(validateLesson(withActions(['killServer']), { actionNeeds: needs })).toEqual([]);
    expect(validateLesson(withActions(['slowDatabase']), { actionNeeds: needs })).toEqual([
      'demo step 1 (s1): break action slowDatabase needs a database',
    ]);
    expect(validateLesson(withActions(['teleport']), { actionNeeds: needs })).toEqual([
      'demo step 1 (s1): unknown break action "teleport"',
    ]);
  });
});
