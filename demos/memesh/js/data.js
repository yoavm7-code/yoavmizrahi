/* Memesh demo: every name and number the replica shows lives here, and all of it is invented.
   One playground, frozen on Monday 23 November 2026 at 13:10: the morning round is over, the noon
   round is on, the evening is open for booking. Phones use the 555 range; emails use example.com.
   Derived figures (free spots, KPIs, the week grid) are computed in logic.js. */

/* ---------- The clock ---------- */
/* Months are 0-based (10 = November). Day offsets below count from this date. */

export const TODAY = { year: 2026, month: 10, day: 23, hour: 13, minute: 10 };

/* ---------- Rounds ---------- */

export const CAPACITY = 40;
export const ROUNDS = [
  { id: 'morning', start: '9:00', end: '12:30' },
  { id: 'noon', start: '12:30', end: '15:30' },
  { id: 'evening', start: '15:30', end: '19:00' }
];

/* What the next two weeks look like. Booked counts per round; 'closed' and 'free' days have no rounds.
   Offsets are days from today. Anything not listed is an ordinary day with the default counts. */
export const DEFAULT_BOOKED = { morning: 9, noon: 4, evening: 12 };
export const DAYS = {
  0: { booked: { morning: 11, noon: 6, evening: 24 } },
  1: { booked: { morning: 14, noon: 5, evening: 18 } },
  2: { booked: { morning: 7, noon: 2, evening: 16 } },
  3: { booked: { morning: 12, noon: 9, evening: 34 } },
  4: { rounds: ['morning', 'noon'], booked: { morning: 22, noon: 15 } },
  5: { mode: 'closed' },
  6: { booked: { morning: 18, noon: 11, evening: 40 } },
  9: { mode: 'free' },
  11: { rounds: ['morning', 'noon'], booked: { morning: 6, noon: 3 } },
  12: { mode: 'closed' }
};
export const HORIZON = 21;

/* Who has already arrived in today's rounds. */
export const ARRIVED_TODAY = { morning: 11, noon: 4, evening: 0 };

export const PRICES = { card: 480, companion: 15, cardEntries: 12, cardPaid: 10 };
export const CANCEL_HOURS = 24;

/* ---------- People ---------- */
/* The parent signed in to the customer area, the staff member at the desk and in the back office,
   and the playground's customers. Names come in both languages. */

export const PARENT_ID = 'L-2041';

