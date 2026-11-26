import type { CourseLesson } from './index';

const lesson: CourseLesson = {
  slug: 'ransomware-and-backups',
  chapter: 'Your files',
  title: 'Ransomware and backups',
  summary:
    'Malware locks every file on your laptop and demands payment. Only the right kind of backup brings them back.',
  minutes: 7,
  level: 'beginner',
  youWillLearn: [
    { text: 'What ransomware does', stepId: 'locked' },
    { text: 'Why always-connected sync is not a backup', stepId: 'sync' },
    { text: 'Why an offline copy saves you', stepId: 'restored' },
    { text: 'The 3-2-1 backup rule', stepId: 'three-two-one' },
  ],
  initial: {
    nodes: [
      { id: 'you', kind: 'person', label: 'You', x: 0, y: 5 },
      {
        id: 'laptop',
        kind: 'device',
        label: 'Your laptop',
        sublabel: '10 years of photos',
        x: 5,
        y: 5,
      },
      { id: 'thief', kind: 'attacker', label: 'Malicious attachment', x: 11, y: 5 },
    ],
    links: [
      { id: 'you-laptop', from: 'you', to: 'laptop' },
      { id: 'thief-laptop', from: 'thief', to: 'laptop', style: 'dashed' },
    ],
    metrics: { safe: [1, 1], reused: 0, filesLockedPct: 0, recoveryDays: 0, moneyLost: 0 },
  },
  steps: [
    {
      id: 'one-copy',
      short: 'One copy',
      tag: 'PROBLEM',
      title: 'Everything lives on one laptop',
      body: [
        'Ten years of photos, documents and work, all on one laptop, with no other copy.',
        'An invoice arrives as an attachment. It is not an invoice.',
      ],
      keyIdea: 'Data that exists in one place can disappear in one moment.',
      change: {},
    },
    {
      id: 'locked',
      short: 'Locked',
      tag: 'TRY IT',
      title: 'Ransomware strikes',
      body: [
        'Press <b>Ransomware strikes</b>. The attachment encrypts every file and shows a demand: pay <b>$1,500</b> to get the key.',
        'Paying funds the criminals and is no guarantee of getting anything back. Without a backup, recovery takes weeks, if it is possible at all.',
      ],
      keyIdea: 'Ransomware turns your own files into a hostage.',
      change: {},
      breakActions: ['ransomware'],
    },
    {
      id: 'sync',
      short: 'Sync',
      tag: 'PROBLEM',
      title: 'Cloud sync is not a backup',
      body: [
        'You add a cloud folder that syncs constantly. Try <b>Ransomware strikes</b> again.',
        'The sync faithfully copies the encrypted files over the good ones. Always connected means always reachable by the malware.',
      ],
      keyIdea: 'Sync copies mistakes and attacks as quickly as it copies files.',
      change: {
        add: {
          nodes: [
            {
              id: 'sync',
              kind: 'database',
              label: 'Cloud sync',
              sublabel: 'always connected',
              x: 5,
              y: 10,
              tag: 'online',
            },
          ],
          links: [{ id: 'laptop-sync', from: 'laptop', to: 'sync' }],
        },
      },
      breakActions: ['ransomware'],
    },
    {
      id: 'offline',
      short: 'Offline',
      tag: 'SOLUTION',
      title: 'Keep a copy the malware cannot reach',
      body: [
        'Once a week you back up to an external drive, then <b>unplug it</b>. Many cloud backup services also keep old versions that cannot be overwritten.',
      ],
      keyIdea: 'A backup protects you only if an attacker cannot reach it.',
      change: {
        add: {
          nodes: [
            {
              id: 'drive',
              kind: 'database',
              label: 'External drive',
              sublabel: 'unplugged',
              x: 0,
              y: 10,
              tag: 'offline',
            },
          ],
          links: [{ id: 'laptop-drive', from: 'laptop', to: 'drive', style: 'dashed' }],
        },
      },
    },
    {
      id: 'restored',
      short: 'Restore',
      tag: 'TRY IT',
      title: 'Strike again, and restore',
      body: [
        'Press <b>Ransomware strikes</b>. The laptop and the sync folder are locked again, but the unplugged drive is untouched.',
        'You wipe the laptop and restore from the drive. Back to normal in about a day, and nothing paid.',
      ],
      keyIdea: 'With an offline backup, ransomware is an inconvenience, not a disaster.',
      change: {},
      breakActions: ['ransomware'],
    },
    {
      id: 'three-two-one',
      short: '3-2-1',
      tag: 'TRADE-OFF',
      title: 'The 3-2-1 rule',
      body: [
        'Keep <b>3</b> copies of what matters, on <b>2</b> different kinds of storage, with <b>1</b> kept away from home or offline.',
        'And test a restore now and then: a backup you have never restored is a hope, not a plan.',
      ],
      keyIdea: 'Backups are only real once you have restored from one.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Copies that cannot be reached',
      body: [
        'Ransomware encrypts whatever it can reach, including always-connected sync. An offline or versioned backup is what makes recovery quick and free.',
      ],
      keyIdea: 'Back up, disconnect, and test.',
      change: {},
    },
  ],
};

export default lesson;
