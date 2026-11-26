import { MONEY_ACTION_NEEDS, type MoneyMetrics } from '@ss/diagram-engine';
import { diagramScene } from '@ss/lesson-engine';

/** Course outline. Lesson order here is the order learners see. */
export const CHAPTERS: readonly { id: string; title: string; lessons: readonly string[] }[] = [
  { id: 'everyday', title: 'Everyday money', lessons: ['where-your-money-goes', 'safety-net'] },
  {
    id: 'growing',
    title: 'Borrowing and growing',
    lessons: ['borrowing-and-interest', 'growing-money'],
  },
  { id: 'protecting', title: 'Protecting yourself', lessons: ['spotting-a-scheme'] },
];

/** Engine-specific lesson checks, including which node kinds each break action needs. */
export const validateScene = diagramScene<MoneyMetrics>(MONEY_ACTION_NEEDS);
