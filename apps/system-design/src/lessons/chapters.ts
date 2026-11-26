import { INFRA_ACTION_NEEDS, type InfraMetrics } from '@ss/diagram-engine';
import { diagramScene } from '@ss/lesson-engine';

/** Course outline. Lesson order here is the order learners see. */
export const CHAPTERS: readonly { id: string; title: string; lessons: readonly string[] }[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    lessons: [
      'how-a-request-travels',
      'latency-and-throughput',
      'back-of-the-envelope',
      'design-levels',
    ],
  },
  {
    id: 'scaling',
    title: 'Scaling the web tier',
    lessons: ['vertical-vs-horizontal', 'load-balancing', 'stateless-servers', 'service-discovery'],
  },
  {
    id: 'reads',
    title: 'Making reads fast',
    lessons: ['caching', 'content-delivery', 'database-indexes'],
  },
  {
    id: 'storage',
    title: 'Storing data',
    lessons: [
      'choosing-a-database',
      'storage-engines',
      'transactions',
      'unique-ids',
      'files-and-media',
    ],
  },
  {
    id: 'distributed-data',
    title: 'Data across machines',
    lessons: [
      'database-replication',
      'sharding',
      'consistent-hashing',
      'consistency-and-partitions',
      'leader-election',
    ],
  },
  {
    id: 'communication',
    title: 'Services talking',
    lessons: ['api-styles', 'message-queues', 'publish-subscribe', 'real-time-updates'],
  },
  {
    id: 'reliability',
    title: 'Staying up',
    lessons: ['redundancy-and-failover', 'rate-limiting', 'timeouts-and-retries', 'observability'],
  },
  {
    id: 'architecture',
    title: 'Bigger architectures',
    lessons: ['monolith-to-microservices', 'distributed-transactions', 'batch-and-stream'],
  },
  {
    id: 'security',
    title: 'Security',
    lessons: ['authentication', 'authorization', 'encryption-and-secrets'],
  },
  {
    id: 'shipping',
    title: 'Shipping safely',
    lessons: ['testing-strategies', 'deployments'],
  },
  {
    id: 'case-studies',
    title: 'Case studies',
    lessons: ['url-shortener', 'news-feed', 'chat-system'],
  },
];

/** Engine-specific lesson checks, including which node kinds each break action needs. */
export const validateScene = diagramScene<InfraMetrics>(INFRA_ACTION_NEEDS);
