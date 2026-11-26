import { createCourseApp, type CourseConfig } from '@ss/course';
import {
  createStage,
  networkScenarios,
  summarizeNetwork,
  type NetworkAction,
  type DiagramInitial,
  type NetworkMetrics,
  type StepChange,
} from '@ss/diagram-engine';
import en from './i18n/en.json';
import { catalog, loadLesson } from './lessons';
import { CHAPTERS } from './lessons/chapters';

/** Rename the site here. */
const SITE_NAME = 'Wires, Sketched';
/** Shown in the top bar credit. */
const AUTHOR_NAME = 'Your Name';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const config: CourseConfig<
  NetworkMetrics,
  NetworkAction,
  DiagramInitial<NetworkMetrics>,
  StepChange<NetworkMetrics>
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
      scenarios: networkScenarios,
      summarize: summarizeNetwork,
      reducedMotion,
    }),
  initialMetrics: (initial) => initial.metrics,
  metricTiles: (m) => [
    {
      key: 'pageLoad',
      label: en['metrics.pageLoad'],
      value: fmt(m.pageLoadMs),
      unit: en['metrics.ms'],
      status: m.pageLoadMs > 3000 ? 'fail' : m.pageLoadMs > 1000 ? 'warn' : 'ok',
    },
    {
      key: 'roundTrip',
      label: en['metrics.roundTrip'],
      value: fmt(m.roundTripMs),
      unit: en['metrics.ms'],
      status: m.roundTripMs > 300 ? 'fail' : m.roundTripMs > 100 ? 'warn' : 'ok',
    },
    {
      key: 'loss',
      label: en['metrics.loss'],
      value: m.lossPct.toFixed(m.lossPct > 0 && m.lossPct < 10 ? 1 : 0),
      unit: '%',
      status: m.lossPct > 2 ? 'fail' : m.lossPct > 0.5 ? 'warn' : 'ok',
    },
    {
      key: 'ok',
      label: en['metrics.ok'],
      value: m.okPct.toFixed(m.okPct > 0 && m.okPct < 100 ? 1 : 0),
      unit: '%',
      status: m.okPct < 90 ? 'fail' : m.okPct < 99.5 ? 'warn' : 'ok',
    },
    { key: 'hops', label: en['metrics.hops'], value: String(m.hops), status: 'ok' },
  ],
  actionLabels: {
    routerFails: en['action.routerFails'],
    dnsOutage: en['action.dnsOutage'],
    packetLoss: en['action.packetLoss'],
    ddos: en['action.ddos'],
  },
  legend: [
    { tone: 'request', label: en['legend.request'] },
    { tone: 'response', label: en['legend.response'] },
    { tone: 'failed', label: en['legend.failed'] },
  ],
};

export const App = createCourseApp(config);
