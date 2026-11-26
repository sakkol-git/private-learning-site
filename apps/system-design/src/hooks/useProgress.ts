import { loadProgress, recordStep, type Progress } from '@ss/lesson-engine';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface ProgressValue {
  progress: Progress;
  record: (slug: string, step: number, count: number) => void;
}

export const ProgressContext = createContext<ProgressValue | null>(null);

export function useProgressState(): ProgressValue {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const record = useCallback((slug: string, step: number, count: number) => {
    setProgress(recordStep(slug, step, count));
  }, []);
  return useMemo(() => ({ progress, record }), [progress, record]);
}

export function useProgress(): ProgressValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress must be used inside ProgressContext');
  return value;
}
