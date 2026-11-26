import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'authentication',
  chapter: 'Security',
  title: 'Authentication',
  summary:
    'Prove who someone is without storing their password, survive bots guessing at logins, and keep them signed in safely.',
  minutes: 10,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How passwords are stored as slow salted hashes', stepId: 'passwords' },
    { text: 'Why login endpoints attract attacks', stepId: 'stuffing-try' },
    { text: 'How throttling and second factors protect logins', stepId: 'throttle' },
    { text: 'Session cookies versus signed tokens', stepId: 'sessions' },
    { text: 'How signing in with another provider works', stepId: 'delegated' },
  ],
  initial: {
    nodes: [
      { id: 'members', kind: 'users', label: 'Members', x: 0, y: 3 },
      { id: 'bots', kind: 'users', label: 'Login bots', x: 0, y: 9, tag: 'noisy' },
      { id: 'auth', kind: 'server', label: 'Login service', x: 5, y: 6, capacity: 300 },
      { id: 'accounts', kind: 'database', label: 'Accounts', x: 10, y: 6, capacity: 3000 },
    ],
    links: [
      { id: 'members-auth', from: 'members', to: 'auth' },
      { id: 'bots-auth', from: 'bots', to: 'auth' },
      { id: 'auth-accounts', from: 'auth', to: 'accounts' },
    ],
    metrics: {
      users: 9000,
      requestsPerSec: 180,
      p95LatencyMs: 220,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'who',
      short: 'Who?',
      tag: 'IDEA',
      title: 'Who is this?',
      body: [
        '<b>Authentication</b> proves who someone is. <b>Authorization</b>, the next lesson, decides what they may do.',
        'A notes app handles 150 member logins a second. A few bots are also trying, about 30 a second.',
      ],
      keyIdea: 'Authenticate first; then authorize every action.',
      change: {
        flows: [
          { route: ['members', 'auth', 'accounts'], kind: 'request', ratePerSec: 150 },
          { route: ['bots', 'auth', 'accounts'], kind: 'request', ratePerSec: 30 },
        ],
      },
    },
    {
      id: 'passwords',
      short: 'Passwords',
      tag: 'IDEA',
      title: 'Never store the password',
      body: [
        'Store a <b>hash</b>: a one-way fingerprint of the password plus a random <b>salt</b> unique to each user. At login, hash what was typed and compare.',
        'Use a deliberately slow password-hashing function, about 100 ms of CPU per check, so a stolen table takes years to crack. That is also why one login server manages only about 300 checks a second.',
      ],
      keyIdea: 'Salted, slow hashes make stolen password tables nearly useless.',
      change: { update: { nodes: [{ id: 'accounts', sublabel: 'salted slow hashes' }] } },
    },
    {
      id: 'stuffing',
      short: 'Bots',
      tag: 'PROBLEM',
      title: 'Credential stuffing',
      body: [
        'Another site leaked millions of emails and passwords. Bots try each pair here, betting people reuse passwords. Most fail; a few succeed, and those accounts are taken over.',
      ],
      keyIdea: 'Your login page is attacked with other sites’ leaks.',
      change: {},
    },
    {
      id: 'stuffing-try',
      short: 'Flood',
      tag: 'TRY IT',
      title: 'The bots speed up',
      body: [
        'Predict: the bots try ten times faster. What happens to real members?',
        'Press <b>One client floods</b>. 450 login attempts a second reach a service that can check 300. About <b>a third</b> of real members cannot log in. The slow hash that protects passwords also makes logins easy to overload.',
      ],
      keyIdea: 'Expensive checks need protection in front of them.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'throttle',
      short: 'Throttle',
      tag: 'SOLUTION',
      title: 'Throttle logins, add a second factor',
      body: [
        'Limit attempts per IP address and per account, and add a challenge after a few failures. Offer a <b>second factor</b>, a code or passkey on the member’s phone, so a leaked password alone is not enough.',
      ],
      keyIdea: 'Limit guessing, and make passwords not the only key.',
      change: {
        remove: { links: ['members-auth', 'bots-auth'] },
        add: {
          nodes: [
            {
              id: 'guard',
              kind: 'shield',
              label: 'Login limits',
              sublabel: 'per IP · per account',
              x: 2.5,
              y: 6,
            },
          ],
          links: [
            { id: 'members-guard', from: 'members', to: 'guard' },
            { id: 'bots-guard', from: 'bots', to: 'guard' },
            { id: 'guard-auth', from: 'guard', to: 'auth' },
          ],
        },
        flows: [
          { route: ['members', 'guard', 'auth', 'accounts'], kind: 'request', ratePerSec: 150 },
          { route: ['bots', 'guard', 'auth', 'accounts'], kind: 'request', ratePerSec: 30 },
        ],
      },
    },
    {
      id: 'throttle-try',
      short: 'Flood again',
      tag: 'TRY IT',
      title: 'The bots try again',
      body: [
        'Predict: the same tenfold bots, now behind login limits.',
        'Press <b>One client floods</b>. Most bot attempts are refused at the limiter, cheaply, before any hashing. Members’ errors stay at <b>0%</b>.',
      ],
      keyIdea: 'Reject abusive attempts before the expensive work.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'sessions',
      short: 'Sessions',
      tag: 'IDEA',
      title: 'Staying signed in',
      body: [
        '<b>Session cookie</b>: a random id the server looks up on each request. Easy to revoke. Mark it <code>HttpOnly</code> and <code>Secure</code> so scripts cannot read it and it never travels unencrypted.',
        '<b>Signed token</b>: carries the user id and an expiry, checked without a lookup. Keep it short-lived, around 15 minutes, with a refresh token that can be revoked.',
      ],
      keyIdea: 'Sessions are easy to revoke; tokens are cheap to check. Use short lifetimes.',
      change: {},
    },
    {
      id: 'delegated',
      short: 'Sign in with',
      tag: 'IDEA',
      title: 'Let a provider check the password',
      body: [
        'With <b>single sign-on</b>, the app sends the user to an identity provider, which checks their password and second factor, then returns a signed statement of who they are. The app never sees the password.',
      ],
      keyIdea: 'Delegating login moves password risk to a provider built for it.',
      change: {},
    },
    {
      id: 'friction',
      short: 'Friction',
      tag: 'TRADE-OFF',
      title: 'Security that people tolerate',
      body: [
        'Locking accounts after 5 failures lets attackers lock out real users on purpose; slowing down and challenging is gentler. Every extra step loses some sign-ups. Passkeys reduce both risk and typing.',
      ],
      keyIdea: 'Balance protection with friction; prefer methods that are both safer and easier.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Prove it, safely',
      body: [
        'Salted slow hashes protect stored passwords, but made logins easy to flood: tenfold bots locked out a third of members. Login limits and a second factor kept members at 0% and leaked passwords useless.',
      ],
      keyIdea: 'Hash slowly, throttle early, add a second factor, keep sessions short.',
      change: {},
    },
  ],
};

export default lesson;
