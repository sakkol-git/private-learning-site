import { createCourseApp, type CourseConfig } from '@ss/course';
import {
  createStage,
  businessScenarios,
  summarizeBusiness,
  type BusinessAction,
  type DiagramInitial,
  type BusinessMetrics,
  type StepChange,
} from '@ss/diagram-engine';
import en from './i18n/en.json';
import { catalog, loadLesson } from './lessons';
import { CHAPTERS } from './lessons/chapters';

/** Rename the site here. */
const SITE_NAME = 'Business, Mapped';
/** Shown in the top bar credit. */
const AUTHOR_NAME = 'Your Name';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const usd = (n: number, signed = false) =>
  `${n < 0 ? '−' : signed && n > 0 ? '+' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;

const config: CourseConfig<
  BusinessMetrics,
  BusinessAction,
  DiagramInitial<BusinessMetrics>,
  StepChange<BusinessMetrics>
> = {
  siteName: SITE_NAME,
  authorName: AUTHOR_NAME,
  catalog,
  chapters: CHAPTERS,
  loadLesson,
  home: { kicker: en['home.kicker'], title: en['home.title'], intro: en['home.intro'] },
  notice: en.notice,
  createStage: (svg, scene, reducedMotion) =>
    createStage(svg, scene, {
      scenarios: businessScenarios,
      summarize: summarizeBusiness,
      formatValue: (v) => `${fmt(v)} units`,
      reducedMotion,
    }),
  initialMetrics: (initial) => initial.metrics,
  metricTiles: (m) => [
    {
      key: 'stock',
      label: en['metrics.stock'],
      value: fmt(m.stock),
      unit: en['metrics.units'],
      status: m.stock <= 0 ? 'fail' : m.daysOfStock < 2 ? 'warn' : 'ok',
    },
    {
      key: 'filled',
      label: en['metrics.filled'],
      value: String(m.filledPct),
      unit: '%',
      status: m.filledPct < 80 ? 'fail' : m.filledPct < 100 ? 'warn' : 'ok',
    },
    {
      key: 'days',
      label: en['metrics.days'],
      value: m.daysOfStock >= 99 ? '—' : String(m.daysOfStock),
      status: m.daysOfStock < 1 ? 'fail' : m.daysOfStock < 2 ? 'warn' : 'ok',
    },
    {
      key: 'cash',
      label: en['metrics.cash'],
      value: usd(m.cash),
      status: m.cash < 0 ? 'fail' : 'ok',
    },
    {
      key: 'profit',
      label: en['metrics.profit'],
      value: usd(m.profitPerDay, true),
      status: m.profitPerDay < 0 ? 'fail' : 'ok',
    },
  ],
  actionLabels: {
    supplierDelay: en['action.supplierDelay'],
    demandSpike: en['action.demandSpike'],
    latePayments: en['action.latePayments'],
  },
  legend: [
    { tone: 'request', label: en['legend.request'] },
    { tone: 'response', label: en['legend.response'] },
    { tone: 'failed', label: en['legend.failed'] },
  ],
};

export const App = createCourseApp(config);
