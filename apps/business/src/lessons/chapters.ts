import { BUSINESS_ACTION_NEEDS, type BusinessMetrics } from '@ss/diagram-engine';
import { diagramScene } from '@ss/lesson-engine';

/** Course outline. Lesson order here is the order learners see. */
export const CHAPTERS: readonly { id: string; title: string; lessons: readonly string[] }[] = [
  { id: 'goods', title: 'Moving goods', lessons: ['how-goods-flow', 'safety-stock'] },
  { id: 'risk', title: 'Planning for trouble', lessons: ['two-suppliers', 'demand-spikes'] },
  { id: 'money', title: 'Money', lessons: ['cash-flow'] },
];

/** Engine-specific lesson checks, including which node kinds each break action needs. */
export const validateScene = diagramScene<BusinessMetrics>(BUSINESS_ACTION_NEEDS);
