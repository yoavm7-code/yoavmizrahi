/* Toto Mundial demo: every word the replica shows, in English and Hebrew, and the formats for numbers,
   dates and countdowns. The real app opens in Hebrew; the portfolio's copy opens in English.
   ‎ (a left-to-right mark) keeps "+24" from showing as "24+" inside a Hebrew sentence. */

import { TEAMS } from './data.js';

export const STRINGS = {
  en: {
    'app.name': 'TOTO MUNDIAL',
    'app.madeUp': 'Demo with made-up data',
    'app.back': 'Back to the portfolio',
    'nav.aria': 'Pages', 'nav.home': 'Home', 'nav.bets': 'Bets', 'nav.leaders': 'Leaders', 'nav.live': 'Live', 'nav.more': 'More',
    'more.title': 'More',
    'page.duels': 'Duels', 'page.zone': 'World Cup Zone', 'page.transparency': 'Transparency', 'page.rules': 'How it works',
    'page.admin': 'Admin', 'page.profile': 'Profile', 'page.whatsapp': 'WhatsApp group', 'page.groups': 'Group rankings', 'page.liveBets': 'Live bets',
    'lang.label': 'Language', 'lang.other': 'עברית', 'lang.switch': 'Switch to Hebrew', 'lang.short': 'עב',
    'signout': 'Sign out',
    'bank.aria': 'Points bank: {n}', 'menu.aria': 'Open your menu',
    'toast.notInDemo': '{page} is not part of this demo. Try Bets, Leaders or Live.',
    'toast.signout': 'You can\'t sign out of a demo. Nothing here is real.',
    'toast.whatsapp': 'The WhatsApp group is for the real players.',
    'toast.news': 'News stories are made up for this demo.',
    'stage.r32': 'Round of 32', 'stage.group': 'Group stage', 'stage.label': 'Current stage',
    'pot.label': 'Pot', 'players.label': 'Players',
    'pts': 'pts', 'money': '{n} ILS',
    'home.status': 'What is up', 'home.rank': 'Rank', 'home.of': 'of {n}', 'home.behind': 'Behind the leader', 'home.total': 'Total points',
    'home.upnext': 'Up next', 'home.upnext.pick': '{match} locks in {time}. You haven\'t picked yet.', 'home.upnext.cta': 'Pick now',
    'home.upnext.done': 'All caught up. We\'ll be back when something needs you.',
    'home.next': 'Your next matches', 'home.viewAll': 'View all', 'home.yourPick': 'Your pick {score}', 'home.noPick': 'Not picked yet',
    'home.community': 'What the pool picked today', 'home.seeAll': 'See all picks', 'home.picked': '{n}/{total} picked {team}', 'home.pickedDraw': '{n}/{total} picked a draw',
    'home.lastBet': 'Your last bet', 'home.yourBet': 'Your bet', 'home.earned': 'Earned',
    'home.chart': 'Points through the tournament', 'home.chartNote': '{n} matchdays',
    'home.leaders': 'Leaders', 'home.fullTable': 'Full table', 'you': 'You',
    'home.allBets': 'All bets', 'home.allBetsSub': 'Match picks, live, tournament and groups',
    'home.whatsapp': 'The pool\'s WhatsApp group', 'home.whatsappSub': 'Updates, match arguments and friendly trash talk', 'home.dismiss': 'Hide',
    'home.news': 'Latest news',
    'split.title': 'Pot split', 'split.pot': 'Pot', 'split.cost': 'API cost', 'split.toSplit': 'To split',
    'share.king': 'King of the Mundial', 'share.second': '2nd overall', 'share.third': '3rd overall', 'share.picks': 'Picks champion', 'share.live': 'Live champion',
    'bets.title': 'Bets',
    'cat.matches': 'Match picks', 'cat.tournament': 'Tournament bets', 'cat.groups': 'Group rankings', 'cat.live': 'Live bets', 'cat.duels': 'Duels',
    'time.upcoming': 'Upcoming', 'time.past': 'Past',
    'picks.title': 'Match picks', 'picks.sub': 'Every match still open, in one list. Set a score and it saves by itself.',
    'legend.title': 'Scoring:', 'legend.exact': 'Exact', 'legend.direction': 'Direction', 'legend.advances': 'Who advances', 'legend.wrong': 'Wrong',
    'vs': 'vs', 'surprise': 'Surprise me', 'goalsDown': '{team}: one goal fewer', 'goalsUp': '{team}: one goal more',
    'status.none': 'No pick yet', 'status.saving': 'Saving…', 'status.saved': 'Saved {score}', 'status.undo': 'Undo', 'status.removed': 'Pick removed',
    'locksIn': 'Locks in {time}',
    'picks.empty': 'No matches open right now. Picks lock 5 minutes before kickoff and drop off the list.',
    'picks.hint': 'Looking for the tournament bets?', 'picks.hintLink': 'Tournament bets',
    'past.title': 'Past match picks', 'past.sub': 'Every match that has started or finished, with your pick, the real score and the points you earned.',
    'past.myPick': 'My pick', 'past.points': 'Points', 'past.final': 'Final', 'past.advances': 'Who advances',
    'kind.exact': 'Exact', 'kind.direction': 'Direction', 'kind.wrong': 'Wrong', 'kind.none': 'No pick',
    'tour.title': 'Tournament bets', 'tour.sub': 'One-off picks about the whole tournament. Each closes when the first match it depends on kicks off.',
    'tour.surprise': 'Surprise me', 'tour.surpriseDone': 'Picked {name} for you. Change it any time before it closes.', 'tour.allPicked': 'Every open question already has your pick.',
    'q.ball': 'Who will win the Golden Ball?', 'q.champion': 'Who will win the World Cup?', 'q.scorer': 'Who will be the top scorer?',
    'q.ballInfo': 'Goes to the best player of the tournament, named after the final.',
    'tour.closes': 'Closes {date}', 'tour.closed': 'Closed', 'tour.locked': 'Locked', 'tour.choosePlayer': 'Choose a player',
    'tour.scenarios': 'Scenarios', 'tour.now': 'Now', 'tour.ifRight': 'If you\'re right', 'tour.ifWrong': 'If you\'re wrong',
    'tour.free': 'Free', 'tour.saved': 'Saved', 'tour.notPicked': 'Not picked yet',
    'picker.title': 'Golden Ball', 'picker.search': 'Search a player or team…', 'picker.empty': 'No player matches "{q}".', 'picker.close': 'Close',
    'picker.payout': '+{n} if right',
    'pos.fw': 'Forward', 'pos.mf': 'Midfielder', 'pos.df': 'Defender',
    'notHere.title': '{name} aren\'t in this demo', 'notHere.body': 'The real app has them. Here you can try match picks and tournament bets.', 'notHere.cta': 'Go to match picks',
    'lb.title': 'Leaderboard',
    'lb.overall': 'Overall', 'lb.matches': 'Matches', 'lb.live': 'Live', 'lb.duels': 'Duels',
    'lb.sub.overall': 'King of the Mundial: the full bank from match picks, live bets, duels and adjustments.',
    'lb.sub.matches': 'Points from match picks only. Ties go to more exact scores.',
    'lb.sub.live': 'Net points from live bets.',
    'lb.sub.duels': 'Points won and lost in duels. Ties go to more duels played.',
    'monkey.name': 'The Monkey', 'monkey.sub': 'Target to beat · {n} of {total} are ahead of him',
    'lb.bets': '{n} bets', 'lb.expand': 'Show {name}\'s last change', 'lb.collapse': 'Hide {name}\'s last change',
    'lb.before': 'Before last', 'lb.change': 'Last change', 'lb.now': 'Now', 'lb.lastTime': 'Last time',
    'tag.match': 'Match', 'lb.pick': 'Pick: {x}',
    'live.title': 'Live scores', 'live.sub': 'Matches on now, coming up today, and just finished.', 'live.auto': 'Updates automatically',
    'live.badge': 'Live', 'live.yourPick': 'Your pick', 'live.rightNow': 'Right now', 'live.projected': 'Projected: keeps changing while the match is live',
    'live.waiting': 'Waiting for kickoff', 'live.kickoffIn': 'Kickoff in {time}', 'live.fullTime': 'Full time', 'live.earned': 'Earned',
    'live.pickNow': 'Pick now', 'live.noPick': 'No pick', 'live.goal': 'Goal for {team}! {score}', 'live.ended': 'Full time: {score}. You earned +{n}.',
    'day.today': 'Today', 'day.tomorrow': 'Tomorrow', 'day.yesterday': 'Yesterday'
  },
  he: {
    'app.name': 'טוטו מונדיאל',
    'app.madeUp': 'דמו עם נתונים מומצאים',
    'app.back': 'חזרה לפורטפוליו',
    'nav.aria': 'עמודים', 'nav.home': 'ראשי', 'nav.bets': 'הימורים', 'nav.leaders': 'מובילים', 'nav.live': 'לייב', 'nav.more': 'עוד',
    'more.title': 'עוד',
    'page.duels': 'דו-קרב', 'page.zone': 'אזור מונדיאל', 'page.transparency': 'שקיפות', 'page.rules': 'איך זה עובד',
    'page.admin': 'ניהול', 'page.profile': 'פרופיל', 'page.whatsapp': 'קבוצת וואטסאפ', 'page.groups': 'דירוגי בתים', 'page.liveBets': 'הימורי לייב',
    'lang.label': 'שפה', 'lang.other': 'English', 'lang.switch': 'Switch to English', 'lang.short': 'EN',
    'signout': 'התנתק',
    'bank.aria': 'בנק נקודות: {n}', 'menu.aria': 'פתח את התפריט שלך',
    'toast.notInDemo': '{page} לא חלק מהדמו. נסו את ההימורים, המובילים או הלייב.',
    'toast.signout': 'אי אפשר להתנתק מדמו. שום דבר כאן לא אמיתי.',
    'toast.whatsapp': 'קבוצת הוואטסאפ שמורה לשחקנים האמיתיים.',
    'toast.news': 'הכתבות בדמו הזה מומצאות.',
    'stage.r32': 'שלב 32 האחרונות', 'stage.group': 'שלב הבתים', 'stage.label': 'השלב הנוכחי',
    'pot.label': 'הקופה', 'players.label': 'משתתפים',
    'pts': 'נק\'', 'money': '{n} ש"ח',
    'home.status': 'מה המצב', 'home.rank': 'מקום', 'home.of': 'מתוך {n}', 'home.behind': 'פיגור מהמוביל', 'home.total': 'סה"כ נקודות',
    'home.upnext': 'מה עכשיו', 'home.upnext.pick': '{match} ננעל בעוד {time}. עוד לא ניחשת.', 'home.upnext.cta': 'לנחש עכשיו',
    'home.upnext.done': 'הכל מסודר. נחזור לכאן ברגע שתופיע פעולה רלוונטית.',
    'home.next': 'המשחקים הבאים שלך', 'home.viewAll': 'הצג הכל', 'home.yourPick': 'הניחוש שלך {score}', 'home.noPick': 'עוד לא ניחשת',
    'home.community': 'מה הקהילה ניחשה היום', 'home.seeAll': 'ראה את כל ההימורים', 'home.picked': '{n}/{total} בחרו ב{team}', 'home.pickedDraw': '{n}/{total} בחרו בתיקו',
    'home.lastBet': 'ההימור האחרון', 'home.yourBet': 'ההימור שלך', 'home.earned': 'צברת',
    'home.chart': 'נקודות במהלך הטורניר', 'home.chartNote': '{n} ימי משחק',
    'home.leaders': 'מובילים', 'home.fullTable': 'טבלה מלאה', 'you': 'אתה',
    'home.allBets': 'כל ההימורים', 'home.allBetsSub': 'ניחושי משחקים, לייב, טורניר ובתים',
    'home.whatsapp': 'קבוצת הוואטסאפ של הטוטו', 'home.whatsappSub': 'עדכונים, ויכוחים על משחקים והקנטות בין החברים', 'home.dismiss': 'הסתר',
    'home.news': 'חדשות אחרונות',
    'split.title': 'חלוקת הקופה', 'split.pot': 'קופה', 'split.cost': 'עלות API', 'split.toSplit': 'לחלוקה',
    'share.king': 'מלך המונדיאל', 'share.second': 'מקום שני · כללי', 'share.third': 'מקום שלישי · כללי', 'share.picks': 'אלוף הניחושים', 'share.live': 'אלוף הלייב',
    'bets.title': 'הימורים',
    'cat.matches': 'ניחושי משחקים', 'cat.tournament': 'הימורי טורניר', 'cat.groups': 'דירוגי בתים', 'cat.live': 'הימורי לייב', 'cat.duels': 'דו-קרב',
    'time.upcoming': 'בעתיד', 'time.past': 'עברו',
    'picks.title': 'ניחושי משחקים', 'picks.sub': 'כל המשחקים שעוד אפשר להמר עליהם, ברשימה אחת. ממלאים תוצאה והיא נשמרת לבד.',
    'legend.title': 'ניקוד:', 'legend.exact': 'פגיעה', 'legend.direction': 'כיוון', 'legend.advances': 'מי עולה', 'legend.wrong': 'טעות',
    'vs': 'נגד', 'surprise': 'תפתיע אותי', 'goalsDown': '{team}: שער אחד פחות', 'goalsUp': '{team}: שער אחד יותר',
    'status.none': 'עוד אין ניחוש', 'status.saving': 'שומר…', 'status.saved': 'נשמר {score}', 'status.undo': 'בטל', 'status.removed': 'הניחוש הוסר',
    'locksIn': 'ננעל בעוד {time}',
    'picks.empty': 'אין כרגע משחקים זמינים. ננעלים 5 דקות לפני פתיחה ויורדים מהרשימה.',
    'picks.hint': 'מחפש את הימורי הטורניר?', 'picks.hintLink': 'להימורי טורניר',
    'past.title': 'ניחושי משחקים שעברו', 'past.sub': 'כל המשחקים שכבר התחילו או הסתיימו, עם הניחוש שלך, התוצאה האמיתית והנקודות שצברת.',
    'past.myPick': 'הניחוש שלי', 'past.points': 'ניקוד', 'past.final': 'סיום', 'past.advances': 'מי עולה',
    'kind.exact': 'פגיעה', 'kind.direction': 'כיוון', 'kind.wrong': 'טעות', 'kind.none': 'אין ניחוש',
    'tour.title': 'הימורי טורניר', 'tour.sub': 'ניחושים חד-פעמיים על כל הטורניר. כל הימור נסגר בשריקת הפתיחה של המשחק הראשון שמושפע ממנו.',
    'tour.surprise': 'תפתיע אותי', 'tour.surpriseDone': 'בחרנו בשבילך את {name}. אפשר לשנות עד הסגירה.', 'tour.allPicked': 'לכל שאלה פתוחה כבר יש ניחוש שלך.',
    'q.ball': 'מי יזכה בכדור הזהב של המונדיאל?', 'q.champion': 'מי תזכה במונדיאל?', 'q.scorer': 'מי יהיה מלך השערים של המונדיאל?',
    'q.ballInfo': 'הפרס לשחקן הטוב ביותר בטורניר, מוכרז אחרי הגמר.',
    'tour.closes': 'נסגר {date}', 'tour.closed': 'נסגר', 'tour.locked': 'נעול', 'tour.choosePlayer': 'בחר שחקן',
    'tour.scenarios': 'תרחישים', 'tour.now': 'כעת', 'tour.ifRight': 'אם תפגע', 'tour.ifWrong': 'אם תטעה',
    'tour.free': 'ללא עלות', 'tour.saved': 'נשמר', 'tour.notPicked': 'עוד לא בחרת',
    'picker.title': 'כדור הזהב', 'picker.search': 'חיפוש שחקן או נבחרת…', 'picker.empty': 'אין שחקן שמתאים ל"{q}".', 'picker.close': 'סגור',
    'picker.payout': '‎+{n} אם תפגע',
    'pos.fw': 'חלוץ', 'pos.mf': 'קשר', 'pos.df': 'מגן',
    'notHere.title': '{name} לא נמצאים בדמו', 'notHere.body': 'באפליקציה האמיתית הם קיימים. כאן אפשר לנסות ניחושי משחקים והימורי טורניר.', 'notHere.cta': 'לניחושי משחקים',
    'lb.title': 'טבלת המובילים',
    'lb.overall': 'כללי', 'lb.matches': 'משחקים', 'lb.live': 'לייב', 'lb.duels': 'דו-קרב',
    'lb.sub.overall': 'מלך המונדיאל - יתרת הבנק הכוללת מניחושי משחקים, לייב, דו-קרב והתאמות.',
    'lb.sub.matches': 'נקודות מניחושי משחקים בלבד. בשוויון מכריע מספר הפגיעות המדויקות.',
    'lb.sub.live': 'הרווח נטו מהימורי לייב.',
    'lb.sub.duels': 'נקודות שנצברו והופסדו בדו-קרבות. בשוויון מכריע מספר הדו-קרבות.',
    'monkey.name': 'הקוף', 'monkey.sub': 'יעד להכות · {n} מתוך {total} מובילים עליו',
    'lb.bets': '{n} הימורים', 'lb.expand': 'הצג את השינוי האחרון של {name}', 'lb.collapse': 'הסתר את השינוי האחרון של {name}',
    'lb.before': 'לפני האחרון', 'lb.change': 'השינוי האחרון', 'lb.now': 'כעת', 'lb.lastTime': 'פעם אחרונה',
    'tag.match': 'משחק', 'lb.pick': 'בחירה: {x}',
    'live.title': 'תוצאות חיות', 'live.sub': 'משחקים שרצים עכשיו, שמתחילים היום ושהסתיימו לא מזמן.', 'live.auto': 'מתעדכן אוטומטית',
    'live.badge': 'לייב', 'live.yourPick': 'הניחוש שלך', 'live.rightNow': 'כרגע', 'live.projected': 'צפי: משתנה כל עוד המשחק רץ',
    'live.waiting': 'ממתין לשריקת הפתיחה', 'live.kickoffIn': 'פתיחה בעוד {time}', 'live.fullTime': 'סיום', 'live.earned': 'צברת',
    'live.pickNow': 'לנחש עכשיו', 'live.noPick': 'אין ניחוש', 'live.goal': 'גול של {team}! {score}', 'live.ended': 'סיום: {score}. צברת ‎+{n}.',
    'day.today': 'היום', 'day.tomorrow': 'מחר', 'day.yesterday': 'אתמול'
  }
};

