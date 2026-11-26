import { INFRA_ACTION_NEEDS, type InfraMetrics } from '@ss/diagram-engine';
import { diagramScene } from '@ss/lesson-engine';

/** Course outline. Lesson order here is the order learners see. */
export const CHAPTERS: readonly { id: string; title: string; lessons: readonly string[] }[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    lessons: ['how-a-request-travels', 'vertical-vs-horizontal'],
  },
  {
    id: 'scaling',
    title: 'Scaling',
    lessons: ['load-balancing', 'caching', 'database-replication'],
  },
];

/** Engine-specific lesson checks, including which node kinds each break action needs. */
export const validateScene = diagramScene<InfraMetrics>(INFRA_ACTION_NEEDS);
