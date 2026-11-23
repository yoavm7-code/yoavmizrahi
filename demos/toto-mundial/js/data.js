/* Toto Mundial demo: every name and number the replica shows lives here, and all of it is invented.
   Countries and well-known players are public sports data. The people in the pool, their points, the
   pot and every match result are made up. The demo is frozen on the first day of the round of 32.
   Derived figures (totals, ranks, the pot split, points per pick) are computed in logic.js. */

/* ---------- The demo clock ---------- */
/* The app opens at this moment and the clock runs on from there. Months are 0-based (5 = June). */

export const START = { year: 2026, month: 5, day: 28, hour: 16, minute: 8 };
export const STAGE = 'r32';
export const LOCK_MINUTES = 5;

/* ---------- Scoring ---------- */

export const SCORING = { exact: 10, direction: 5, advances: 10, wrong: 0 };

/* ---------- The pool ---------- */
/* bank is the overall points; matches, live and duels are the category totals the leaderboard tabs
   rank by. last is the most recent change to the bank (today's finished match, p8): its points follow
   the scoring rules, and before + change = bank. me is the signed-in visitor. */

export const ME = 'me';
export const ENTRY_FEE = 120;
export const API_COST = 80;
export const SPLIT = [
  { key: 'king', pct: 40, tone: 'gold' },
  { key: 'second', pct: 20, tone: 'pink' },
  { key: 'third', pct: 10, tone: 'pink' },
  { key: 'picks', pct: 15, tone: 'green' },
  { key: 'live', pct: 15, tone: 'green' }
];

export const PEOPLE = [
  { id: 'nadav', en: 'Nadav Peretz', he: 'נדב פרץ', bank: 1512, bets: 212, matches: 1105, live: 241, duels: 66, before: 1492, last: { match: 'p8', change: 20 } },
  { id: 'michal', en: 'Michal Dror', he: 'מיכל דרור', bank: 1468, bets: 230, matches: 1090, live: 198, duels: 80, before: 1453, last: { match: 'p8', change: 15 } },
  { id: 'itay', en: 'Itay Shem', he: 'איתי שם', bank: 1391, bets: 187, matches: 1012, live: 260, duels: -11, before: 1386, last: { match: 'p8', change: 5 } },
  { id: 'gal', en: 'Gal Bar-On', he: 'גל בר-און', bank: 1270, bets: 205, matches: 940, live: 222, duels: 18, before: 1255, last: { match: 'p8', change: 15 } },
  { id: 'me', en: 'Tal Avni', he: 'טל אבני', bank: 1265, bets: 198, matches: 955, live: 172, duels: 28, before: 1250, last: { match: 'p8', change: 15 } },
  { id: 'ronit', en: 'Ronit K', he: 'Ronit K', bank: 1232, bets: 176, matches: 921, live: 199, duels: -2, before: 1217, last: { match: 'p8', change: 15 } },
  { id: 'eli', en: 'Eli Navon', he: 'אלי נבון', bank: 1188, bets: 201, matches: 898, live: 150, duels: 30, before: 1188, last: { match: 'p8', change: 0 } },
  { id: 'shai', en: 'Shai M', he: 'Shai M', bank: 1140, bets: 164, matches: 860, live: 205, duels: -40, before: 1125, last: { match: 'p8', change: 15 } },
  { id: 'yael', en: 'Yael Sasson', he: 'יעל ששון', bank: 1102, bets: 190, matches: 845, live: 141, duels: 16, before: 1082, last: { match: 'p8', change: 20 } },
  { id: 'kfir', en: 'kfir_88', he: 'kfir_88', bank: 1065, bets: 158, matches: 790, live: 230, duels: -55, before: 1065, last: { match: 'p8', change: 0 } },
  { id: 'hila', en: 'Hila Tamir', he: 'הילה תמיר', bank: 1021, bets: 172, matches: 801, live: 132, duels: -12, before: 1006, last: { match: 'p8', change: 15 } },
  { id: 'omri', en: 'Omri G', he: 'Omri G', bank: 990, bets: 149, matches: 760, live: 168, duels: -38, before: 975, last: { match: 'p8', change: 15 } },
  { id: 'noga', en: 'Noga Ezra', he: 'נוגה עזרא', bank: 951, bets: 166, matches: 742, live: 120, duels: 9, before: 951, last: { match: 'p8', change: 0 } },
  { id: 'assaf', en: 'Assaf Lev', he: 'אסף לב', bank: 917, bets: 143, matches: 705, live: 151, duels: -19, before: 902, last: { match: 'p8', change: 15 } },
  { id: 'dana', en: 'Dana R', he: 'Dana R', bank: 874, bets: 151, matches: 690, live: 98, duels: 6, before: 864, last: { match: 'p8', change: 10 } },
  { id: 'tomer', en: 'Tomer Ofek', he: 'תומר אופק', bank: 838, bets: 139, matches: 655, live: 133, duels: -30, before: 823, last: { match: 'p8', change: 15 } },
  { id: 'liron', en: 'Liron B', he: 'Liron B', bank: 790, bets: 128, matches: 618, live: 110, duels: -18, before: 785, last: { match: 'p8', change: 5 } },
  { id: 'ido', en: 'Ido Har', he: 'עידו הר', bank: 742, bets: 133, matches: 590, live: 87, duels: -15, before: 742, last: { match: 'p8', change: 0 } },
  { id: 'maor', en: 'maor.s', he: 'maor.s', bank: 705, bets: 117, matches: 560, live: 95, duels: -30, before: 690, last: { match: 'p8', change: 15 } },
  { id: 'shir', en: 'Shir Golan', he: 'שיר גולן', bank: 660, bets: 121, matches: 540, live: 70, duels: -30, before: 650, last: { match: 'p8', change: 10 } },
  { id: 'boaz', en: 'Boaz Y', he: 'Boaz Y', bank: 618, bets: 104, matches: 505, live: 72, duels: -39, before: 603, last: { match: 'p8', change: 15 } },
  { id: 'adi', en: 'Adi Paz', he: 'עדי פז', bank: 571, bets: 112, matches: 470, live: 61, duels: -40, before: 571, last: { match: 'p8', change: 0 } },
  { id: 'ziv', en: 'Ziv N', he: 'Ziv N', bank: 498, bets: 96, matches: 420, live: 48, duels: -50, before: 478, last: { match: 'p8', change: 20 } },
  { id: 'gili', en: 'Gili Raz', he: 'גילי רז', bank: 455, bets: 88, matches: 390, live: 40, duels: -55, before: 455, last: { match: 'p8', change: 0 } }
];

