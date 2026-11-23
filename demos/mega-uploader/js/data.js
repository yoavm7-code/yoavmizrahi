/* Mega Uploader demo: every name and number the replica shows lives here, and all of it is invented.
   Ad networks keep their public names. People, partners, accounts, sites and figures are made up.
   Derived figures (totals, profit, ROAS, counts) are computed in logic.js, never typed here. */

export const ORG = 'Growth Lab';
export const USER = { name: 'Dana Levi', role: 'Team Lead', initials: 'DL', email: 'dana@example.com' };
export const TEAMMATES = ['noa.k', 'amit', 'yoni', 'dana'];
export const SITE = 'read.example';

/* ---------- Ad platforms ---------- */
/* color is the platform dot; sub is the feed or product line shown under the name. */

export const PLATFORMS = [
  { id: 'outbrain', name: 'Outbrain', sub: 'via Northwind', color: '#e8742c' },
  { id: 'taboola', name: 'Taboola', sub: 'via Northwind', color: '#2f6fd6' },
  { id: 'mediago', name: 'MediaGo', sub: 'via Northwind', color: '#1aa79c' },
  { id: 'facebook', name: 'Facebook', sub: 'Meta Ads', color: '#2f6fd6' },
  { id: 'tiktok', name: 'TikTok', sub: 'Business', color: '#e0385c' },
  { id: 'google', name: 'Google Ads', sub: 'RSOC', color: '#2e9a52' },
  { id: 'pinterest', name: 'Pinterest', sub: 'Harbor Club', color: '#d6342c' },
  { id: 'x', name: 'X', sub: 'Harbor Club', color: '#545b6a' },
  { id: 'newsbreak', name: 'NewsBreak', sub: 'via Northwind', color: '#d6342c' },
  { id: 'mgid', name: 'MGID', sub: 'via Northwind', color: '#4553c9' },
  { id: 'chatgpt', name: 'ChatGPT', sub: 'Harbor Club', color: '#16a37a' },
  { id: 'revcontent', name: 'Revcontent', sub: 'via Northwind', color: '#8a49c9' }
];

/* ---------- Feed partners (all invented) ---------- */

export const FEEDS = [
  { id: 'northwind', name: 'NORTHWIND RSOC', short: 'Northwind', color: '#e8742c', count: 5 },
  { id: 'bluefin', name: 'Bluefin', short: 'Bluefin', color: '#2f6fd6', count: 1 },
  { id: 'atlas', name: 'Atlas Search', short: 'Atlas', color: '#8a49c9', count: 0 },
  { id: 'kestrel', name: 'Kestrel', short: 'Kestrel', color: '#1aa79c', count: 0 },
  { id: 'harbor', name: 'Harbor Club', short: 'Harbor', color: '#2e9a52', count: 0 },
  { id: 'lumen', name: 'Lumen', short: 'Lumen', color: '#d6342c', count: 0 }
];

/* ---------- Dashboard ---------- */

