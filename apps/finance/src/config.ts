import { createCourseApp, type CourseConfig } from '@ss/course';
import {
  formatMoney,
  moneyScenarios,
  summarizeMoney,
  type MoneyAction,
  type MoneyMetrics,
} from '@ss/diagram-engine';
import en from './i18n/en.json';
import { catalog, loadLesson } from './lessons';
import { CHAPTERS } from './lessons/chapters';

/** Rename the site here. */
const SITE_NAME = 'Money, Mapped';
/** Shown in the top bar credit. */
const AUTHOR_NAME = 'Your Name';

const config: CourseConfig<MoneyMetrics, MoneyAction> = {
  siteName: SITE_NAME,
  authorName: AUTHOR_NAME,
  catalog,
  chapters: CHAPTERS,
  loadLesson,
  home: { kicker: en['home.kicker'], title: en['home.title'], intro: en['home.intro'] },
  messages: { 'step.breakIt': en['step.breakIt'], 'lesson.diagram': en['lesson.diagram'] },
  notice: en.notice,
  engine: { scenarios: moneyScenarios, summarize: summarizeMoney, formatValue: formatMoney },
  metricTiles: (m) => [
    { key: 'income', label: en['metrics.income'], value: formatMoney(m.income), status: 'ok' },
    {
      key: 'spending',
      label: en['metrics.spending'],
      value: formatMoney(m.spending),
      status: m.income > 0 && m.spending > m.income ? 'warn' : 'ok',
    },
    {
      key: 'saved',
      label: en['metrics.saved'],
      value: formatMoney(m.saved),
      status: m.saved < 0 ? 'fail' : m.income > 0 && m.saved < m.income * 0.05 ? 'warn' : 'ok',
    },
    {
      key: 'debt',
      label: en['metrics.debt'],
      value: formatMoney(m.debt),
      status:
        m.debt > Math.max(1, m.income) * 12
          ? 'fail'
          : m.debt > Math.max(1, m.income) * 3
            ? 'warn'
            : 'ok',
    },
    {
      key: 'netWorth',
      label: en['metrics.netWorth'],
      value: formatMoney(m.netWorth),
      status: m.netWorth < 0 ? 'fail' : 'ok',
    },
  ],
  actionLabels: {
    surpriseExpense: en['action.surpriseExpense'],
    loseIncome: en['action.loseIncome'],
    rateHike: en['action.rateHike'],
    marketDrop: en['action.marketDrop'],
    newMoneyStops: en['action.newMoneyStops'],
  },
  legend: [
    { tone: 'request', label: en['legend.request'] },
    { tone: 'response', label: en['legend.response'] },
    { tone: 'failed', label: en['legend.failed'] },
  ],
};

export const App = createCourseApp(config);
