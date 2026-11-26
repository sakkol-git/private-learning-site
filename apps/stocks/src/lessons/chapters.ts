import { chartScene, STOCK_NEEDS_POSITION, stockScenarios } from '@ss/chart-engine';

/** Course outline. Lesson order here is the order learners see. */
export const CHAPTERS: readonly { id: string; title: string; lessons: readonly string[] }[] = [
  { id: 'basics', title: 'Shares and prices', lessons: ['what-a-share-is', 'orders-and-costs'] },
  { id: 'chart', title: 'Reading the chart', lessons: ['trends-and-averages', 'earnings-day'] },
  { id: 'risk', title: 'Managing risk', lessons: ['one-stock-vs-index', 'margin-and-shorting'] },
];

/** Engine-specific lesson checks, including whether the account can afford each position. */
export const validateScene = chartScene(stockScenarios, STOCK_NEEDS_POSITION);
