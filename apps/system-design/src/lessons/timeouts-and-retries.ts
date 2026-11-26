import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'timeouts-and-retries',
  chapter: 'Staying up',
  title: 'Timeouts, retries and circuit breakers',
  summary:
    'Stop waiting on a slow service, retry carefully, and fall back so one slow part does not freeze everything.',
  minutes: 10,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How a slow dependency exhausts its callers', stepId: 'slow-try' },
    { text: 'Why every call needs a timeout', stepId: 'timeouts' },
    { text: 'How retries help and how they cause storms', stepId: 'retries' },
    { text: 'How a circuit breaker and a fallback keep you up', stepId: 'breaker-try' },
  ],
  initial: {
    nodes: [
      { id: 'travellers', kind: 'users', label: 'Travellers', x: 0, y: 6 },
      { id: 'search', kind: 'server', label: 'Search API', x: 4.5, y: 6, capacity: 800 },
      { id: 'pricing', kind: 'service', label: 'Pricing service', x: 13, y: 6, capacity: 1000 },
    ],
    links: [
      { id: 'travellers-search', from: 'travellers', to: 'search' },
      { id: 'search-pricing', from: 'search', to: 'pricing' },
    ],
    metrics: {
      users: 4000,
      requestsPerSec: 400,
      p95LatencyMs: 120,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'chain',
      short: 'Chain',
      tag: 'IDEA',
      title: 'Search asks pricing for every result',
      body: [
        'A travel search API takes 400 searches a second. For each one it asks a pricing service for live fares, and waits. Search is 50% busy; p95 is 120 ms.',
      ],
      keyIdea: 'Every synchronous call is a bet that the other side answers quickly.',
      change: {
        flows: [{ route: ['travellers', 'search', 'pricing'], kind: 'request', ratePerSec: 400 }],
      },
    },
    {
      id: 'slow-try',
      short: 'Slow',
      tag: 'TRY IT',
      title: 'Pricing gets slow',
      body: [
        'Predict: pricing starts taking 3 seconds instead of 100 ms. It is not down, just slow. What happens to search?',
        'Press <b>Slow down a dependency</b>. Each search holds a thread five times longer, so search can finish only 160 a second. About <b>60%</b> of searches fail and p95 rises tenfold, to about <b>1.2 seconds</b>. A slow service is worse than a dead one: it ties up its callers.',
      ],
      keyIdea:
        'Waiting is not free. Slowness spreads upstream by using up threads and connections.',
      change: {},
      breakActions: ['slowDependency'],
    },
    {
      id: 'timeouts',
      short: 'Timeouts',
      tag: 'SOLUTION',
      title: 'Never wait forever',
      body: [
        'Give every call a <b>timeout</b> a little above the dependency’s normal p99, here 300 ms. After that, search stops waiting and does something else.',
        'Many libraries default to no timeout, or to minutes. Set one on every network call.',
      ],
      keyIdea: 'A timeout caps how much of your capacity a dependency can borrow.',
      change: {},
    },
    {
      id: 'retries',
      short: 'Retries',
      tag: 'IDEA',
      title: 'Retry, but gently',
      body: [
        'Many failures are brief, so one retry often works. Wait before retrying, doubling the wait each time (<b>exponential backoff</b>) and adding randomness (<b>jitter</b>) so clients do not retry in step.',
        'Beware stacking: if three layers each retry three times, one user action can become 27 calls to a service that is already struggling.',
      ],
      keyIdea: 'Retry at one layer, with backoff and jitter, within a budget.',
      change: {},
    },
    {
      id: 'breaker',
      short: 'Breaker',
      tag: 'SOLUTION',
      title: 'A circuit breaker with a fallback',
      body: [
        'A <b>circuit breaker</b> watches calls to pricing. When too many time out, it opens: calls fail at once, without waiting, and search shows a <b>fallback</b>, recent cached fares marked "from".',
        'Every few seconds it lets a trial call through; if that works, it closes again.',
      ],
      keyIdea: 'Stop calling something that is failing, and answer with something useful instead.',
      change: {
        remove: { links: ['search-pricing'] },
        add: {
          nodes: [
            {
              id: 'breaker',
              kind: 'shield',
              label: 'Breaker',
              sublabel: 'timeout 300 ms',
              x: 8.75,
              y: 6,
            },
          ],
          links: [
            { id: 'search-breaker', from: 'search', to: 'breaker' },
            { id: 'breaker-pricing', from: 'breaker', to: 'pricing' },
          ],
        },
        flows: [
          {
            route: ['travellers', 'search', 'breaker', 'pricing'],
            kind: 'request',
            ratePerSec: 400,
          },
        ],
      },
    },
    {
      id: 'breaker-try',
      short: 'Slow again',
      tag: 'TRY IT',
      title: 'Pricing slows again',
      body: [
        'Predict: the same slowdown, with a breaker.',
        'Press <b>Slow down a dependency</b>. Calls stop at the breaker and return cached fares. Errors stay at <b>0%</b> and p95 stays near 120 ms. Fares may be a few minutes old, which travellers see as "from" prices.',
      ],
      keyIdea: 'A breaker turns a dependency’s slowness into a degraded answer, not an outage.',
      change: {},
      breakActions: ['slowDependency'],
    },
    {
      id: 'states',
      short: 'States',
      tag: 'IDEA',
      title: 'Closed, open, half-open',
      body: [
        '<b>Closed</b>: calls pass and failures are counted. <b>Open</b>: calls fail fast for a cool-down, say 10 seconds. <b>Half-open</b>: a few trial calls decide whether to close or open again.',
      ],
      keyIdea: 'The breaker gives a struggling service room to recover.',
      change: {},
    },
    {
      id: 'bulkheads',
      short: 'Bulkheads',
      tag: 'IDEA',
      title: 'Separate pools',
      body: [
        'Give each dependency its own small pool of threads or connections, a <b>bulkhead</b>. If pricing fills its pool, calls to the hotel and car services still have theirs.',
      ],
      keyIdea: 'Isolate resources per dependency so one cannot drain them all.',
      change: {},
    },
    {
      id: 'tuning',
      short: 'Tuning',
      tag: 'TRADE-OFF',
      title: 'Too tight, too loose',
      body: [
        'A timeout below the dependency’s normal slow tail fails good requests. A breaker that opens too easily serves stale fares on a good day. Fallbacks must be honest: "from" prices, not invented ones.',
      ],
      keyIdea: 'Tune from measured latencies, and make fallbacks clearly degraded.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Fail fast, degrade gracefully',
      body: [
        'Waiting on slow pricing failed 60% of searches. Timeouts, a circuit breaker and cached fares kept errors at 0% and p95 near 120 ms. Careful retries and bulkheads keep one problem from becoming many.',
      ],
      keyIdea: 'Every call needs a timeout, a retry policy and a plan for when it fails.',
      change: {},
    },
  ],
};

export default lesson;
