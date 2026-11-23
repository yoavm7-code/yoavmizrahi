/* Mega Uploader demo: every name and number the replica shows lives here, and all of it is invented.
   Ad platforms keep their public names. People, brands, accounts, sites and figures are made up, and the
   workflow is kept generic: a team launching ads for several brands on several platforms.
   Derived figures (totals, rates, counts) are computed in logic.js, never typed here. */

export const ORG = 'Growth Lab';
export const USER = { name: 'Dana Levi', role: 'Team Lead', initials: 'DL', email: 'dana@example.com' };
export const TEAMMATES = ['noa.k', 'amit', 'yoni', 'dana'];
export const SITE = 'brand.example';

/* ---------- Ad platforms ---------- */
/* color is the platform dot; sub is the product line shown under the name. */

export const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', sub: 'Meta Ads', color: '#2f6fd6' },
  { id: 'google', name: 'Google Ads', sub: 'Search · Display', color: '#2e9a52' },
  { id: 'tiktok', name: 'TikTok', sub: 'TikTok Ads', color: '#e0385c' },
  { id: 'pinterest', name: 'Pinterest', sub: 'Pinterest Ads', color: '#d6342c' },
  { id: 'snapchat', name: 'Snapchat', sub: 'Snap Ads', color: '#d9a400' },
  { id: 'linkedin', name: 'LinkedIn', sub: 'Campaign Manager', color: '#1f6fb2' },
  { id: 'microsoft', name: 'Microsoft Ads', sub: 'Search', color: '#1aa79c' },
  { id: 'x', name: 'X', sub: 'X Ads', color: '#545b6a' }
];

/* ---------- Brands (the team's clients, all invented) ---------- */

export const BRANDS = [
  { id: 'brightside', name: 'Brightside Home', short: 'Brightside', color: '#e8742c', count: 5 },
  { id: 'pine', name: 'Pine & Co', short: 'Pine', color: '#2e9a52', count: 2 },
  { id: 'lumen', name: 'Lumen Skin', short: 'Lumen', color: '#8a49c9', count: 1 },
  { id: 'kestrel', name: 'Kestrel Bikes', short: 'Kestrel', color: '#1aa79c', count: 0 },
  { id: 'harbor', name: 'Harbor Pets', short: 'Harbor', color: '#2f6fd6', count: 0 }
];

/* ---------- Dashboard ---------- */

export const DASHBOARD = {
  /* Campaigns launched in the last 30 days, per platform. Totals and the success rate are derived. */
  launched: [
    { platform: 'facebook', live: 412, failed: 9 },
    { platform: 'google', live: 286, failed: 14 },
    { platform: 'tiktok', live: 173, failed: 11 },
    { platform: 'pinterest', live: 64, failed: 2 },
    { platform: 'snapchat', live: 41, failed: 3 },
    { platform: 'linkedin', live: 22, failed: 0 }
  ],
  /* One row per platform in the "Platforms · click to open" list. */
  platformRows: [
    { platform: 'facebook', accounts: 9, runs: 58, daysAgo: 0 },
    { platform: 'google', accounts: 7, runs: 41, daysAgo: 0 },
    { platform: 'tiktok', accounts: 5, runs: 33, daysAgo: 1 },
    { platform: 'pinterest', accounts: 3, runs: 12, daysAgo: 2 },
    { platform: 'snapchat', accounts: 2, runs: 9, daysAgo: 4 },
    { platform: 'linkedin', accounts: 2, runs: 5, daysAgo: 6 },
    { platform: 'microsoft', accounts: 1, runs: 3, daysAgo: 12 },
    { platform: 'x', accounts: 1, runs: 1, daysAgo: 25 }
  ],
  creativesByBrand: [
    { label: 'Brightside Home', value: 1840 },
    { label: 'Pine & Co', value: 960 },
    { label: 'Lumen Skin', value: 715 },
    { label: 'Kestrel Bikes', value: 388 },
    { label: 'Harbor Pets', value: 214 }
  ],
  topGeos: [
    { label: 'US', value: 392 },
    { label: 'UK', value: 188 },
    { label: 'DE', value: 141 },
    { label: 'CA', value: 97 },
    { label: 'FR', value: 76 },
    { label: 'AU', value: 51 },
    { label: 'NL', value: 33 },
    { label: 'ES', value: 25 }
  ],
  verticals: 10,
  geos: 10,
  languages: 6
};

