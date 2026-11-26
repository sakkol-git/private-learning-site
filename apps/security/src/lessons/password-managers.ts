import type { CourseLesson } from './index';

const accounts = [
  { id: 'forum', label: 'Old forum', y: 0.5 },
  { id: 'shop', label: 'Online shop', y: 3.5 },
  { id: 'bank', label: 'Bank', y: 6.5 },
  { id: 'social', label: 'Social media', y: 9.5 },
];

const lesson: CourseLesson = {
  slug: 'password-managers',
  chapter: 'Passwords',
  title: 'Password managers',
  summary:
    'Let software remember a strong, different password for every site, so you only remember one.',
  minutes: 6,
  level: 'beginner',
  youWillLearn: [
    { text: 'What a password manager does', stepId: 'vault' },
    { text: 'What makes a password strong', stepId: 'strong' },
    { text: 'How a manager limits a leak', stepId: 'leak' },
    { text: 'Why the master password needs extra care', stepId: 'one-basket' },
  ],
  initial: {
    nodes: [
      { id: 'you', kind: 'person', label: 'You', x: 0, y: 5 },
      ...accounts.map((a, i) => ({
        id: a.id,
        kind: 'service' as const,
        label: a.label,
        x: 9,
        y: a.y,
        tag: i < 3 ? 'reused' : 'other',
        ...(a.id === 'bank' ? { value: 2400 } : {}),
      })),
      { id: 'thief', kind: 'attacker', label: 'Attacker', x: 15, y: 5 },
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
    metrics: { safe: [4, 4], reused: 3, filesLockedPct: 0, recoveryDays: 0, moneyLost: 0 },
  },
  steps: [
    {
      id: 'memory',
      short: 'Memory',
      tag: 'PROBLEM',
      title: 'Forty accounts, one brain',
      body: [
        'You know you should not reuse passwords, but you have dozens of accounts. Three of these four still share a password because it was easier.',
      ],
      keyIdea: 'If the safe choice is too hard, people quietly skip it.',
      change: {},
    },
    {
      id: 'vault',
      short: 'Vault',
      tag: 'SOLUTION',
      title: 'Let a vault remember them',
      body: [
        'A <b>password manager</b> keeps every password in an encrypted vault. It creates long random ones and fills them in for you.',
        'You remember just one strong <b>master password</b> to open the vault.',
      ],
      keyIdea: 'Remember one password well; let software remember the rest.',
      change: {
        add: {
          nodes: [
            {
              id: 'vault',
              kind: 'vault',
              label: 'Password manager',
              sublabel: 'encrypted vault',
              x: 4.5,
              y: 5,
            },
          ],
          links: [
            { id: 'you-vault', from: 'you', to: 'vault' },
            ...accounts.map((a) => ({ id: `vault-${a.id}`, from: 'vault', to: a.id })),
          ],
        },
        remove: { links: accounts.map((a) => `you-${a.id}`) },
        update: {
          nodes: accounts.map((a, i) => ({
            id: a.id,
            tag: `random-${i}`,
            sublabel: 'random, unique',
          })),
        },
        metrics: { reused: 0 },
      },
    },
    {
      id: 'strong',
      short: 'Strong',
      tag: 'IDEA',
      title: 'Long beats clever',
      body: [
        'For the master password, length matters more than symbols. Four or five random words, like <code>maple ferry cotton lamp</code>, are far harder to guess than <code>P@ssw0rd!</code> and easier to remember.',
      ],
      keyIdea: 'A long passphrase is both stronger and easier than a short complex password.',
      change: { update: { nodes: [{ id: 'you', sublabel: 'one long passphrase' }] } },
    },
    {
      id: 'leak',
      short: 'Leak',
      tag: 'TRY IT',
      title: 'A site leaks again',
      body: [
        'Press <b>A website leaks passwords</b>. The forum’s random password is useless anywhere else.',
        'Only the forum is affected. The bank and its $2,400 are untouched.',
      ],
      keyIdea: 'With unique random passwords, every leak stays where it started.',
      change: {},
      breakActions: ['siteBreach'],
    },
    {
      id: 'one-basket',
      short: 'One basket',
      tag: 'TRADE-OFF',
      title: 'All your eggs in one basket?',
      body: [
        'The vault is now valuable. Good managers encrypt it so even the company cannot read it, but your master password must be strong and never reused.',
        'Protect the vault with a second step at login, too: the next lesson.',
      ],
      keyIdea: 'Concentrating secrets is safer only if the one door is very strong.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'One strong key, many random ones',
      body: [
        'A password manager makes unique passwords effortless. Leaks stop spreading, and you only remember one long passphrase.',
      ],
      keyIdea: 'Use a password manager and a long master passphrase.',
      change: {},
    },
  ],
};

export default lesson;