var lang = 'en';

/* Wording changes from the admin replace the defaults key by key, only for keys this replica has. */
export function applyWording(map) {
  Object.keys(STRINGS).forEach(function (l) {
    var given = map && map[l];
    if (!given || typeof given !== 'object') return;
    Object.keys(given).forEach(function (k) {
      if (STRINGS[l][k] !== undefined && typeof given[k] === 'string' && given[k].trim()) STRINGS[l][k] = given[k];
    });
  });
}

export function getLang() { return lang; }
export function setLang(next) {
  lang = next === 'he' ? 'he' : 'en';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}

/* t('home.of', { n: 24 }) */
export function t(key, vars) {
  var s = STRINGS[lang][key];
  if (s === undefined) s = STRINGS.en[key];
  if (s === undefined) return key;
  return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; }) : s;
}

/* ---------- Formats ---------- */

export function num(n) { return Math.round(n).toLocaleString('en-US'); }
export function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + num(Math.abs(n)); }
export function money(n) { return t('money', { n: num(n) }); }
export function team(code) { var x = TEAMS[code]; return x ? x[lang] : code; }
export function score(s) { return s[0] + '-' + s[1]; }
/* "→ 1,289", pointing along the reading direction. */
export function towards(text) { return (lang === 'he' ? '← ' : '→ ') + text; }
export function personName(p) { return p[lang]; }

var DAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  he: ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת']
};
var MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  he: ['בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני', 'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר']
};
var SHORT = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };

function pad2(n) { return (n < 10 ? '0' : '') + n; }
export function clock(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }

/* "Sunday, 28 June" or "יום ראשון, 28 ביוני" */
export function dayHeading(d) { return DAYS[lang][d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[lang][d.getMonth()]; }

/* "28 Jun, 22:00" or "28 ביוני, 22:00" */
export function shortDateTime(d) {
  var m = lang === 'he' ? MONTHS.he[d.getMonth()] : SHORT.en[d.getMonth()];
  return d.getDate() + ' ' + m + ', ' + clock(d);
}

/* Today, Tomorrow, Yesterday, or the date. */
export function relativeDay(index, d) {
  if (index === 0) return t('day.today');
  if (index === 1) return t('day.tomorrow');
  if (index === -1) return t('day.yesterday');
  return dayHeading(d);
}

/* A countdown in words: "1h 47m" or "4m 10s"; Hebrew "1:47 שעות" or "4 דקות". */
export function duration(cd) {
  if (lang === 'he') return cd.h > 0 ? cd.h + ':' + pad2(cd.m) + ' שעות' : cd.m > 0 ? cd.m + ' דקות' : cd.s + ' שניות';
  return cd.h > 0 ? cd.h + 'h ' + cd.m + 'm' : cd.m > 0 ? cd.m + 'm ' + cd.s + 's' : cd.s + 's';
}