export const DASHBOARD = {
  spend: 1284630.20,
  /* Profit per platform. Total profit, revenue and ROAS are derived from these and spend. */
  profit: [
    { platform: 'facebook', value: 88412.30 },
    { platform: 'google', value: 61905.14 },
    { platform: 'taboola', value: 44870.02 },
    { platform: 'outbrain', value: 21336.75 },
    { platform: 'mediago', value: 12040.60 },
    { platform: 'pinterest', value: 4202.88 },
    { platform: 'tiktok', value: -1534.25 }
  ],
  /* One row per platform in the "Platforms · click to open" list. */
  platformRows: [
    { platform: 'facebook', accounts: 212, runs: 344, daysAgo: 0 },
    { platform: 'taboola', accounts: 168, runs: 301, daysAgo: 0 },
    { platform: 'google', accounts: 61, runs: 287, daysAgo: 1 },
    { platform: 'outbrain', accounts: 54, runs: 198, daysAgo: 0 },
    { platform: 'tiktok', accounts: 47, runs: 176, daysAgo: 1 },
    { platform: 'mediago', accounts: 19, runs: 122, daysAgo: 2 },
    { platform: 'pinterest', accounts: 12, runs: 38, daysAgo: 6 },
    { platform: 'x', accounts: 6, runs: 9, daysAgo: 21 },
    { platform: 'newsbreak', accounts: 5, runs: 11, daysAgo: 9 },
    { platform: 'mgid', accounts: 3, runs: 6, daysAgo: 14 },
    { platform: 'chatgpt', accounts: 2, runs: 3, daysAgo: 30 },
    { platform: 'revcontent', accounts: 1, runs: 4, daysAgo: 11 }
  ],
  libraryByFeed: [
    { label: 'Northwind', value: 61204 },
    { label: 'Harbor Club', value: 12880 },
    { label: 'Bluefin', value: 5310 },
    { label: 'Atlas Search', value: 2742 },
    { label: 'Kestrel', value: 1655 },
    { label: 'unresolved', value: 824 }
  ],
  topGeos: [
    { label: 'US', value: 21480 },
    { label: 'DE', value: 14215 },
    { label: 'UK', value: 9870 },
    { label: 'FR', value: 7302 },
    { label: 'CA', value: 5118 },
    { label: 'AU', value: 4460 },
    { label: 'IT', value: 3905 },
    { label: 'ES', value: 3212 }
  ],
  verticals: 730,
  geos: 96,
  languages: 41
};

/* ---------- Workspace ---------- */

export const GEOS = ['US', 'UK', 'DE', 'FR', 'CA', 'AU', 'IT', 'ES', 'NL', 'MX'];
export const LANGS = { US: 'en', UK: 'en', CA: 'en', AU: 'en', DE: 'de', FR: 'fr', IT: 'it', ES: 'es', NL: 'nl', MX: 'es' };
export const STRATEGIES = ['Semi · CPC', 'Smart · CPA', 'Max · ROAS', 'Manual · CPC'];
export const KEYWORD_LISTS = ['—', 'Evergreen', 'Seasonal', 'Brand-safe'];

/* code is the short form used in campaign names. Headlines and keywords are used by the auto-fill tools. */
export const VERTICALS = [
  { name: 'Dental Implants', code: 'dent', headlines: ['See the best dental implant offers', 'Dental implants: what they cost in {year}'], keywords: ['dental implants', 'implant cost', 'dentist near me', 'tooth replacement'] },
  { name: 'Solar Panels', code: 'solr', headlines: ['How much solar panels save you', 'Solar panels: the {year} price guide'], keywords: ['solar panels', 'home solar', 'solar cost', 'solar installers'] },
  { name: 'Senior Living', code: 'senl', headlines: ['Senior living options near you', 'Compare senior living communities'], keywords: ['senior living', 'assisted living', 'retirement homes', 'care homes'] },
  { name: 'Online MBA', code: 'omba', headlines: ['Earn an MBA online, on your schedule', 'Top online MBA programs this year'], keywords: ['online mba', 'mba programs', 'business degree', 'part-time mba'] },
  { name: 'Home Insurance', code: 'hins', headlines: ['Compare home insurance quotes in minutes', 'Are you overpaying for home insurance?'], keywords: ['home insurance', 'insurance quotes', 'homeowners policy', 'cheap cover'] },
  { name: 'Credit Cards', code: 'crdc', headlines: ['Guaranteed approval cards for {year}', 'Cards with cashback on every purchase'], keywords: ['credit cards', 'cashback card', 'travel rewards', 'card offers'] },
  { name: 'Hearing Aids', code: 'hear', headlines: ['Modern hearing aids, almost invisible', 'Hearing aids: compare the top brands'], keywords: ['hearing aids', 'hearing test', 'invisible aids', 'audiologist'] },
  { name: 'Used Cars', code: 'ucar', headlines: ['Find a reliable used car near you', 'Used cars under budget this month'], keywords: ['used cars', 'certified pre-owned', 'car deals', 'cheap cars'] },
  { name: 'Kitchen Remodel', code: 'kitr', headlines: ['Kitchen remodel ideas on a budget', 'What a kitchen remodel really costs'], keywords: ['kitchen remodel', 'cabinets', 'countertops', 'renovation cost'] },
  { name: 'Pet Insurance', code: 'peti', headlines: ['Pet insurance plans compared', 'Is pet insurance worth it?'], keywords: ['pet insurance', 'dog insurance', 'cat insurance', 'vet bills'] }
];