/* The Monkey picks at random every match: the score to beat. */
export const MONKEY = { bank: 512 };

/* The visitor's bank after each matchday so far, for the points chart. Ends at the current bank. */
export const HISTORY = [0, 25, 60, 95, 150, 205, 260, 310, 380, 445, 520, 600, 690, 765, 850, 925, 1010, 1080, 1140, 1190, 1250, 1265];

/* ---------- Teams ---------- */
/* Flags are drawn in flags.js from these codes. */

export const TEAMS = {
  ARG: { en: 'Argentina', he: 'ארגנטינה' },
  BRA: { en: 'Brazil', he: 'ברזיל' },
  CAN: { en: 'Canada', he: 'קנדה' },
  CRO: { en: 'Croatia', he: 'קרואטיה' },
  ENG: { en: 'England', he: 'אנגליה' },
  ESP: { en: 'Spain', he: 'ספרד' },
  FRA: { en: 'France', he: 'צרפת' },
  GER: { en: 'Germany', he: 'גרמניה' },
  JPN: { en: 'Japan', he: 'יפן' },
  MAR: { en: 'Morocco', he: 'מרוקו' },
  MEX: { en: 'Mexico', he: 'מקסיקו' },
  NED: { en: 'Netherlands', he: 'הולנד' },
  POR: { en: 'Portugal', he: 'פורטוגל' },
  SEN: { en: 'Senegal', he: 'סנגל' },
  URU: { en: 'Uruguay', he: 'אורוגוואי' },
  USA: { en: 'USA', he: 'ארה"ב' }
};

/* ---------- Matches ---------- */
/* day is days from the start date; time is the local kickoff. pick is the visitor's saved pick. */

export const UPCOMING = [
  { id: 'u1', home: 'BRA', away: 'JPN', day: 0, time: '18:00', stage: 'r32', pick: null },
  { id: 'u2', home: 'FRA', away: 'MAR', day: 0, time: '21:00', stage: 'r32', pick: null },
  { id: 'u3', home: 'ESP', away: 'CRO', day: 1, time: '19:00', stage: 'r32', pick: [2, 1] },
  { id: 'u4', home: 'ARG', away: 'MEX', day: 1, time: '22:00', stage: 'r32', pick: null }
];