/* ---------- Workspace ---------- */

export const GEOS = ['US', 'UK', 'DE', 'FR', 'CA', 'AU', 'IT', 'ES', 'NL', 'MX'];
export const LANGS = { US: 'en', UK: 'en', CA: 'en', AU: 'en', DE: 'de', FR: 'fr', IT: 'it', ES: 'es', NL: 'nl', MX: 'es' };
export const STRATEGIES = ['Lowest cost', 'Target CPA', 'Target ROAS', 'Manual CPC'];
export const KEYWORD_LISTS = ['—', 'Evergreen', 'Seasonal', 'Brand-safe'];

/* code names the image files. Headlines and keywords are used by the auto-fill tools. */
export const VERTICALS = [
  { name: 'Home Fitness', code: 'fit', headlines: ['A full workout in 20 minutes at home', 'Home gym gear for small spaces'], keywords: ['home workout', 'dumbbells', 'yoga mat', 'resistance bands'] },
  { name: 'Meal Kits', code: 'meal', headlines: ['Dinner ready in 15 minutes', 'Fresh meal kits, delivered weekly'], keywords: ['meal kits', 'easy dinners', 'recipe box', 'healthy meals'] },
  { name: 'Language Apps', code: 'lang', headlines: ['Speak Spanish in 10 minutes a day', 'Learn a language on your commute'], keywords: ['learn spanish', 'language app', 'learn french', 'vocabulary'] },
  { name: 'Travel Deals', code: 'trav', headlines: ['Weekend trips under budget', 'Last-minute city breaks for {year}'], keywords: ['city breaks', 'cheap flights', 'weekend trips', 'hotel deals'] },
  { name: 'Smart Home', code: 'home', headlines: ['Lights that follow your routine', 'Make any room a smart room'], keywords: ['smart bulbs', 'smart plug', 'home automation', 'voice control'] },
  { name: 'Credit Cards', code: 'card', headlines: ['Guaranteed approval cards for {year}', 'Cards with cashback on every purchase'], keywords: ['credit cards', 'cashback card', 'travel rewards', 'card offers'] },
  { name: 'Pet Food', code: 'pet', headlines: ['Fresh food your dog will finish', 'Pet food made in small batches'], keywords: ['dog food', 'cat food', 'fresh pet food', 'grain free'] },
  { name: 'Online Courses', code: 'learn', headlines: ['Learn design in six weeks', 'Courses taught by people who do the work'], keywords: ['online courses', 'design course', 'coding course', 'certificates'] },
  { name: 'Skincare', code: 'skin', headlines: ['A simple routine for real skin', 'Skincare without the 12 steps'], keywords: ['skincare routine', 'moisturizer', 'sunscreen', 'serum'] },
  { name: 'Bikes', code: 'bike', headlines: ['City bikes built to last', 'Find your size in two minutes'], keywords: ['city bike', 'e-bike', 'commuter bike', 'bike shop'] }
];

/* Accounts a row can upload to. "Auto" picks one by the row's region (see accountFor in logic.js). */
export const ACCOUNTS = ['Auto', 'North America 1', 'North America 2', 'Europe 1', 'Europe 2', 'LatAm 1', 'APAC 1'];
export const REGIONS = { US: 'North America 1', CA: 'North America 1', MX: 'LatAm 1', AU: 'APAC 1', UK: 'Europe 1', DE: 'Europe 1', FR: 'Europe 1', IT: 'Europe 2', ES: 'Europe 2', NL: 'Europe 2' };

export const WORKSPACE = {
  id: 41,
  platform: 'facebook',
  brand: 'brightside',
  tabs: ['Spring launch', 'Retargeting', 'New geos', 'Video test', 'Holiday'],
  rows: 20,
  /* The one row filled in when the demo opens, built on an earlier day. */
  firstRow: {
    geo: 'CA', vertical: 'Smart Home', lang: 'en', account: 'North America 1',
    url: 'https://' + SITE + '/en/smart-home-starter', product: '2718',
    asset: 'img-home-07', headline: 'Lights that follow your routine',
    keywords: 'smart bulbs, smart plug, home automation', bid: '0.40', strategy: 'Lowest cost',
    resolved: { linkId: 'k7q2mx', link: 'https://go.' + SITE + '/k7q2mx' }
  },
  /* The run that is already in the live run panel when the demo opens. */
  lastRun: { daysAgo: 2, uploaded: 1, total: 1, time: '11:06:42' }
};

