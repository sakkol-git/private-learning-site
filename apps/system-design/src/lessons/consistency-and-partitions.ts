import type { InfraLesson } from './index';

const replication = [{ route: ['dbE', 'dbW'], kind: 'response' as const, ratePerSec: 100 }];

const lesson: InfraLesson = {
  slug: 'consistency-and-partitions',
  chapter: 'Data across machines',
  title: 'Consistency and partitions',
  summary:
    'When two regions cannot talk, each must choose: refuse requests, or answer with data that may disagree.',
  minutes: 10,
  level: 'advanced',
  youWillLearn: [
    { text: 'What a network partition is', stepId: 'partition' },
    { text: 'What CAP really asks you to choose', stepId: 'cap' },
    { text: 'How consistent and available designs fail differently', stepId: 'available-try' },
    { text: 'Consistency models, from strong to eventual', stepId: 'models' },
  ],
  initial: {
    nodes: [
      { id: 'east', kind: 'users', label: 'East readers', x: 0, y: 2.5, tag: 'east' },
      { id: 'west', kind: 'users', label: 'West readers', x: 0, y: 9.5, tag: 'west' },
      { id: 'appE', kind: 'server', label: 'East app', x: 5, y: 2.5, capacity: 1000, tag: 'east' },
      { id: 'appW', kind: 'server', label: 'West app', x: 5, y: 9.5, capacity: 1000, tag: 'west' },
      {
        id: 'dbE',
        kind: 'database',
        label: 'East DB',
        sublabel: 'leader',
        x: 10,
        y: 2.5,
        capacity: 2000,
        tag: 'east',
      },
      {
        id: 'dbW',
        kind: 'database',
        label: 'West DB',
        sublabel: 'follower',
        x: 10,
        y: 9.5,
        capacity: 2000,
        tag: 'west',
      },
    ],
    links: [
      { id: 'east-appE', from: 'east', to: 'appE' },
      { id: 'west-appW', from: 'west', to: 'appW' },
      { id: 'appE-dbE', from: 'appE', to: 'dbE' },
      { id: 'appW-dbE', from: 'appW', to: 'dbE' },
      { id: 'appW-dbW', from: 'appW', to: 'dbW' },
      { id: 'dbE-dbW', from: 'dbE', to: 'dbW', style: 'dashed' },
    ],
    metrics: {
      users: 5000,
      requestsPerSec: 500,
      p95LatencyMs: 140,
      errorRatePct: 0,
      healthy: [2, 2],
    },
  },
  steps: [
    {
      id: 'two-regions',
      short: 'Regions',
      tag: 'IDEA',
      title: 'One leader, two regions',
      body: [
        'A note-taking app runs in an east and a west region. To keep every read up to date, all reads and writes go to the leader database in the east, and the west copy is a standby.',
        'West readers pay a cross-country round trip on every request, so p95 is 140 ms.',
      ],
      keyIdea: 'One leader gives one truth, at the cost of distance for some users.',
      change: {
        flows: [
          { route: ['east', 'appE', 'dbE'], kind: 'request', ratePerSec: 250 },
          { route: ['west', 'appW', 'dbE'], kind: 'request', ratePerSec: 250 },
          ...replication,
        ],
      },
    },
    {
      id: 'partition',
      short: 'Partition',
      tag: 'PROBLEM',
      title: 'The regions lose each other',
      body: [
        'A <b>network partition</b>: the link between regions fails, but both regions keep running. Each side can see its own users and its own database, not the other side.',
        'Partitions are not rare in practice: a bad router change or a cut cable is enough.',
      ],
      keyIdea: 'In a partition, both halves are alive and cannot agree.',
      change: {},
    },
    {
      id: 'consistent-try',
      short: 'Refuse',
      tag: 'TRY IT',
      title: 'Cut the link: consistent design',
      body: [
        'Predict: west requests need the east leader. What happens to them?',
        'Press <b>Cut the network between zones</b>. Every west request fails at the cut: <b>50%</b> of all requests. East users notice nothing. No one ever reads stale data, because the west refuses to answer.',
      ],
      keyIdea: 'A consistent (CP) design stays correct by refusing service on the cut-off side.',
      change: {},
      breakActions: ['partition'],
    },
    {
      id: 'cap',
      short: 'CAP',
      tag: 'IDEA',
      title: 'The choice CAP describes',
      body: [
        'During a partition, a system can be <b>consistent</b> (every answer reflects the latest write, or no answer) or <b>available</b> (every request gets an answer, maybe out of date). Not both.',
        'Without a partition you can have both. CAP is about what you do when the network breaks.',
      ],
      keyIdea: 'Partitions force a choice between refusing and possibly being wrong.',
      change: {},
    },
    {
      id: 'available',
      short: 'Local',
      tag: 'SOLUTION',
      title: 'Let each region answer locally',
      body: [
        'Now each region reads and writes its own database, and the two databases replicate to each other in the background.',
        'West p95 drops to about 40 ms. The price: for a moment, the regions can disagree.',
      ],
      keyIdea: 'Local writes are fast and always available, and only eventually agree.',
      change: {
        update: {
          nodes: [
            { id: 'dbE', sublabel: 'accepts writes' },
            { id: 'dbW', sublabel: 'accepts writes' },
          ],
        },
        flows: [
          { route: ['east', 'appE', 'dbE'], kind: 'request', ratePerSec: 250 },
          { route: ['west', 'appW', 'dbW'], kind: 'request', ratePerSec: 250 },
          ...replication,
          { route: ['dbW', 'dbE'], kind: 'response', ratePerSec: 100 },
        ],
        metrics: { p95LatencyMs: 40 },
      },
    },
    {
      id: 'available-try',
      short: 'Answer',
      tag: 'TRY IT',
      title: 'Cut the link: available design',
      body: [
        'Predict: the same cut, with local writes.',
        'Press <b>Cut the network between zones</b>. Errors stay at <b>0%</b>; only the replication stops. But a note edited on a laptop in the east and a phone in the west now has two versions, and someone must merge them when the link returns.',
      ],
      keyIdea: 'An available (AP) design keeps answering and repairs disagreements later.',
      change: {},
      breakActions: ['partition'],
    },
    {
      id: 'conflicts',
      short: 'Conflicts',
      tag: 'TRADE-OFF',
      title: 'Resolving the disagreement',
      body: [
        '<b>Last write wins</b> is simple and silently drops one edit. Keeping both versions and asking the user is honest but annoying. Data types built to merge, such as sets and counters, combine edits automatically.',
        'Another common answer: give each record a home region, so only that region accepts its writes.',
      ],
      keyIdea: 'Availability moves the hard part to merging conflicts.',
      change: {},
    },
    {
      id: 'models',
      short: 'Models',
      tag: 'IDEA',
      title: 'A ladder of consistency',
      body: [
        '<b>Strong</b>: every read sees the latest write, as if there were one copy. <b>Read-your-writes</b>: you always see your own changes. <b>Eventual</b>: copies agree once writes stop.',
        'Quorum stores read from R copies and write to W of N; when R + W > N, every read overlaps the latest write.',
      ],
      keyIdea: 'Pick the weakest model your feature can tolerate; it is the cheapest.',
      change: {},
    },
    {
      id: 'latency',
      short: 'Latency',
      tag: 'TRADE-OFF',
      title: 'Even without a partition',
      body: [
        'Waiting for the other region to confirm each write adds a cross-country round trip, about 70 ms, to every write. So the real everyday choice is latency versus consistency.',
        'Bank balances choose consistency. Likes and view counts choose speed.',
      ],
      keyIdea: 'Consistency costs latency every day, not just during outages.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Choose per feature',
      body: [
        'With one leader, a partition failed 50% of requests but never served stale data. With local writes, nothing failed, but the regions diverged and needed merging. Most systems mix both, feature by feature.',
      ],
      keyIdea: 'Decide in advance what each feature does when the network breaks.',
      change: {},
    },
  ],
};

export default lesson;
