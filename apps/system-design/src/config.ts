import { createCourseApp, type CourseConfig } from '@ss/course';
import {
  createStage,
  infraScenarios,
  summarizeInfra,
  type DiagramInitial,
  type InfraAction,
  type InfraMetrics,
  type StepChange,
} from '@ss/diagram-engine';
import en from './i18n/en.json';
import { catalog, loadLesson } from './lessons';
import { CHAPTERS } from './lessons/chapters';

/** Rename the site here. */
const SITE_NAME = 'Systems, Sketched';
/** Shown in the top bar credit. */
const AUTHOR_NAME = 'Your Name';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const config: CourseConfig<
  InfraMetrics,
  InfraAction,
  DiagramInitial<InfraMetrics>,
  StepChange<InfraMetrics>
> = {
  id: 'system-design',
  siteName: SITE_NAME,
  authorName: AUTHOR_NAME,
  catalog,
  chapters: CHAPTERS,
  chapterNavigation: true,
  loadLesson,
  home: { kicker: en['home.kicker'], title: en['home.title'], intro: en['home.intro'] },
  createStage: (svg, scene, reducedMotion) =>
    createStage(svg, scene, {
      scenarios: infraScenarios,
      summarize: summarizeInfra,
      reducedMotion,
    }),
  initialMetrics: (initial) => initial.metrics,
  metricTiles: (m) => [
    { key: 'users', label: en['metrics.users'], value: fmt(m.users), status: 'ok' },
    { key: 'rps', label: en['metrics.rps'], value: fmt(m.requestsPerSec), status: 'ok' },
    {
      key: 'p95',
      label: en['metrics.p95'],
      value: fmt(m.p95LatencyMs),
      unit: en['metrics.ms'],
      status: m.p95LatencyMs >= 1000 ? 'fail' : m.p95LatencyMs >= 400 ? 'warn' : 'ok',
    },
    {
      key: 'err',
      label: en['metrics.errors'],
      value: m.errorRatePct.toFixed(m.errorRatePct > 0 && m.errorRatePct < 10 ? 1 : 0),
      unit: '%',
      status: m.errorRatePct >= 5 ? 'fail' : m.errorRatePct > 0.5 ? 'warn' : 'ok',
    },
    {
      key: 'healthy',
      label: en['metrics.healthy'],
      value: `${m.healthy[0]}/${m.healthy[1]}`,
      status:
        m.healthy[1] > 0 && m.healthy[0] === 0
          ? 'fail'
          : m.healthy[0] < m.healthy[1]
            ? 'warn'
            : 'ok',
    },
  ],
  actionLabels: {
    killServer: en['action.killServer'],
    spikeTraffic: en['action.spikeTraffic'],
    slowDatabase: en['action.slowDatabase'],
    expireCache: en['action.expireCache'],
    killDatabase: en['action.killDatabase'],
    partition: en['action.partition'],
    stopWorkers: en['action.stopWorkers'],
    noisyClient: en['action.noisyClient'],
    slowDependency: en['action.slowDependency'],
  },
  legend: [
    { tone: 'request', label: en['legend.request'] },
    { tone: 'response', label: en['legend.response'] },
    { tone: 'failed', label: en['legend.failed'] },
    { tone: 'check', label: en['legend.check'] },
  ],
};

export const App = createCourseApp(config);
