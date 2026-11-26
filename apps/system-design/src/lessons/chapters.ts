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
