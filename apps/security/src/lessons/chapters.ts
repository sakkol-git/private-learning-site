import { SECURITY_ACTION_NEEDS, type SecurityMetrics } from '@ss/diagram-engine';
import { diagramScene } from '@ss/lesson-engine';

/** Course outline. Lesson order here is the order learners see. */
export const CHAPTERS: readonly { id: string; title: string; lessons: readonly string[] }[] = [
  { id: 'passwords', title: 'Passwords', lessons: ['reused-passwords', 'password-managers'] },
  { id: 'logins', title: 'Logins', lessons: ['two-factor', 'phishing'] },
  { id: 'files', title: 'Your files', lessons: ['ransomware-and-backups'] },
];

/** Engine-specific lesson checks, including which node kinds each break action needs. */
export const validateScene = diagramScene<SecurityMetrics>(SECURITY_ACTION_NEEDS);
