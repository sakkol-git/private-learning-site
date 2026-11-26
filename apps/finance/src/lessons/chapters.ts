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

/** Node kinds each break action needs; the lesson validator checks lessons against it. */
export { MONEY_ACTION_NEEDS as ACTION_NEEDS } from '@ss/diagram-engine';
