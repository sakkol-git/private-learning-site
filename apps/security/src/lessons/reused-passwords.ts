import type { CourseLesson } from './index';

const accounts = [
  { id: 'forum', label: 'Old forum', y: 0.5 },
  { id: 'shop', label: 'Online shop', y: 3.5 },
  { id: 'bank', label: 'Bank', y: 6.5 },
  { id: 'social', label: 'Social media', y: 9.5 },
];

const lesson: CourseLesson = {
  slug: 'reused-passwords',
  chapter: 'Passwords',
  title: 'One password, many doors',
  summary:
    'Why a leak at a site you barely use can empty your bank account, and the simple habit that stops it.',
  minutes: 6,
  level: 'beginner',
  youWillLearn: [
    { text: 'How websites leak passwords', stepId: 'leak' },
    { text: 'What credential stuffing is', stepId: 'stuffing' },
    { text: 'Why unique passwords contain a leak', stepId: 'unique' },
  ],
  initial: {
    nodes: [
      { id: 'you', kind: 'person', label: 'You', x: 0, y: 5 },
      ...accounts.map((a) => ({
        id: a.id,
        kind: 'service' as const,
        label: a.label,
        sublabel: 'password: sunny2019',
        x: 7,
        y: a.y,
        tag: 'sunny2019',
        ...(a.id === 'bank' ? { value: 2400 } : {}),
      })),
      { id: 'thief', kind: 'attacker', label: 'Attacker', x: 14, y: 5 },
    ],
    links: [
      ...accounts.map((a) => ({ id: `you-${a.id}`, from: 'you', to: a.id })),
      ...accounts.map((a) => ({
        id: `thief-${a.id}`,
        from: 'thief',
        to: a.id,
        style: 'dashed' as const,
      })),
    ],
    metrics: { safe: [4, 4], reused: 4, filesLockedPct: 0, recoveryDays: 0, moneyLost: 0 },
  },
  steps: [
    {
      id: 'one-password',
      short: 'Habit',
      tag: 'PROBLEM',
      title: 'The same password everywhere',
      body: [
        'You use one easy password for everything: an old forum, a shop, your bank and social media. It is simple to remember.',
        'The bank account holds <b>$2,400</b>.',
      ],
      keyIdea: 'Reusing a password links the safety of every account to the weakest site.',
      change: {
        flows: accounts.map((a) => ({
          route: ['you', a.id],
          kind: 'request' as const,
          ratePerSec: 2,
        })),
      },
    },
    {
      id: 'leak',
      short: 'Leak',
      tag: 'IDEA',
      title: 'Sites get hacked all the time',
      body: [
        'The old forum is run by a volunteer on an ageing server. One day its database of emails and passwords is stolen and posted online.',
        'You may not hear about it for months.',
      ],
      keyIdea: 'Assume any password you have used anywhere will leak one day.',
      change: { update: { nodes: [{ id: 'forum', sublabel: 'outdated, rarely patched' }] } },
    },
    {
      id: 'stuffing',
      short: 'Stuffing',
      tag: 'TRY IT',
      title: 'The attacker tries it everywhere',
      body: [
        'Press <b>A website leaks passwords</b>. Automated tools try every leaked email and password pair on thousands of other sites. This is <b>credential stuffing</b>.',
        'Your shop, bank and social accounts all open with the same key. All four accounts are lost, with them the $2,400.',
      ],
      keyIdea: 'One leak plus one reused password equals many break-ins.',
      change: {},
      breakActions: ['siteBreach'],
    },
    {
      id: 'unique',
      short: 'Unique',
      tag: 'SOLUTION',
      title: 'A different password for every site',
      body: [
        'Give each account its own password. Now the forum’s leak reveals a password that opens nothing else.',
      ],
      keyIdea: 'Unique passwords turn a leak into a dead end.',
      change: {
        update: {
          nodes: accounts.map((a, i) => ({
            id: a.id,
            tag: `unique-${i}`,
            sublabel: 'its own password',
          })),
        },
        metrics: { reused: 0 },
      },
    },
    {
      id: 'contained',
      short: 'Contained',
      tag: 'TRY IT',
      title: 'Leak the forum again',
      body: [
        'Press <b>A website leaks passwords</b> again. The attacker gets into the forum and tries the password elsewhere, but nothing else opens.',
        'Three of your four accounts are safe, and so is the money.',
      ],
      keyIdea: 'You cannot stop other sites leaking. You can stop the leak spreading.',
      change: {},
      breakActions: ['siteBreach'],
    },
    {
      id: 'too-many',
      short: 'Too many',
      tag: 'TRADE-OFF',
      title: 'But who can remember them all?',
      body: [
        'Most people have dozens of accounts. Remembering a strong, different password for each one is not realistic.',
        'That is exactly the job of a password manager: the next lesson.',
      ],
      keyIdea: 'Good security has to be easy enough to actually do.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Separate keys for separate doors',
      body: [
        'Sites leak. Attackers replay leaked passwords everywhere. A unique password for every account keeps one leak from becoming many.',
      ],
      keyIdea: 'Never reuse a password you care about.',
      change: {},
    },
  ],
};

export default lesson;
