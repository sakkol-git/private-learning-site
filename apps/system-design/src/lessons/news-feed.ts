import type { InfraLesson } from './index';

const reads = {
  route: ['readers', 'feedApi', 'feeds'],
  kind: 'request' as const,
  ratePerSec: 5800,
};
const fanOut = {
  route: ['posters', 'api', 'jobs', 'fanout', 'feeds'],
  kind: 'request' as const,
  ratePerSec: 120000,
};

const lesson: InfraLesson = {
  slug: 'news-feed',
  chapter: 'Case studies',
  title: 'Design a news feed',
  summary:
    'Build each person’s feed when posts are written or when feeds are read, and handle the accounts with millions of followers.',
  minutes: 12,
  level: 'advanced',
  youWillLearn: [
    { text: 'Fan-out on read versus fan-out on write', stepId: 'on-write' },
    { text: 'Why celebrities break fan-out on write', stepId: 'celebrity-try' },
    { text: 'How a hybrid design handles both', stepId: 'hybrid' },
    { text: 'How a queue keeps posting fast when fan-out stalls', stepId: 'fanout-stops' },
  ],
  initial: {
    nodes: [
      {
        id: 'star',
        kind: 'users',
        label: 'A star account',
        sublabel: '10M followers',
        x: 4.5,
        y: -1.5,
        tag: 'noisy',
      },
      { id: 'posters', kind: 'users', label: 'People posting', x: 0, y: 3 },
      { id: 'readers', kind: 'users', label: 'People reading', x: 0, y: 9 },
      { id: 'api', kind: 'server', label: 'Post API', x: 4.5, y: 3, capacity: 2000000 },
      { id: 'feedApi', kind: 'server', label: 'Feed API', x: 4.5, y: 9, capacity: 20000 },
      {
        id: 'feeds',
        kind: 'cache',
        label: 'Feed lists',
        sublabel: 'one per user',
        x: 13.5,
        y: 9,
        capacity: 2000000,
      },
    ],
    links: [
      { id: 'star-api', from: 'star', to: 'api' },
      { id: 'posters-api', from: 'posters', to: 'api' },
      { id: 'readers-feedApi', from: 'readers', to: 'feedApi' },
      { id: 'feedApi-feeds', from: 'feedApi', to: 'feeds' },
    ],
    metrics: {
      users: 50000000,
      requestsPerSec: 6400,
      p95LatencyMs: 900,
      errorRatePct: 0,
      healthy: [2, 2],
    },
  },
  steps: [
    {
      id: 'requirements',
      short: 'Needs',
      tag: 'IDEA',
      title: 'Posts from people you follow',
      body: [
        '<b>Murmur</b> has 50 million daily users. Each posts about once a day (600 posts a second) and opens their feed 10 times (5,800 feed reads a second). The average user follows 200 accounts.',
        'A feed should load in under 200 ms and show new posts within a few seconds.',
      ],
      keyIdea: 'Reads outnumber posts 10 to 1, and each post concerns about 200 people.',
      change: {},
    },
    {
      id: 'on-read',
      short: 'On read',
      tag: 'PROBLEM',
      title: 'Build the feed when it is opened',
      body: [
        '<b>Fan-out on read</b>: when you open the app, fetch the latest posts from each of the 200 accounts you follow, then merge and sort them.',
        'That is 200 lookups per feed view, over a million a second in total, and p95 is about <b>900 ms</b>.',
      ],
      keyIdea: 'Fan-out on read is simple to write and expensive to read.',
      change: { flows: [reads] },
    },
    {
      id: 'on-write',
      short: 'On write',
      tag: 'SOLUTION',
      title: 'Build the feed when a post is written',
      body: [
        '<b>Fan-out on write</b>: when someone posts, a background job adds the post id to the cached feed list of each follower. 600 posts × 200 followers = <b>120,000 feed inserts a second</b>, done by fan-out workers behind a queue.',
        'Opening a feed is now one lookup: p95 drops to about <b>60 ms</b>.',
      ],
      keyIdea: 'Do the work once when posting, so millions of reads are cheap.',
      change: {
        add: {
          nodes: [
            { id: 'jobs', kind: 'queue', label: 'New posts', x: 9, y: 3, value: 0 },
            {
              id: 'fanout',
              kind: 'service',
              label: 'Fan-out workers',
              sublabel: 'inserts per second',
              x: 13.5,
              y: 3,
              capacity: 200000,
              tag: 'worker',
            },
          ],
          links: [
            { id: 'api-jobs', from: 'api', to: 'jobs' },
            { id: 'jobs-fanout', from: 'jobs', to: 'fanout' },
            { id: 'fanout-feeds', from: 'fanout', to: 'feeds' },
          ],
        },
        flows: [
          reads,
          fanOut,
          { route: ['star', 'api', 'jobs', 'fanout', 'feeds'], kind: 'request', ratePerSec: 20000 },
        ],
        metrics: { p95LatencyMs: 60 },
      },
    },
    {
      id: 'celebrity-try',
      short: 'Star posts',
      tag: 'TRY IT',
      title: 'A star posts',
      body: [
        'Predict: an account with 10 million followers posts several times in an hour. Each post means 10 million inserts.',
        'Press <b>One client floods</b>. The star’s inserts jump tenfold and the fan-out workers need 1.6 times their capacity. About <b>a third</b> of everyone else’s fan-out work misses its deadline (counted as errors), so ordinary posts reach feeds late.',
      ],
      keyIdea: 'Fan-out on write cost grows with follower count. A few huge accounts dominate it.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'hybrid',
      short: 'Hybrid',
      tag: 'SOLUTION',
      title: 'Push for most, pull for stars',
      body: [
        'Accounts above, say, 100,000 followers are not fanned out. Their posts go to a posts table, and the Feed API merges in the few stars you follow when you open your feed.',
        'Press <b>One client floods</b> again: the star’s posts land in the posts table, the workers carry only normal posts, and errors stay at <b>0%</b>.',
      ],
      keyIdea: 'Fan out on write for normal accounts, on read for huge ones.',
      change: {
        add: {
          nodes: [
            { id: 'posts', kind: 'database', label: 'Star posts', x: 9, y: 0, capacity: 5000 },
          ],
          links: [{ id: 'api-posts', from: 'api', to: 'posts' }],
        },
        flows: [
          reads,
          fanOut,
          { route: ['star', 'api', 'posts'], kind: 'request', ratePerSec: 20 },
        ],
      },
      breakActions: ['noisyClient'],
    },
    {
      id: 'fanout-stops',
      short: 'Workers stop',
      tag: 'TRY IT',
      title: 'Fan-out workers stop',
      body: [
        'Predict: the fan-out workers crash. Can people still post and read?',
        'Press <b>Stop the workers</b>. Errors stay at <b>0%</b>: posts are accepted and feeds still load. Feeds just stop getting new posts, and 120,000 inserts a second wait in the queue until workers return.',
      ],
      keyIdea: 'A queue between posting and fan-out keeps the core actions working.',
      change: {},
      breakActions: ['stopWorkers'],
    },
    {
      id: 'ranking',
      short: 'Ranking',
      tag: 'IDEA',
      title: 'Which posts first',
      body: [
        'Feed lists hold the latest 500 post ids per user. On read, the Feed API fetches those posts (from cache), scores them for this reader, and returns the top 20. Older history is fetched only when someone scrolls that far.',
      ],
      keyIdea: 'Store candidates cheaply; rank at read time.',
      change: {},
    },
    {
      id: 'costs',
      short: 'Costs',
      tag: 'TRADE-OFF',
      title: 'Memory, staleness and quiet users',
      body: [
        '50 million lists × 500 ids × 8 bytes is about 200 GB of cache. Fanning out to people who never log in wastes work, so inactive users are skipped and rebuilt on their next visit.',
        'A new post appears in feeds seconds later, not instantly. For a feed, that is fine.',
      ],
      keyIdea: 'Precomputed feeds cost memory and freshness; spend them where users are active.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Murmur, end to end',
      body: [
        'Fan-out on read gave 900 ms feeds. Fan-out on write cut that to 60 ms but let one star swamp the workers; a hybrid that pulls stars at read time kept errors at 0%. A queue let posting continue when fan-out stopped.',
      ],
      keyIdea: 'Choose where to do the work per account, and keep posting decoupled from delivery.',
      change: {},
    },
  ],
};

export default lesson;