export const CUSTOMERS = [
  { id: 'L-2041', he: 'עדי אלון', en: 'Adi Alon', phone: '0505550141', email: 'adi.alon@example.com', joined: [2026, 8, 14], heard: 'friend', channel: 'sms', children: [{ he: 'אורי', en: 'Ori', age: 4 }, { he: 'נגה', en: 'Noga', age: 2 }] },
  { id: 'L-2040', he: 'יונתן אדלר', en: 'Yonatan Adler', phone: '0505550140', email: 'yonatan.a@example.com', joined: [2026, 10, 20], heard: 'social', channel: 'whatsapp', children: [{ he: 'תמר', en: 'Tamar', age: 3 }], vip: true },
  { id: 'L-2039', he: 'Sarah Klein', en: 'Sarah Klein', phone: '0505550139', email: 'sarah.k@example.com', joined: [2026, 10, 18], heard: 'web', channel: 'email', children: [] },
  { id: 'L-2038', he: 'רותם שלו', en: 'Rotem Shalev', phone: '0505550138', email: 'rotem.s@example.com', joined: [2026, 10, 11], heard: 'street', channel: 'sms', children: [{ he: 'עמית', en: 'Amit', age: 5 }] },
  { id: 'L-2037', he: 'הדס נחום', en: 'Hadas Nahum', phone: '0505550137', email: 'hadas.n@example.com', joined: [2026, 10, 4], heard: 'friend', channel: 'sms', children: [{ he: 'לביא', en: 'Lavi', age: 1 }] },
  { id: 'L-2036', he: 'Daniel Ortiz', en: 'Daniel Ortiz', phone: '0505550136', email: 'd.ortiz@example.com', joined: [2026, 9, 29], heard: 'web', channel: 'whatsapp', children: [] },
  { id: 'L-2035', he: 'שקד בן עמי', en: 'Shaked Ben Ami', phone: '0505550135', email: 'shaked.b@example.com', joined: [2026, 9, 22], heard: 'social', channel: 'sms', children: [{ he: 'יואל', en: 'Yoel', age: 3 }], frozen: true },
  { id: 'L-2034', he: 'ליאת מור', en: 'Liat Mor', phone: '0505550134', email: 'liat.mor@example.com', joined: [2026, 9, 15], heard: 'friend', channel: 'email', children: [{ he: 'מיקה', en: 'Mika', age: 6 }] },
  { id: 'L-2033', he: 'אסף ויס', en: 'Asaf Weiss', phone: '0505550133', email: 'asaf.w@example.com', joined: [2026, 9, 3], heard: 'none', channel: 'sms', children: [] },
  { id: 'L-2032', he: 'Nora Haddad', en: 'Nora Haddad', phone: '0505550132', email: 'nora.h@example.com', joined: [2026, 8, 27], heard: 'web', channel: 'whatsapp', children: [{ he: 'סלמא', en: 'Salma', age: 2 }], vip: true },
  { id: 'L-2031', he: 'גלית רון', en: 'Galit Ron', phone: '0505550131', email: 'galit.r@example.com', joined: [2026, 8, 19], heard: 'street', channel: 'sms', children: [{ he: 'בארי', en: 'Be\'eri', age: 4 }] },
  { id: 'L-2030', he: 'עידו פלד', en: 'Ido Peled', phone: '0505550130', email: 'ido.peled@example.com', joined: [2026, 8, 8], heard: 'friend', channel: 'email', children: [] },
  { id: 'L-2029', he: 'מורן אשכנזי', en: 'Moran Ashkenazi', phone: '0505550129', email: 'moran.a@example.com', joined: [2026, 7, 30], heard: 'social', channel: 'sms', children: [{ he: 'ליה', en: 'Lia', age: 1 }, { he: 'רוני', en: 'Roni', age: 5 }] },
  { id: 'L-2028', he: 'טל בן-לוי', en: 'Tal Ben-Levi', phone: '0505550128', email: 'tal.bl@example.com', joined: [2026, 7, 21], heard: 'web', channel: 'whatsapp', children: [] }
];
export const CUSTOMER_TOTAL = 1870;

/* Punch cards: entries used so far. A card's serial is its QR. */
export const CARDS = [
  { serial: 'M-20261002-0412', customer: 'L-2041', used: 2, issued: [2026, 9, 2], soldBy: null },
  { serial: 'M-20261115-0488', customer: 'L-2041', used: 0, issued: [2026, 10, 15], soldBy: null },
  { serial: 'M-20261120-0503', customer: 'L-2040', used: 1, issued: [2026, 10, 20], soldBy: 'cashier' },
  { serial: 'M-20261118-0497', customer: 'L-2039', used: 0, issued: [2026, 10, 18], soldBy: null },
  { serial: 'M-20261109-0461', customer: 'L-2038', used: 5, issued: [2026, 10, 9], soldBy: 'cashier' },
  { serial: 'M-20261031-0440', customer: 'L-2037', used: 7, issued: [2026, 9, 31], soldBy: null },
  { serial: 'M-20260912-0355', customer: 'L-2034', used: 12, issued: [2026, 8, 12], soldBy: null, status: 'used' },
  { serial: 'M-20260820-0301', customer: 'L-2032', used: 9, issued: [2026, 7, 20], soldBy: 'cashier' },
  { serial: 'M-20250901-0122', customer: 'L-2030', used: 6, issued: [2025, 8, 1], soldBy: null, status: 'expired' },
  { serial: 'M-20261006-0419', customer: 'L-2029', used: 3, issued: [2026, 9, 6], soldBy: null, status: 'cancelled' }
];
export const CARD_TOTAL = 142;