/* Accounts a row can upload to. "Auto" lets Resolve accounts pick one. */
export const ACCOUNTS = ['Auto', 'Northwind EN 3', 'Northwind EN 8', 'Northwind DE 2', 'Northwind FR 1', 'Northwind EU 5', 'Northwind ES 4'];

export const WORKSPACE = {
  id: 41,
  platform: 'outbrain',
  feed: 'northwind',
  tabs: ['Wave 0', 'Wave 1', 'Workspace 3', 'Workspace 4', 'Workspace 5'],
  rows: 20,
  /* The one row filled in when the demo opens, built and resolved on an earlier day. */
  firstRow: {
    prefix: 'dl', geo: 'CA', vertical: 'Solar Panels', lang: 'en', account: 'Northwind EN 8',
    url: 'https://' + SITE + '/en/solar-panels-guide', offer: '2718',
    asset: 'img-solr-07', headline: 'How much solar panels save you',
    keywords: 'solar panels, home solar, solar cost', bid: '0.04', strategy: 'Semi · CPC',
    resolved: { nwId: '4410273', site: 'https://go.' + SITE + '/d/4410273', destId: 'dest=Q7bK2m', tracking: 'dest=Q7bK2m&t=nw' },
    stale: true
  },
  /* The run that is already in the live run panel when the demo opens. */
  lastRun: { daysAgo: 2, uploaded: 1, total: 1, time: '11:06:42' }
};

/* Creative thumbnails: generated as small gradient tiles, so no real ad image is shipped. */
export const ASSETS = ['#e9b384', '#9cc5e8', '#b7d9a8', '#e7a1b0', '#c7b5e6', '#f1d58a', '#a6d6d2', '#d9b08c'];

/* ---------- Run history ---------- */
/* status is derived from live and failed in logic.js. time is the clock time; daysAgo groups the list. */