/* Creative thumbnails: generated as small gradient tiles, so no real ad image is shipped. */
export const ASSETS = ['#e9b384', '#9cc5e8', '#b7d9a8', '#e7a1b0', '#c7b5e6', '#f1d58a', '#a6d6d2', '#d9b08c'];

/* ---------- Run history ---------- */
/* status is derived from live and failed in logic.js. time is the clock time; daysAgo groups the list. */

export const RUNS = [
  { id: 1180, platform: 'tiktok', brand: 'Lumen Skin', user: 'noa.k', campaigns: 14, live: 14, failed: 0, time: '07:15', daysAgo: 0, workspace: 880, took: '2m 04s' },
  { id: 1179, platform: 'tiktok', brand: 'Brightside Home', user: 'noa.k', campaigns: 33, live: 31, failed: 2, time: '06:40', daysAgo: 0, workspace: 879, took: '4m 47s' },
  { id: 1178, platform: 'google', brand: 'Brightside Home', user: 'amit', campaigns: 26, live: 25, failed: 1, time: '05:52', daysAgo: 0, workspace: 876, took: '3m 38s' },
  { id: 1177, platform: 'facebook', brand: 'Pine & Co', user: 'yoni', campaigns: 5, live: 5, failed: 0, time: '03:20', daysAgo: 0, workspace: 875, took: '44s' },
  { id: 1176, platform: 'pinterest', brand: 'Pine & Co', user: 'amit', campaigns: 11, live: 10, failed: 1, time: '01:05', daysAgo: 0, workspace: 872, took: '1m 31s' },
  { id: 1175, platform: 'tiktok', brand: 'Pine & Co', user: 'noa.k', campaigns: 19, live: 18, failed: 1, time: '23:41', daysAgo: 1, workspace: 871, took: '2m 49s' },
  { id: 1174, platform: 'google', brand: 'Brightside Home', user: 'dana', campaigns: 15, live: 15, failed: 0, time: '19:26', daysAgo: 1, workspace: 868, took: '2m 12s' },
  { id: 1173, platform: 'google', brand: 'Brightside Home', user: 'dana', campaigns: 6, live: 6, failed: 0, time: '16:52', daysAgo: 1, workspace: 867, took: '51s' },
  { id: 1172, platform: 'google', brand: 'Brightside Home', user: 'dana', campaigns: 5, live: 0, failed: 5, time: '16:48', daysAgo: 1, workspace: 866, took: '9s', task: 'T-412' },
  { id: 1171, platform: 'facebook', brand: 'Brightside Home', user: 'yoni', campaigns: 29, live: 28, failed: 1, time: '15:57', daysAgo: 1, workspace: 864, took: '4m 10s' },
  { id: 1170, platform: 'facebook', brand: 'Brightside Home', user: 'yoni', campaigns: 38, live: 36, failed: 2, time: '15:23', daysAgo: 1, workspace: 863, took: '5m 26s' },
  { id: 1169, platform: 'facebook', brand: 'Kestrel Bikes', user: 'amit', campaigns: 2, live: 0, failed: 2, time: '14:36', daysAgo: 1, workspace: 860, took: '6s' },
  { id: 1168, platform: 'snapchat', brand: 'Lumen Skin', user: 'noa.k', campaigns: 14, live: 14, failed: 0, time: '15:20', daysAgo: 1, workspace: 858, took: '2m 02s' },
  { id: 1167, platform: 'facebook', brand: 'Brightside Home', user: 'dana', campaigns: 22, live: 21, failed: 1, time: '13:48', daysAgo: 1, workspace: 857, took: '3m 15s' },
  { id: 1166, platform: 'google', brand: 'Kestrel Bikes', user: 'amit', campaigns: 9, live: 9, failed: 0, time: '11:05', daysAgo: 2, workspace: 854, took: '1m 22s' },
  { id: 1165, platform: 'pinterest', brand: 'Pine & Co', user: 'yoni', campaigns: 5, live: 5, failed: 0, time: '10:41', daysAgo: 2, workspace: 853, took: '49s' },
  { id: 1164, platform: 'tiktok', brand: 'Brightside Home', user: 'noa.k', campaigns: 28, live: 25, failed: 3, time: '09:12', daysAgo: 2, workspace: 850, took: '4m 18s' },
  { id: 1163, platform: 'google', brand: 'Brightside Home', user: 'dana', campaigns: 16, live: 16, failed: 0, time: '16:30', daysAgo: 3, workspace: 846, took: '2m 20s' },
  { id: 1162, platform: 'facebook', brand: 'Brightside Home', user: 'yoni', campaigns: 40, live: 37, failed: 3, time: '14:02', daysAgo: 3, workspace: 844, took: '5m 51s' },
  { id: 1161, platform: 'linkedin', brand: 'Harbor Pets', user: 'amit', campaigns: 4, live: 0, failed: 4, time: '12:16', daysAgo: 4, workspace: 841, took: '5s' }
];

