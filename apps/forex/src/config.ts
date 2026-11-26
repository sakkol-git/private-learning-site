import {
  createChartStage,
  evaluateFx,
  forexScenarios,
  formatUsd,
  startingMetrics,
  type ChartChange,
  type ForexAction,
  type ForexMetrics,
  type FxInitial,
} from '@ss/chart-engine';
import { createCourseApp, type CourseConfig } from '@ss/course';
import en from './i18n/en.json';
import { catalog, loadLesson } from './lessons';
import { CHAPTERS } from './lessons/chapters';

/** Rename the site here. */
const SITE_NAME = 'Pips, Plotted';
/** Shown in the top bar credit. */
const AUTHOR_NAME = 'Your Name';

const config: CourseConfig<ForexMetrics, ForexAction, FxInitial, ChartChange> = {
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
      evaluate: evaluateFx,
      describe: (m) => `balance ${formatUsd(m.balance)}, equity ${formatUsd(m.equity)}`,
      scenarios: forexScenarios,
      reducedMotion,
    }),
  initialMetrics: (initial) => startingMetrics(initial, evaluateFx),
  metricTiles: (m) => [
    { key: 'balance', label: en['metrics.balance'], value: formatUsd(m.balance), status: 'ok' },
    {
      key: 'equity',
      label: en['metrics.equity'],
      value: formatUsd(m.equity),
      status: m.equity < m.balance ? 'warn' : 'ok',
    },
    {
      key: 'openPnl',
      label: en['metrics.openPnl'],
      value: formatUsd(m.openPnl, true),
      status: m.openPnl < 0 ? 'warn' : 'ok',
    },
    {
      key: 'marginLevel',
      label: en['metrics.marginLevel'],
      value: m.marginLevelPct === null ? '—' : `${Math.round(m.marginLevelPct)}`,
      ...(m.marginLevelPct === null ? {} : { unit: '%' }),
      status:
        m.marginLevelPct === null
          ? 'ok'
          : m.marginLevelPct < 100
            ? 'fail'
            : m.marginLevelPct < 200
              ? 'warn'
              : 'ok',
    },
    {
      key: 'drawdown',
      label: en['metrics.drawdown'],
      value: m.drawdownPct.toFixed(m.drawdownPct > 0 && m.drawdownPct < 10 ? 1 : 0),
      unit: '%',
      status: m.drawdownPct > 10 ? 'fail' : m.drawdownPct > 2 ? 'warn' : 'ok',
    },
  ],
  actionLabels: {
    priceMovesAgainst: en['action.priceMovesAgainst'],
    newsSpike: en['action.newsSpike'],
    weekendGap: en['action.weekendGap'],
    spreadWidens: en['action.spreadWidens'],
  },
  legend: [
    { tone: 'up', label: en['legend.up'] },
    { tone: 'down', label: en['legend.down'] },
    { tone: 'stop', label: en['legend.stop'] },
    { tone: 'target', label: en['legend.target'] },
  ],
};

export const App = createCourseApp(config);
