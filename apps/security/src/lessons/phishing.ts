import type { CourseLesson } from './index';

const lesson: CourseLesson = {
  slug: 'phishing',
  chapter: 'Logins',
  title: 'Phishing',
  summary:
    'A convincing email tricks you into typing your password on a fake page, and your email unlocks everything else.',
  minutes: 7,
  level: 'beginner',
  youWillLearn: [
    { text: 'What a phishing email looks like', stepId: 'the-email' },
    { text: 'Why your email is the master key', stepId: 'master-key' },
    { text: 'How to spot and avoid fake login pages', stepId: 'spot-it' },
    { text: 'How 2FA on email limits the damage', stepId: 'blocked' },
  ],
  initial: {
    nodes: [
      { id: 'you', kind: 'person', label: 'You', x: 0, y: 5 },
      { id: 'mail', kind: 'inbox', label: 'Your email', x: 5, y: 5 },
      { id: 'shop', kind: 'service', label: 'Online shop', x: 11, y: 1.5 },
      { id: 'bank', kind: 'service', label: 'Bank', x: 11, y: 5, value: 2400 },
      { id: 'social', kind: 'service', label: 'Social media', x: 11, y: 8.5 },
      { id: 'thief', kind: 'attacker', label: 'Fake login page', x: 5, y: 10.5 },
    ],
    links: [
      { id: 'you-mail', from: 'you', to: 'mail' },
      { id: 'thief-mail', from: 'thief', to: 'mail', style: 'dashed' },
    ],
    metrics: { safe: [3, 3], reused: 0, filesLockedPct: 0, recoveryDays: 0, moneyLost: 0 },
  },
  steps: [
    {
      id: 'the-email',
      short: 'Email',
      tag: 'PROBLEM',
      title: '"Your mailbox is full"',
      body: [
        'An email says your mailbox is full and will be closed today unless you log in. The logo looks right. The link goes to a page that looks exactly like your email login.',
        'It is a copy, run by an attacker, built to collect whatever you type.',
      ],
      keyIdea: 'Phishing works by urgency and imitation, not technical tricks.',
      change: {
        flows: [{ route: ['thief', 'mail'], kind: 'request', ratePerSec: 2 }],
      },
    },
    {
      id: 'master-key',
      short: 'Master key',
      tag: 'IDEA',
      title: 'Your email resets everything',
      body: [
        'Every "forgot password?" link sends a reset to your email. Whoever controls your inbox can reset the shop, the bank and social media.',
        'Each account here has its own password, and it does not matter: the reset bypasses them.',
      ],
      keyIdea: 'Your email account is the master key to your online life.',
      change: {
        add: {
          links: [
            { id: 'mail-shop', from: 'mail', to: 'shop', label: 'resets', style: 'dashed' },
            { id: 'mail-bank', from: 'mail', to: 'bank', style: 'dashed' },
            { id: 'mail-social', from: 'mail', to: 'social', style: 'dashed' },
          ],
        },
      },
    },
    {
      id: 'click',
      short: 'Click',
      tag: 'TRY IT',
      title: 'Type the password into the fake page',
      body: [
        'Press <b>Click the phishing link</b>. You log in on the fake page, and the attacker logs into your real email seconds later.',
        'They reset all three accounts and empty the <b>$2,400</b> from the bank.',
      ],
      keyIdea: 'One phished email password can cost every account linked to it.',
      change: {},
      breakActions: ['phishingClick'],
    },
    {
      id: 'spot-it',
      short: 'Spot it',
      tag: 'SOLUTION',
      title: 'Never log in from a link',
      body: [
        'Look at the sender’s real address and the link’s real destination. Be suspicious of urgency, threats and prizes.',
        'Best habit: do not log in from email links at all. Open the site yourself, from a bookmark or by typing it.',
      ],
      keyIdea: 'Go to the site yourself instead of following the link.',
      change: {},
    },
    {
      id: 'protect-email',
      short: 'Protect',
      tag: 'SOLUTION',
      title: 'Put 2FA on your email',
      body: [
        'Add a security key to your email login. Even if you type your password into a fake page, the attacker cannot finish logging in.',
      ],
      keyIdea: 'Protect the master key with the strongest lock you have.',
      change: {
        add: {
          nodes: [
            { id: 'key', kind: 'shield', label: '2FA', sublabel: 'security key', x: 5, y: 8 },
          ],
          links: [
            { id: 'thief-key', from: 'thief', to: 'key', style: 'dashed' },
            { id: 'key-mail', from: 'key', to: 'mail' },
          ],
        },
        remove: { links: ['thief-mail'] },
        flows: [],
      },
    },
    {
      id: 'blocked',
      short: 'Blocked',
      tag: 'TRY IT',
      title: 'Fall for it again, safely',
      body: [
        'Press <b>Click the phishing link</b> again. The password is stolen, but the login stops at the security key. No resets, no losses.',
      ],
      keyIdea: 'Layers of defence forgive human mistakes.',
      change: {},
      breakActions: ['phishingClick'],
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Guard the inbox',
      body: [
        'Phishing tricks people, not computers. Your email resets everything else, so open sites yourself rather than via links, and protect email with 2FA.',
        'Next: an attack on your files rather than your accounts.',
      ],
      keyIdea: 'Slow down when an email makes you hurry.',
      change: {},
    },
  ],
};

export default lesson;
