import { chartScene } from '@ss/chart-engine';

/** Course outline. Lesson order here is the order learners see. */
export const CHAPTERS: readonly { id: string; title: string; lessons: readonly string[] }[] = [
  {
    id: 'reading',
    title: 'Reading the market',
    lessons: ['reading-a-candle', 'pips-and-lots', 'spread-and-costs'],
  },
  { id: 'risk', title: 'Managing risk', lessons: ['stop-loss', 'leverage-and-margin'] },
];

/** Engine-specific lesson checks, including which break actions need an open position. */
export const validateScene = chartScene();