/* Failure messages, by platform where it matters. Short and generic on purpose. */
export const FAILURES = {
  google: 'Account limit: this account already runs as many campaigns as it is allowed',
  facebook: 'Missing permission: the ad account cannot run ads for this Page yet',
  tiktok: 'Rejected in review: the video is shorter than this placement needs',
  linkedin: 'Billing: add a payment method to this account first',
  financial: 'Policy: financial claims. "Guaranteed approval" is not allowed in a headline',
  default: 'This account is at its campaign limit'
};

/* ---------- Shell ---------- */

export const NOTIFICATIONS = {
  accounts: [
    { title: 'Europe 2: card expired', sub: 'Facebook · ads pause in 3 days without a new card', tone: 'red' },
    { title: 'North America 1: 90% of monthly cap', sub: 'Google Ads · raise the cap in Accounts', tone: 'grey' }
  ],
  activity: [
    { title: 'noa.k shared a workspace with you', sub: 'Spring launch · Brightside Home', age: '3h', tone: 'violet' },
    { title: 'amit finished run #1178', sub: '25 live · 1 failed', age: '5h', tone: 'grey' },
    { title: 'yoni added 40 creatives', sub: 'Library · Pine & Co', age: '1d', tone: 'amber' },
    { title: 'dana renamed a workspace', sub: 'Video test · Brightside Home', age: '2d', tone: 'grey' }
  ]
};

/* Tips only describe features the replica itself shows. */
export const TIPS = [
  { title: 'Fill a whole grid in two clicks', body: 'Data → Auto-fill creatives and Auto-generate headlines fill every empty row from its vertical.', meta: 'SHIPPED · 2D' },
  { title: 'Links before launch', body: 'Create tracking links gives every row its own short link. Create links & upload goes live as the links come in.', meta: 'SHIPPED · 5D' },
  { title: 'Every run is traced', body: 'Open Run history and expand a campaign to see each upload step and every creative it sent.', meta: 'SHIPPED · 1W' },
  { title: 'Press / to search', body: 'The search box at the top finds rows, runs and accounts from anywhere.', meta: 'SHIPPED · 2W' }
];

/* Sidebar. screen marks the pages this demo includes; everything else answers with a short note. */
export const NAV = [
  { section: '', items: [['Dashboard', 'dashboard', 'dashboard']] },
  { section: 'BUILD & UPLOAD', items: [['Workspace', 'grid', 'workspace'], ['Run history', 'clock', 'history']] },
  { section: 'PERFORMANCE', items: [['Campaigns', 'search'], ['Reports', 'chart']] },
  { section: 'LIBRARY', items: [['Creatives', 'image'], ['Headlines', 'file'], ['Keywords', 'key']] },
  { section: 'MANAGE', items: [['Accounts', 'users'], ['Brands', 'layers'], ['Team', 'users'], ['Settings', 'settings'], ['Help center', 'help']] }
];

/* Canned answers for the Ask drawer. Each one describes something the demo really does. */
export const ASK = [
  { q: 'Why did a campaign fail?', a: 'Open Run history and pick a run with a red count. Expand the red row: the Outcome column has the platform\'s message, and the upload trace shows which step stopped. In this demo the usual one is a headline that breaks the financial claims policy. Edit the Headline cell and run it again.' },
  { q: 'How do I fill a grid fast?', a: 'Use Data → Fill example data for the basics, then Data → Auto-fill creatives and Data → Auto-generate headlines. Every empty required cell (the red ones) fills from the row\'s vertical. The count next to the tab name tells you how many campaigns are ready.' },
  { q: 'What do tracking links do?', a: 'Create tracking links gives every row its own short link and fills Link ID and Tracked link, so each campaign can be measured on its own. It stops there. Create links & upload goes live as the links come in.' }
];
