import { NETWORK_ACTION_NEEDS, type NetworkMetrics } from '@ss/diagram-engine';
import { diagramScene } from '@ss/lesson-engine';

/** Course outline. Lesson order here is the order learners see. */
export const CHAPTERS: readonly { id: string; title: string; lessons: readonly string[] }[] = [
  { id: 'moving', title: 'How data moves', lessons: ['packets-and-routes', 'finding-addresses'] },
  {
    id: 'speed',
    title: 'Making it fast',
    lessons: ['handshakes-and-distance', 'content-delivery'],
  },
  { id: 'attacks', title: 'Under attack', lessons: ['denial-of-service'] },
];

/** Engine-specific lesson checks, including which node kinds each break action needs. */
export const validateScene = diagramScene<NetworkMetrics>(NETWORK_ACTION_NEEDS);
