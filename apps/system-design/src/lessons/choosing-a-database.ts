import type { InfraLesson } from './index';

const STORE = ['doc1', 'doc2', 'doc3'];
const STORE_Y = [1, 3.5, 6];

const lesson: InfraLesson = {
  slug: 'choosing-a-database',
  chapter: 'Storing data',
  title: 'Choosing a database',
  summary:
    'Relational, document, key-value and more: pick the store whose shape matches how the data is read.',
  minutes: 9,
  level: 'beginner',
  youWillLearn: [
    { text: 'What relational databases are best at', stepId: 'relational' },
    { text: 'When a document store fits better', stepId: 'documents' },
    { text: 'The main families of NoSQL stores', stepId: 'families' },
    { text: 'What you give up when you leave SQL', stepId: 'give-up' },
    { text: 'A simple way to decide', stepId: 'decide' },
  ],
  initial: {
    nodes: [
      { id: 'cooks', kind: 'users', label: 'Home cooks', x: 0, y: 6 },
      { id: 'app', kind: 'server', label: 'Recipe app', x: 5, y: 6, capacity: 2000 },
      {
        id: 'sql',
        kind: 'database',
        label: 'Relational DB',
        sublabel: 'recipes + orders',
        x: 10,
        y: 10,
        capacity: 400,
      },
    ],
    links: [
      { id: 'cooks-app', from: 'cooks', to: 'app' },
      { id: 'app-sql', from: 'app', to: 'sql' },
    ],
    metrics: {
      users: 3000,
      requestsPerSec: 300,
      p95LatencyMs: 180,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'one-db',
      short: 'One DB',
      tag: 'PROBLEM',
      title: 'Recipes do not fit in rows',
      body: [
        '<b>Pantry</b> stores recipes and grocery orders in one relational database. A recipe has ingredients, steps, tips, variations, each with different fields. Loading one recipe joins six tables.',
        'Recipe reads are 240 of the 300 queries a second, and they keep the database 75% busy.',
      ],
      keyIdea:
        'When every read reassembles one object from many tables, the shape is fighting you.',
      change: { flows: [{ route: ['cooks', 'app', 'sql'], kind: 'request', ratePerSec: 300 }] },
    },
    {
      id: 'relational',
      short: 'SQL',
      tag: 'IDEA',
      title: 'What relational databases do best',
      body: [
        'Tables with a fixed schema, joins across them, constraints such as "every order has a customer", and <b>transactions</b> that change several rows together or not at all.',
        'That is exactly what orders and payments need. It is the safe default.',
      ],
      keyIdea: 'Relational stores shine when data is connected and correctness matters.',
      change: {},
    },
    {
      id: 'documents',
      short: 'Documents',
      tag: 'SOLUTION',
      title: 'Store each recipe as one document',
      body: [
        'Recipes move to a <b>document store</b>: each recipe is one JSON document, read in one lookup by its id. Documents are spread over three nodes, and each is copied to a second node.',
        'Orders stay in the relational database, which drops to 15% busy. Each document node takes 80 reads a second.',
      ],
      keyIdea: 'Store data in the shape it is read in.',
      change: {
        add: {
          nodes: STORE.map((id, i) => ({
            id,
            kind: 'database' as const,
            label: `Document node ${i + 1}`,
            x: 10,
            y: STORE_Y[i] ?? 0,
            capacity: 300,
          })),
          links: STORE.map((id) => ({ id: `app-${id}`, from: 'app', to: id })),
        },
        update: { nodes: [{ id: 'sql', sublabel: 'orders' }] },
        flows: [
          ...STORE.map((id) => ({
            route: ['cooks', 'app', id],
            kind: 'request' as const,
            ratePerSec: 80,
          })),
          { route: ['cooks', 'app', 'sql'], kind: 'request', ratePerSec: 60 },
        ],
        metrics: { p95LatencyMs: 40 },
      },
    },
    {
      id: 'families',
      short: 'Families',
      tag: 'IDEA',
      title: 'The main families',
      body: [
        '<b>Key-value</b>: get and put by key, very fast (sessions, carts). <b>Document</b>: nested records by id (recipes, profiles). <b>Wide-column</b>: huge tables split by key (event logs). <b>Graph</b>: relationships first (who follows whom). <b>Search</b>: full-text and filters.',
      ],
      keyIdea: 'Each family is built around one access pattern.',
      change: {},
    },
    {
      id: 'node-dies',
      short: 'Lose a node',
      tag: 'TRY IT',
      title: 'Lose a document node',
      body: [
        'Predict: one of three document nodes dies. Do a third of recipes vanish?',
        'Press <b>Kill the primary database</b>. Reads for Document node 1 fail for about 4 seconds, about <b>27%</b> of requests. Then the app reads those recipes from their second copy on node 2, and errors return to 0%.',
      ],
      keyIdea: 'Many NoSQL stores spread and copy data across nodes by design.',
      change: {},
      breakActions: ['killDatabase'],
    },
    {
      id: 'give-up',
      short: 'Give up',
      tag: 'TRADE-OFF',
      title: 'What you give up',
      body: [
        '"Which recipes use flour?" needs an extra index, or a copy of the data kept up to date. Joins across documents happen in your code. Transactions often cover one document only.',
        'The schema has not disappeared either; it now lives in your code, where nothing checks it.',
      ],
      keyIdea: 'Flexible stores move work from the database into the application.',
      change: {},
    },
    {
      id: 'decide',
      short: 'Decide',
      tag: 'IDEA',
      title: 'Four questions to decide',
      body: [
        'What shape is the data? How is it read and written? How fresh and consistent must reads be? How big will it get?',
        'Start relational. Add another store when a specific access pattern needs it, as Pantry did for recipes.',
      ],
      keyIdea: 'Choose per access pattern, not per fashion.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'The right store for each job',
      body: [
        'Orders stayed relational for joins and transactions. Recipes moved to a document store that reads each one in a single lookup and survives losing a node. The cost is extra work in the app for queries across documents.',
      ],
      keyIdea: 'Using two stores well beats forcing one store to do everything.',
      change: {},
    },
  ],
};

export default lesson;
