/** Learner progress, persisted in localStorage under "ss:progress". */
export const PROGRESS_KEY = 'ss:progress';

export interface LessonProgress {
  /** Highest step index reached (0-based). */
  furthest: number;
  /** Step index the learner was last on. */
  last: number;
  stepCount: number;
  updatedAt: number;
}

export interface Progress {
  lessons: Record<string, LessonProgress>;
  lastSlug?: string;
}

const empty = (): Progress => ({ lessons: {} });

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadProgress(store: Storage | null = storage()): Progress {
  try {
    const raw = store?.getItem(PROGRESS_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return typeof parsed.lessons === 'object' && parsed.lessons ? (parsed as Progress) : empty();
  } catch {
    return empty();
  }
}

/** Records that the learner is on a step and returns the new progress. */
export function recordStep(
  slug: string,
  step: number,
  stepCount: number,
  store: Storage | null = storage(),
  now = Date.now(),
): Progress {
  const progress = loadProgress(store);
  const prev = progress.lessons[slug];
  progress.lessons[slug] = {
    furthest: Math.max(prev?.furthest ?? 0, step),
    last: step,
    stepCount,
    updatedAt: now,
  };
  progress.lastSlug = slug;
  try {
    store?.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* storage full or blocked: progress lives for this page view only */
  }
  return progress;
}

/** 0..1 share of the lesson the learner has reached. */
export function completion(p: LessonProgress | undefined): number {
  if (!p || p.stepCount <= 0) return 0;
  return Math.min(1, (p.furthest + 1) / p.stepCount);
}