export const RUNS = [
  { id: 1180, platform: 'tiktok', feed: 'NORTHWIND RSOC', user: 'noa.k', campaigns: 14, live: 14, failed: 0, time: '07:15', daysAgo: 0, workspace: 880, took: '2m 04s' },
  { id: 1179, platform: 'tiktok', feed: 'NORTHWIND RSOC', user: 'noa.k', campaigns: 33, live: 31, failed: 2, time: '06:40', daysAgo: 0, workspace: 879, took: '4m 47s' },
  { id: 1178, platform: 'taboola', feed: 'NORTHWIND RSOC', user: 'amit', campaigns: 26, live: 25, failed: 1, time: '05:52', daysAgo: 0, workspace: 876, took: '3m 38s' },
  { id: 1177, platform: 'facebook', feed: 'Harbor Club', user: 'yoni', campaigns: 5, live: 5, failed: 0, time: '03:20', daysAgo: 0, workspace: 875, took: '44s' },
  { id: 1176, platform: 'outbrain', feed: 'Harbor Club', user: 'amit', campaigns: 11, live: 10, failed: 1, time: '01:05', daysAgo: 0, workspace: 872, took: '1m 31s' },
  { id: 1175, platform: 'tiktok', feed: 'Harbor Club', user: 'noa.k', campaigns: 19, live: 18, failed: 1, time: '23:41', daysAgo: 1, workspace: 871, took: '2m 49s' },
  { id: 1174, platform: 'google', feed: 'NORTHWIND RSOC', user: 'dana', campaigns: 15, live: 15, failed: 0, time: '19:26', daysAgo: 1, workspace: 868, took: '2m 12s' },
  { id: 1173, platform: 'google', feed: 'NORTHWIND RSOC', user: 'dana', campaigns: 6, live: 6, failed: 0, time: '16:52', daysAgo: 1, workspace: 867, took: '51s' },
  { id: 1172, platform: 'google', feed: 'NORTHWIND RSOC', user: 'dana', campaigns: 5, live: 0, failed: 5, time: '16:48', daysAgo: 1, workspace: 866, took: '9s', task: 'tsk0412' },
  { id: 1171, platform: 'facebook', feed: 'NORTHWIND RSOC', user: 'yoni', campaigns: 29, live: 28, failed: 1, time: '15:57', daysAgo: 1, workspace: 864, took: '4m 10s' },
  { id: 1170, platform: 'facebook', feed: 'NORTHWIND RSOC', user: 'yoni', campaigns: 38, live: 36, failed: 2, time: '15:23', daysAgo: 1, workspace: 863, took: '5m 26s' },
  { id: 1169, platform: 'facebook', feed: 'Bluefin', user: 'amit', campaigns: 2, live: 0, failed: 2, time: '14:36', daysAgo: 1, workspace: 860, took: '6s' },
  { id: 1168, platform: 'mediago', feed: 'NORTHWIND RSOC', user: 'noa.k', campaigns: 14, live: 14, failed: 0, time: '15:20', daysAgo: 1, workspace: 858, took: '2m 02s' },
  { id: 1167, platform: 'outbrain', feed: 'NORTHWIND RSOC', user: 'dana', campaigns: 22, live: 21, failed: 1, time: '13:48', daysAgo: 1, workspace: 857, took: '3m 15s' },
  { id: 1166, platform: 'taboola', feed: 'Bluefin', user: 'amit', campaigns: 9, live: 9, failed: 0, time: '11:05', daysAgo: 2, workspace: 854, took: '1m 22s' },
  { id: 1165, platform: 'pinterest', feed: 'Harbor Club', user: 'yoni', campaigns: 5, live: 5, failed: 0, time: '10:41', daysAgo: 2, workspace: 853, took: '49s' },
  { id: 1164, platform: 'tiktok', feed: 'NORTHWIND RSOC', user: 'noa.k', campaigns: 28, live: 25, failed: 3, time: '09:12', daysAgo: 2, workspace: 850, took: '4m 18s' },
  { id: 1163, platform: 'google', feed: 'NORTHWIND RSOC', user: 'dana', campaigns: 16, live: 16, failed: 0, time: '16:30', daysAgo: 3, workspace: 846, took: '2m 20s' },
  { id: 1162, platform: 'facebook', feed: 'NORTHWIND RSOC', user: 'yoni', campaigns: 40, live: 37, failed: 3, time: '14:02', daysAgo: 3, workspace: 844, took: '5m 51s' },
  { id: 1161, platform: 'outbrain', feed: 'Atlas Search', user: 'amit', campaigns: 4, live: 0, failed: 4, time: '12:16', daysAgo: 4, workspace: 841, took: '5s' }
];

/* Failure messages, by platform where it matters. Shaped like real platform errors, all invented. */
export const FAILURES = {
  google: 'every Google account for site \'nw\' is full (Site_1, Site_2, Site_3): each holds as many Performance Max campaigns as Google allows, paused ones included',
  facebook: 'Missing Page permission: the ad account has no access to the Page, give it access and re-run',
  tiktok: 'Rejected in review: thumbnail has poor editing or cropping',
  outbrain: 'Policy: landing page does not match the ad text',
  taboola: 'You reached your limit for active campaigns on this account',
  financial: 'Policy: financial claims. "Guaranteed approval" is not allowed in a headline',
  default: 'Every eligible account is at its campaign limit'
};

/* ---------- Shell ---------- */

