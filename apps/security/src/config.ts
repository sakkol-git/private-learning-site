import { createCourseApp, type CourseConfig } from '@ss/course';
import {
  createStage,
  securityScenarios,
  summarizeSecurity,
  type SecurityAction,
  type DiagramInitial,
  type SecurityMetrics,
  type StepChange,
} from '@ss/diagram-engine';
import en from './i18n/en.json';
import { catalog, loadLesson } from './lessons';
import { CHAPTERS } from './lessons/chapters';

/** Rename the site here. */
const SITE_NAME = 'Locks, Sketched';
/** Shown in the top bar credit. */
const AUTHOR_NAME = 'Your Name';

const usd = (n: number, signed = false) =>
  `${n < 0 ? '−' : signed && n > 0 ? '+' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;

const config: CourseConfig<
  SecurityMetrics,
  SecurityAction,
  DiagramInitial<SecurityMetrics>,
  StepChange<SecurityMetrics>
> = {
  id: 'security',
  siteName: SITE_NAME,
  authorName: AUTHOR_NAME,
  catalog,
  chapters: CHAPTERS,
  loadLesson,
  home: { kicker: en['home.kicker'], title: en['home.title'], intro: en['home.intro'] },
  notice: en.notice,
  createStage: (svg, scene, reducedMotion) =>
    createStage(svg, scene, {
      scenarios: securityScenarios,
      summarize: summarizeSecurity,
      formatValue: (v) => usd(v),
      reducedMotion,
    }),
  initialMetrics: (initial) => initial.metrics,
  metricTiles: (m) => [
    {
      key: 'safe',
      label: en['metrics.safe'],
      value: `${m.safe[0]}/${m.safe[1]}`,
      status: m.safe[0] === 0 && m.safe[1] > 0 ? 'fail' : m.safe[0] < m.safe[1] ? 'warn' : 'ok',
    },
    {
      key: 'reused',
      label: en['metrics.reused'],
      value: String(m.reused),
      status: m.reused > 2 ? 'fail' : m.reused > 0 ? 'warn' : 'ok',
    },
    {
      key: 'locked',
      label: en['metrics.locked'],
      value: String(m.filesLockedPct),
      unit: '%',
      status: m.filesLockedPct > 0 ? 'fail' : 'ok',
    },
    {
      key: 'recovery',
      label: en['metrics.recovery'],
      value: String(m.recoveryDays),
      unit: en['metrics.days'],
      status: m.recoveryDays > 7 ? 'fail' : m.recoveryDays > 0 ? 'warn' : 'ok',
    },
    {
      key: 'lost',
      label: en['metrics.lost'],
      value: usd(m.moneyLost),
      status: m.moneyLost > 0 ? 'fail' : 'ok',
    },
  ],
  actionLabels: {
    siteBreach: en['action.siteBreach'],
    phishingClick: en['action.phishingClick'],
    ransomware: en['action.ransomware'],
  },
  legend: [
    { tone: 'request', label: en['legend.request'] },
    { tone: 'failed', label: en['legend.failed'] },
    { tone: 'response', label: en['legend.response'] },
  ],
};

export const App = createCourseApp(config);
