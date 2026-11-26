import {
  createChartStage,
  evaluateStock,
  formatUsd,
  startingMetrics,
  stockScenarios,
  type ChartChange,
  type StockAction,
  type StockInitial,
  type StockMetrics,
} from '@ss/chart-engine';
import { createCourseApp, type CourseConfig } from '@ss/course';
import en from './i18n/en.json';
import { catalog, loadLesson } from './lessons';
import { CHAPTERS } from './lessons/chapters';

/** Rename the site here. */
const SITE_NAME = 'Shares, Sketched';
/** Shown in the top bar credit. */
const AUTHOR_NAME = 'Your Name';

const pct = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(Math.abs(v) < 10 ? 1 : 0)}`;

const config: CourseConfig<StockMetrics, StockAction, StockInitial, ChartChange> = {
  siteName: SITE_NAME,
  authorName: AUTHOR_NAME,
  catalog,
  chapters: CHAPTERS,
  loadLesson,
  home: { kicker: en['home.kicker'], title: en['home.title'], intro: en['home.intro'] },
  messages: { 'step.breakIt': en['step.breakIt'], 'lesson.diagram': en['lesson.diagram'] },
  notice: en.notice,
  createStage: (svg, scene, reducedMotion) =>
    createChartStage(svg, scene, {
      evaluate: evaluateStock,
      describe: (m) => `portfolio value ${formatUsd(m.value)}, cash ${formatUsd(m.cash)}`,
      scenarios: stockScenarios,
      reducedMotion,
    }),
  initialMetrics: (initial) => startingMetrics(initial, evaluateStock),
  metricTiles: (m) => [
    { key: 'value', label: en['metrics.value'], value: formatUsd(m.value), status: 'ok' },
    {
      key: 'cash',
      label: en['metrics.cash'],
      value: formatUsd(m.cash),
      status: m.cash < 0 ? 'warn' : 'ok',
    },
    {
      key: 'pnl',
      label: en['metrics.pnl'],
      value: formatUsd(m.pnl, true),
      status: m.pnl < 0 ? 'warn' : 'ok',
    },
    {
      key: 'return',
      label: en['metrics.return'],
      value: pct(m.returnPct),
      unit: '%',
      status: m.returnPct < -15 ? 'fail' : m.returnPct < 0 ? 'warn' : 'ok',
    },
    {
      key: 'drawdown',
      label: en['metrics.drawdown'],
      value: m.drawdownPct.toFixed(m.drawdownPct > 0 && m.drawdownPct < 10 ? 1 : 0),
      unit: '%',
      status: m.drawdownPct > 20 ? 'fail' : m.drawdownPct > 5 ? 'warn' : 'ok',
    },
  ],
  actionLabels: {
    earningsGap: en['action.earningsGap'],
    marketSelloff: en['action.marketSelloff'],
    companyCollapse: en['action.companyCollapse'],
    shortSqueeze: en['action.shortSqueeze'],
  },
  legend: [
    { tone: 'up', label: en['legend.up'] },
    { tone: 'down', label: en['legend.down'] },
    { tone: 'stop', label: en['legend.stop'] },
    { tone: 'target', label: en['legend.target'] },
  ],
};

export const App = createCourseApp(config);