export const NOTIFICATIONS = {
  accounts: [
    { title: 'ACC_014: Suspended, no uploads', sub: 'Google · verifications sheet', tone: 'red' },
    { title: 'Northwind_EN_3: Due in 4 days', sub: 'Facebook · verifications sheet · due in 4 days', tone: 'grey' }
  ],
  bugs: [
    { title: 'A rule assigned it to dana', sub: '#412 · Headline count is off by one', age: '3d', tone: 'amber' },
    { title: 'noa.k filed this report', sub: '#411 · Export CSV skips the Bid column', age: '3d', tone: 'grey' },
    { title: 'amit moved this In Review → Done', sub: '#405 · Keep tab colors after duplicate', age: '4d', tone: 'violet' },
    { title: 'yoni filed this report', sub: '#403 · Live run panel jumps on resize', age: '5d', tone: 'grey' }
  ]
};

/* Tips only describe features the replica itself shows. */
export const TIPS = [
  { title: 'Fill a whole grid in two clicks', body: 'Data → Auto-fill creatives and Auto-generate headlines fill every empty row from its vertical.', meta: 'SHIPPED · 2D' },
  { title: 'Resolve before you upload', body: 'Resolve creates one partner campaign per row and fills the link columns. Resolve & upload goes live as links come in.', meta: 'SHIPPED · 5D' },
  { title: 'Every run is traced', body: 'Open Run history and expand a campaign to see each upload step and every creative it sent.', meta: 'SHIPPED · 1W' },
  { title: 'Press / to search', body: 'The search box at the top finds rows, runs and accounts from anywhere.', meta: 'SHIPPED · 2W' }
];

/* Sidebar. screen marks the pages this demo includes; everything else answers with a short note. */
export const NAV = [
  { section: 'FAVORITES', items: [['Accounts', 'users'], ['Reports', 'chart'], ['Workspace', 'grid', 'workspace'], ['Office days', 'calendar'], ['Bugs & Features', 'bug'], ['Run history', 'clock', 'history'], ['System settings', 'settings']] },
  { section: 'RECENT', items: [['Self Heal', 'heal'], ['Articles', 'file'], ['Buyer prefixes', 'bookmark']] },
  { section: '', items: [['Dashboard', 'dashboard', 'dashboard']] },
  { section: 'BUILD & UPLOAD', items: [['Workspace', 'grid', 'workspace'], ['Run history', 'clock', 'history'], ['Bulk World tasks', 'download']] },
  { section: 'CREATE', items: [['Article Generator', 'plus'], ['Creative Studio', 'trend']] },
  { section: 'PERFORMANCE', items: [['Campaigns', 'search'], ['Reports', 'chart'], ['Data health', 'pulse']] },
  { section: 'LIBRARY', items: [['Articles', 'file'], ['Creatives', 'image'], ['Keywords', 'key'], ['Coverage', 'layers']] },
  { section: 'CHECKS & FIXES', items: [['Source Check', 'check'], ['Live Check', 'pulse'], ['Self Heal', 'heal']] },
  { section: 'MANAGE', items: [['Accounts', 'users'], ['Lists', 'list'], ['Archive', 'archive'], ['Trash', 'trash']] },
  { section: 'ADMIN', items: [['Users', 'users'], ['Activity', 'pulse'], ['Deployments', 'upload'], ['System settings', 'settings'], ['Help center', 'help']] }
];

/* Canned answers for the Ask drawer. Each one describes something the demo really does. */
export const ASK = [
  { q: 'Why did a campaign fail?', a: 'Open Run history and pick a run with a red count. Expand the red row: the Outcome column has the platform\'s message, and the upload trace shows which step stopped. In this demo the usual one is a headline that breaks the financial claims policy. Edit the Headline cell and run it again.' },
  { q: 'How do I fill a grid fast?', a: 'Use Data → Fill example data for the basics, then Data → Auto-fill creatives and Data → Auto-generate headlines. Every empty required cell (the red ones) fills from the row\'s vertical. The count next to the tab name tells you how many campaigns are ready.' },
  { q: 'What does Resolve do?', a: 'Resolve creates one Northwind campaign per row and fills Northwind ID, Website From Northwind, Dest ID and Tracking Code. Resolve only stops there. Resolve & upload goes live as the links come in.' }
];