/* The match on now. It runs from minute 58 when the Live tab first opens; goals land on their minute. */
export const LIVE = {
  id: 'l1', home: 'NED', away: 'USA', stage: 'r32', time: '15:00', pick: [2, 1],
  from: 58, to: 93, score: [1, 0],
  goals: [{ minute: 63, side: 0 }, { minute: 71, side: 1 }]
};

/* Finished matches, newest first, with the visitor's pick. */
export const PAST = [
  { id: 'p8', home: 'GER', away: 'CAN', day: 0, time: '13:00', stage: 'r32', score: [2, 0], pick: [1, 0], advances: 'GER', pickAdvances: 'GER' },
  { id: 'p7', home: 'POR', away: 'URU', day: -2, time: '22:00', stage: 'group', score: [1, 1], pick: [2, 1] },
  { id: 'p6', home: 'ENG', away: 'SEN', day: -2, time: '19:00', stage: 'group', score: [2, 0], pick: [2, 0] },
  { id: 'p5', home: 'CRO', away: 'CAN', day: -3, time: '22:00', stage: 'group', score: [0, 1], pick: [1, 1] },
  { id: 'p4', home: 'JPN', away: 'MEX', day: -3, time: '19:00', stage: 'group', score: [3, 2], pick: [1, 0] },
  { id: 'p3', home: 'MAR', away: 'BRA', day: -4, time: '21:00', stage: 'group', score: [0, 2], pick: [1, 2] }
];

/* How the pool picked the matches that locked today. */
export const COMMUNITY = [
  { match: 'p8', home: 19, draw: 3, away: 2 },
  { match: 'l1', home: 13, draw: 6, away: 5 }
];

/* ---------- Tournament bets ---------- */
/* payout is what a right answer adds to the bank. A locked question keeps the visitor's pick. */

export const PLAYERS = [
  { id: 'mbappe', name: 'Kylian Mbappé', team: 'FRA', pos: 'fw', payout: 18 },
  { id: 'yamal', name: 'Lamine Yamal', team: 'ESP', pos: 'fw', payout: 24 },
  { id: 'vinicius', name: 'Vinícius Júnior', team: 'BRA', pos: 'fw', payout: 29 },
  { id: 'kane', name: 'Harry Kane', team: 'ENG', pos: 'fw', payout: 26 },
  { id: 'messi', name: 'Lionel Messi', team: 'ARG', pos: 'fw', payout: 33 },
  { id: 'bellingham', name: 'Jude Bellingham', team: 'ENG', pos: 'mf', payout: 31 },
  { id: 'wirtz', name: 'Florian Wirtz', team: 'GER', pos: 'mf', payout: 38 },
  { id: 'pedri', name: 'Pedri', team: 'ESP', pos: 'mf', payout: 41 },
  { id: 'hakimi', name: 'Achraf Hakimi', team: 'MAR', pos: 'df', payout: 55 },
  { id: 'gakpo', name: 'Cody Gakpo', team: 'NED', pos: 'fw', payout: 47 },
  { id: 'pulisic', name: 'Christian Pulisic', team: 'USA', pos: 'fw', payout: 60 },
  { id: 'valverde', name: 'Federico Valverde', team: 'URU', pos: 'mf', payout: 52 }
];

export const TOURNAMENT = [
  { id: 'ball', kind: 'player', locked: false, closes: { day: 4, time: '18:00' }, pick: null },
  { id: 'champion', kind: 'team', locked: true, closes: { day: -17, time: '22:00' }, pick: 'ARG', payout: 40 },
  { id: 'scorer', kind: 'player', locked: true, closes: { day: -17, time: '22:00' }, pick: 'mbappe' }
];

/* ---------- News ---------- */

export const NEWS = [
  { id: 'n1', day: 0, time: '14:55', en: 'Germany ease past Canada to open the round of 32', he: 'גרמניה עוברת את קנדה בקלות בפתיחת שלב 32 האחרונות', source: 'Sideline Daily' },
  { id: 'n2', day: 0, time: '09:30', en: 'Five things to watch as the knockouts begin', he: 'חמישה דברים לשים לב אליהם בפתיחת שלב הנוקאאוט', source: 'The Final Whistle' },
  { id: 'n3', day: -1, time: '21:10', en: 'Rest day notes: who is fit for the round of 32', he: 'יום מנוחה: מי כשיר לשלב 32 האחרונות', source: 'Sideline Daily' }
];