/* The parent's round bookings so far. day is the offset from today; status is used, cancelled or booked. */
export const BOOKINGS = [
  { serial: 'R-20261104-5521', card: 'M-20261002-0412', day: -19, round: 'evening', count: 1, companion: false, status: 'used' },
  { serial: 'R-20261028-5390', card: 'M-20261002-0412', day: -26, round: 'morning', count: 1, companion: false, status: 'cancelled' },
  { serial: 'R-20261019-5248', card: 'M-20261002-0412', day: -35, round: 'morning', count: 1, companion: true, status: 'used' },
  { serial: 'R-20260921-4870', card: null, day: -63, round: 'evening', count: 2, companion: false, status: 'used' },
  { serial: 'R-20260602-3015', card: null, day: -174, round: 'morning', count: 1, companion: false, status: 'used' }
];

/* The parent's past entries at the desk, newest first, for the till's customer profile. */
export const ENTRIES = {
  'M-20261002-0412': [{ day: -19, time: '16:05', count: 1 }, { day: -35, time: '09:40', count: 1 }],
  'M-20261109-0461': [{ day: -2, time: '10:12', count: 2 }, { day: -9, time: '16:30', count: 3 }]
};

export const STAFF = [
  { id: 'dana', he: 'דנה שחר', en: 'Dana Shahar', email: 'dana@example.com', phone: '0505550201', role: 'manager', me: true },
  { id: 'cashier', he: 'קופאי ראשי', en: 'Head cashier', email: 'desk@example.com', phone: '0505550200', role: 'cashier' },
  { id: 'admin', he: 'Admin User', en: 'Admin User', email: 'admin@example.com', phone: '0505550202', role: 'admin' },
  { id: 'omer', he: 'עומר גבאי', en: 'Omer Gabay', email: 'omer@example.com', phone: '0505550203', role: 'admin' },
  { id: 'yael', he: 'יעל חזן', en: 'Yael Hazan', email: 'yael.h@example.com', phone: '0505550204', role: 'admin' }
];

/* ---------- The back office ---------- */
/* Yesterday's numbers, for the "vs yesterday" deltas, and the longer-range stat tiles. */

export const YESTERDAY = { revenue: 1180, bookings: 29, cards: 3, companions: 3 };
export const TODAY_BASE = { revenue: 1395, cards: 2, companions: 4, holds: 1 };
export const STATS = { entries7: 214, entries30: 873, cardsSold30: 37, expiring30: 6, newCustomers7: 11 };

/* The activity feed as the morning left it. who is a staff id or a customer id. */
export const ACTIVITY = [
  { time: '12:41', who: 'cashier', action: 'punch', detail: 'L-2038 · 2' },
  { time: '11:58', who: 'L-2040', action: 'book', detail: 'evening' },
  { time: '10:15', who: 'cashier', action: 'sale', detail: 'L-2040' },
  { time: '09:02', who: 'cashier', action: 'walkin', detail: 'morning' }
];

/* Who may do what, by role. Admin is always everything. */
export const PERMISSIONS = [
  { group: 'staff', rows: [
    { key: 'staff.view', manager: true, cashier: false },
    { key: 'staff.create', manager: false, cashier: false },
    { key: 'staff.edit', manager: false, cashier: false },
    { key: 'staff.change_role', manager: false, cashier: false }
  ] },
  { group: 'customers', rows: [
    { key: 'customers.view', manager: true, cashier: true },
    { key: 'customers.edit', manager: true, cashier: false },
    { key: 'customers.delete', manager: false, cashier: false }
  ] },
  { group: 'cards', rows: [
    { key: 'cards.sell', manager: true, cashier: true },
    { key: 'cards.refund_entry', manager: true, cashier: false },
    { key: 'cards.cancel', manager: false, cashier: false }
  ] },
  { group: 'rounds', rows: [
    { key: 'rounds.manage_participants', manager: true, cashier: true },
    { key: 'rounds.edit_rules', manager: false, cashier: false }
  ] }
];
