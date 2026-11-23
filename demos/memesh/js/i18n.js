/* Memesh demo: every word the replica shows, in Hebrew (the real app's only language, so it opens in
   it) and English, plus the formats for dates, money and the activity feed.
   Hebrew wording follows the real product where the tour recorded it. */

import { STAFF, CUSTOMERS, ROUNDS, TODAY } from './data.js';

export const STRINGS = {
  he: {
    'demo.title': 'ממש · דמו', 'demo.viewAs': 'צפו במערכת כ:', 'demo.madeUp': 'דמו עם נתונים מומצאים', 'demo.back': 'חזרה לפורטפוליו',
    'demo.langSwitch': 'Switch to English', 'demo.langShort': 'EN',
    'demo.role.parent': 'הורה', 'demo.role.desk': 'עמדת קופה', 'demo.role.manager': 'מנהל/ת',
    'demo.roleSub.parent': 'אזור אישי', 'demo.roleSub.desk': 'סריקה וניקוב', 'demo.roleSub.manager': 'לוח בקרה',
    'common.back': 'חזרה', 'common.cancel': 'ביטול', 'common.close': 'סגירה', 'common.less': 'פחות', 'common.more': 'יותר', 'common.next': 'הבא', 'common.prev': 'הקודם', 'common.signout': 'התנתק',
    'toast.notInDemo': '{what}: לא חלק מהדמו.', 'toast.signout': 'אי אפשר להתנתק מדמו. שום דבר כאן לא אמיתי.', 'toast.mainSite': 'האתר הראשי לא חלק מהדמו.',
    'p.nav': 'אזור אישי', 'p.bookings': 'הזמנות', 'p.cards': 'כרטיסיות', 'p.profile': 'פרופיל', 'p.signout': 'יציאה', 'p.mainSite': 'לאתר הראשי',
    'p.scope.upcoming': 'קרובות', 'p.scope.past': 'עבר', 'p.scope.cancelled': 'בוטלו', 'p.scope.all': 'הכל',
    'p.range.month': 'חודש אחרון', 'p.range.quarter': '3 חודשים', 'p.range.half': 'חצי שנה', 'p.range.year': 'שנה', 'p.range.all': 'הכל',
    'p.empty.upcoming': 'אין הזמנות קרובות. אפשר להזמין סבב ממסך הכרטיסיות.', 'p.empty.past': 'אין הזמנות שהתקיימו בטווח הזה.', 'p.empty.cancelled': 'אין הזמנות שבוטלו.', 'p.empty.all': 'עדיין אין הזמנות.',
    'p.status.used': 'נוצל', 'p.status.cancelled': 'בוטל', 'p.status.booked': 'הזמנה פעילה',
    'p.barcode': 'ברקוד — {label}', 'p.child': 'ילד/ה – מגיל הליכה ועד גיל 6', 'p.children': '{n} ילדים', 'p.extraIncluded': 'כולל מלווה נוסף',
    'p.reschedule': 'שנה מועד', 'p.cancel': 'בטל הזמנה', 'p.cancelPolicy': 'אפשר לבטל הזמנה עד 24 שעות לפני תחילת המועד. אפשר לשנות מועד עד שעת ההתחלה של ההזמנה המקורית.',
    'p.cancelTitle': 'לבטל את ההזמנה?', 'p.cancelRefund': 'הכניסה תוחזר לכרטיסייה שלך.', 'p.cancelYes': 'כן, בטלו וזכו אותי', 'p.cancelled': 'ההזמנה בוטלה. הכניסה חזרה לכרטיסייה.',
    'p.err.late': 'כבר מאוחר מדי לבטל (אפשר עד 24 שעות לפני הסבב).', 'p.err.entries': 'לא נותרו מספיק כניסות בכרטיסייה.', 'p.err.spots': 'אין מספיק מקומות פנויים בסבב. בחרו זמן אחר.', 'p.err.expired': 'הכרטיסייה פגה.', 'p.err.over': 'הסבב הזה כבר הסתיים. בחרו זמן אחר.',
    'p.err.name': 'שם פרטי ושם משפחה הם שדות חובה.', 'p.err.email': 'כתובת מייל לא תקינה.',
    'p.noCards': 'אין כרטיסיות פעילות.', 'p.card': 'כרטיסייה', 'p.left': 'נותרו {n} מתוך {total} כניסות', 'p.noExpiry': 'ללא תפוגה', 'p.of': 'מתוך {n}', 'p.entriesLeft': 'כניסות שנותרו',
    'p.qrOf': 'קוד QR — {serial}', 'p.book': 'הזמנת מקום לסבב', 'p.cardNote': 'הכרטיסייה אינה מהווה הזמנת מקום. יש לבחור סבב לפני כל ביקור. הגעה ללא הרשמה מראש תתאפשר על בסיס מקום פנוי בלבד.',
    'p.flowIntro': 'ניתן להגיע בכל שעה במהלך הסבב שנבחר, אך הביקור מסתיים בשעת הסיום המוצגת גם במקרה של הגעה מאוחרת.',
    'p.calendar': 'לוח שנה', 'p.today': 'היום', 'p.pickDay': 'בחירת יום',
    'p.day.closed': 'המקום סגור בתאריך זה.', 'p.day.free': 'בתאריך זה הכניסה חופשית — אין צורך בהזמנת סבב, פשוט מגיעים.', 'p.day.full': 'כל הסבבים מלאים ביום זה — אפשר להצטרף לרשימת ההמתנה.',
    'p.spotsNote': 'מספר המקומות הפנויים מתייחס למספר הילדים. כל ילד/ה כולל/ת מלווה אחד שאינו נספר לתפוסה.',
    'p.spots': '{n} מקומות פנויים', 'p.roundFull': 'מלא · רשימת המתנה', 'p.waitlistJoined': 'נרשמת לרשימת ההמתנה לסבב {time}. נודיע לך אם יתפנה מקום.',
    'legend.plenty': 'הרבה מקום', 'legend.few': 'נשארו מעט', 'legend.full': 'מלא', 'legend.free': 'כניסה ללא בחירת סבב', 'legend.closed': 'סגור',
    'p.howMany': 'כמה כניסות?', 'p.punchLine': 'כניסה לסבב {time}. ינוקבו {n} מתוך {left} כניסות שנותרו.',
    'p.companionPolicy': 'כל כרטיס ילד או תינוק כולל מלווה אחד. ניתן להוסיף מראש מלווה אחד נוסף בתשלום.',
    'p.extraCompanion': 'מלווה נוסף', 'p.extraNote': 'מלווה אחד כלול בכניסה. התשלום מתבצע באתר בסיום ההזמנה.',
    'p.summary': 'סיכום ההזמנה', 'p.sum.date': 'תאריך', 'p.sum.round': 'סבב', 'p.sum.children': 'כרטיסי ילדים', 'p.sum.companions': 'מלווים', 'p.sum.total': 'סך הכול נכנסים',
    'p.confirm': 'אישור והזמנה', 'p.confirmPay': 'אישור, הזמנה ותשלום {price}',
    'p.booked.one': 'ההזמנה נקלטה! הברקוד מחכה לך כאן, תחת ההזמנות הקרובות.', 'p.booked.many': 'ההזמנות נקלטו! הברקוד מחכה לך כאן, תחת ההזמנות הקרובות.',
    'rules.title': 'כמה דברים חשובים לפני אישור הסבב', 'rules.ok': 'קראתי, אפשר לאשר את הסבב', 'rules.terms': 'בהמשך ההזמנה אתם מסכימים לתקנון האתר',
    'rule.ages': 'גילאי המשחקייה', 'rule.ages.short': 'המתחם מיועד לילדים עד גיל 6 בלבד.',
    'rule.socks': 'גרביים — חובה באזורי המשחק', 'rule.socks.short': 'לילדים ולמבוגרים, כולל תינוקות.',
    'rule.entry': 'מה כוללת כל כניסה מהכרטיסייה?', 'rule.entry.short': 'כל כניסה כוללת ילד/ה ומלווה אחד/ת מגיל 16 ומעלה.',
    'rule.round': 'הרשמה לסבב כניסה', 'rule.round.short': 'ההזמנה תקפה לסבב שנבחר בלבד.',
    'rule.cancel': 'ביטול ושינוי הזמנה', 'rule.cancel.short': 'ביטול עד 24 שעות לפני. שינוי עד תחילת הסבב המקורי ובכפוף לזמינות.',
    'rule.parking': 'הגעה וחניה', 'rule.parking.short': 'רחוב הדוגמה 1, תל אביב',
    'p.editDetails': 'עריכת פרטים', 'p.first': 'שם פרטי', 'p.lastName': 'שם משפחה', 'p.phone': 'טלפון', 'p.phoneLocked': 'לא ניתן לשנות טלפון · פנו לצוות', 'p.email': 'מייל',
    'p.channel': 'ערוץ עדכונים מועדף', 'p.childrenHint': 'לעריכת רשימת הילדים · פנו לצוות', 'p.save': 'שמירת שינויים', 'p.saved': 'הפרטים נשמרו',
    'channel.sms': 'SMS', 'channel.whatsapp': 'וואטסאפ', 'channel.email': 'מייל',
    'd.tabs': 'עמדת צוות', 'd.till': 'קופה', 'd.rounds': 'סבבים',
    'd.greet.morning': 'בוקר טוב, {name}', 'd.greet.afternoon': 'צהריים טובים, {name}', 'd.greet.evening': 'ערב טוב, {name}', 'd.greet.night': 'לילה טוב, {name}',
    'd.entriesToday': 'כניסות היום', 'd.cardsToday': 'כרטיסיות שנמכרו היום',
    'd.find': 'חיפוש לקוח', 'd.findSub': 'כל הלקוחות · חיפוש, מיון וסינון', 'd.new': 'לקוח חדש', 'd.newSub': 'רישום ומכירת כרטיסייה', 'd.scan': 'סריקת QR', 'd.scanSub': 'ניקוב כניסה מהיר',
    'd.camera': 'מצלמת סריקה', 'd.camHint': 'מקמו את קוד ה-QR במסגרת — כרטיסייה או כרטיס כניסה לסבב',
    'd.held': 'קודים על הדלפק — לחצו כדי להציג למצלמה:', 'd.heldCard': 'כרטיסייה', 'd.heldTicket': 'כרטיס כניסה · {round}',
    'd.manual': 'הזנת מספר סידורי במקום', 'd.serial': 'מספר סידורי',
    'd.err.empty': 'נא להזין מספר סידורי', 'd.err.qr': 'קוד QR לא תקין. השתמשו במספר סידורי.', 'd.err.used': 'הכרטיסייה מנוצלת — אין כניסות נוספות.', 'd.err.expired': 'הכרטיסייה פגת תוקף.',
    'd.err.count': 'מספר הכניסות לא תקין.', 'd.err.cancelled': 'ההזמנה בוטלה — אין כניסה.', 'd.err.day': 'אפשר לסמן הגעה רק ביום הסבב עצמו.', 'd.err.already': 'הכניסה הזו כבר סומנה.',
    'd.howMany': 'כמה כניסות לנקב?', 'd.oneEntry': 'כניסה אחת', 'd.entries': '{n} כניסות', 'd.max': 'מקסימום {n} כניסות בסריקה זו', 'd.punch': 'נקב', 'd.punching': 'מנקב…',
    'd.punched': '✓ נוקב · נותרו {n}', 'd.punchEntry': 'ניקוב כניסה',
    'd.confirmEntry': 'אישור כניסה', 'd.plusCompanion': '+מלווה נוסף', 'd.arrivedToast': '{name}: הכניסה אושרה.',
    'd.searchPh': 'שם, טלפון, מספר לקוח או אימייל…', 'd.sort': 'מיון', 'd.filter': 'סינון',
    'd.sort.az': 'א-ב', 'd.sort.newest': 'חדשים', 'd.sort.purchase': 'רכישה אחרונה',
    'd.filter.all': 'הכל', 'd.filter.vip': 'VIP', 'd.filter.frozen': 'מוקפאים', 'd.filter.active': 'עם כרטיסייה פעילה',
    'd.count': '{n} לקוחות', 'd.found': 'נמצאו {n}', 'd.noMatch': 'לא נמצאו לקוחות שמתאימים לחיפוש',
    'd.backSearch': 'חזרה לחיפוש', 'd.history': 'היסטוריית כניסות', 'd.noHistory': 'אין כניסות עדיין.', 'd.refund': 'החזר', 'd.refundNote': 'החזר כניסה דורש הרשאה וסיסמה — לא חלק מהדמו.',
    'd.children': 'ילדים', 'd.noChildren': 'לא נרשמו ילדים.', 'd.note': 'הערת צוות פנימית', 'd.noNotes': 'אין הערות.',
    'd.todayRounds': 'סבבי היום', 'd.autoUpdate': 'מתעדכן אוטומטית · עודכן הרגע',
    'd.kids': '{n} / {cap} ילדים', 'd.free': '{n} פנויים', 'd.arrivedOf': '{a} הגיעו מתוך {b} שהזמינו',
    'd.room': 'יש מקום — {n} פנויים. אפשר למכור כניסה במקום.', 'd.noRoom': 'הסבב מלא.',
    'd.showList': 'מי הגיע? הצגת הרשימה', 'd.hideList': 'הסתרת הרשימה', 'd.arrSearch': 'חיפוש לפי שם או טלפון…',
    'd.walkin': 'כניסה במקום', 'd.manualTag': 'נוסף/ה ידנית', 'd.noDetails': 'ללא פרטים', 'd.arrived': 'הגיעו', 'd.markArrived': 'סימון הגעה', 'd.more': 'ועוד {n}',
    'type.child': 'ילד/ה', 'type.baby': 'תינוק',
    'm.nav': 'ניהול', 'm.page.dashboard': 'לוח בקרה', 'm.page.customers': 'ניהול לקוחות', 'm.page.cards': 'ניהול כרטיסיות', 'm.page.tickets': 'ניהול כרטיסים', 'm.page.staff': 'ניהול צוות', 'm.page.reports': 'דוחות',
    'm.refresh': 'רענון אוטומטי כל 30 שנ׳ · עודכן הרגע', 'm.todayRounds': 'סבבי היום', 'm.manage': '‹ ניהול משתתפים', 'm.closeManage': 'סגירת ניהול משתתפים',
    'm.participants': 'משתתפי {round}', 'm.add': 'הוספת משתתף', 'm.addTitle': 'הוספת משתתף — חיפוש לקוח', 'm.addPh': 'שם, טלפון או מספר לקוח…', 'm.walkin': 'כניסה במקום ללא פרטים',
    'm.added': '{name} נוספ/ה לסבב.', 'm.full': 'הסבב מלא.', 'm.arrived': 'הגיע/ה', 'm.move': 'העברה לסבב אחר', 'm.remove': 'הסרה', 'm.removed': 'המשתתף הוסר מהסבב.',
    'm.inNumbers': 'היום במספרים', 'm.kpi.revenue': 'הכנסה היום', 'm.kpi.bookings': 'הזמנות היום', 'm.kpi.holds': 'holds פעילים', 'm.kpi.cards': 'כרטיסיות שנמכרו', 'm.kpi.companions': 'מלווים נוספים', 'm.vsYesterday': 'מאתמול',
    'm.week': '7 ימים קדימה',
    'm.stat.24h': 'כניסות ב-24 שעות האחרונות', 'm.stat.7d': 'כניסות ב-7 הימים האחרונים', 'm.stat.30d': 'כניסות ב-30 הימים האחרונים', 'm.stat.cards30': 'כרטיסיות שנמכרו ב-30 הימים', 'm.stat.expiring': 'פג תוקף ב-30 הימים הקרובים', 'm.stat.new7': 'לקוחות חדשים השבוע',
    'm.activity': 'פעולות אחרונות',
    'm.custSearch': 'חיפוש לפי שם, טלפון או מספר לקוח…', 'm.custCount': '{n} לקוחות', 'm.addCustomer': 'הוספת לקוח',
    'm.col.name': 'שם', 'm.col.id': 'מספר לקוח', 'm.col.phone': 'טלפון', 'm.col.email': 'דוא"ל',
    'm.custDetails': 'פרטי לקוח', 'm.delete': 'מחק', 'm.channel': 'ערוץ עדיף', 'm.heard': 'איך שמע עלינו', 'm.joined': 'נרשם בתאריך', 'm.custCards': 'כרטיסיות ({n})', 'm.noCards': 'אין כרטיסיות.',
    'm.cardCount': '{n} כרטיסיות', 'm.cardSearch': 'חיפוש לפי מספר סידורי, שם לקוח, טלפון או מס׳ לקוח…',
    'm.cards.active': 'פעילות', 'm.cards.expired': 'שפגו', 'm.cards.cancelled': 'בוטלו',
    'm.cardCol.serial': 'מספר סידורי', 'm.cardCol.customer': 'לקוח', 'm.cardCol.usage': 'ניצול', 'm.cardCol.issued': 'הונפקה', 'm.cardCol.validity': 'תוקף', 'm.cardCol.status': 'סטטוס',
    'm.status.active': 'פעילה', 'm.status.used': 'נוצלה', 'm.status.expired': 'פגה', 'm.status.cancelled': 'בוטלה', 'm.soldBy': 'מכר: {who}',
    'm.staff.team': 'צוות', 'm.staff.perms': 'הרשאות', 'm.addStaff': 'הוספת איש צוות', 'm.me': 'אני', 'm.pin': 'קוד אישי', 'm.edit': 'ערוך',
    'm.permsTitle': 'הרשאות לפי תפקיד', 'm.permsSub': 'הגדירו אילו פעולות מותרות לכל תפקיד. שינויים נשמרים אוטומטית.', 'm.viewOnly': 'תצוגה בלבד. רק לאדמין יש הרשאה לשנות את הטבלה.', 'm.perm': 'הרשאה',
    'm.roleNote.admin': 'תמיד מלא — לא ניתן לשינוי', 'm.roleNote.manager': 'תפקיד אחראי משמרת', 'm.roleNote.cashier': 'תפקיד קופאי',
    'role.admin': 'אדמין', 'role.manager': 'מנהל משמרת', 'role.cashier': 'קופאי',
    'perm.group.staff': 'ניהול צוות', 'perm.group.customers': 'לקוחות', 'perm.group.cards': 'כרטיסיות', 'perm.group.rounds': 'סבבים',
    'perm.staff.view': 'צפייה בצוות', 'perm.staff.create': 'הוספת איש צוות', 'perm.staff.edit': 'עריכת איש צוות', 'perm.staff.change_role': 'שינוי תפקיד',
    'perm.customers.view': 'צפייה בלקוחות', 'perm.customers.edit': 'עריכת לקוח', 'perm.customers.delete': 'מחיקת לקוח',
    'perm.cards.sell': 'מכירת כרטיסייה', 'perm.cards.refund_entry': 'החזר כניסה', 'perm.cards.cancel': 'ביטול כרטיסייה',
    'perm.rounds.manage_participants': 'ניהול משתתפים בסבב', 'perm.rounds.edit_rules': 'עריכת כללי סבבים',
    'heard.friend': 'חבר/ה', 'heard.social': 'רשתות חברתיות', 'heard.web': 'אתר אינטרנט', 'heard.street': 'עברתי ברחוב', 'heard.none': 'לא צוין',
    'act.punch': 'ניקוב כניסה', 'act.book': 'הזמנה באתר', 'act.sale': 'מכירת כרטיסייה', 'act.walkin': 'הוספה ידנית לסבב · כניסה במקום', 'act.cancel': 'ביטול הזמנה',
    'act.checkin': 'אישור כניסה', 'act.arrive': 'סימון הגעה', 'act.manual': 'הוספה ידנית לסבב', 'act.remove': 'הסרה מסבב',
    'round.morning': 'בוקר', 'round.noon': 'צהריים', 'round.evening': 'ערב'
  },
  en: {
    'demo.title': 'Memesh · demo', 'demo.viewAs': 'View the system as:', 'demo.madeUp': 'Demo with made-up data', 'demo.back': 'Back to the portfolio',
    'demo.langSwitch': 'Switch to Hebrew', 'demo.langShort': 'עב',
    'demo.role.parent': 'Parent', 'demo.role.desk': 'Front desk', 'demo.role.manager': 'Manager',
    'demo.roleSub.parent': 'Personal area', 'demo.roleSub.desk': 'Scan and punch', 'demo.roleSub.manager': 'Dashboard',
    'common.back': 'Back', 'common.cancel': 'Cancel', 'common.close': 'Close', 'common.less': 'Fewer', 'common.more': 'More', 'common.next': 'Next', 'common.prev': 'Previous', 'common.signout': 'Sign out',
    'toast.notInDemo': '{what} is not part of this demo.', 'toast.signout': 'You can\'t sign out of a demo. Nothing here is real.', 'toast.mainSite': 'The main site is not part of this demo.',
    'p.nav': 'Personal area', 'p.bookings': 'Bookings', 'p.cards': 'Cards', 'p.profile': 'Profile', 'p.signout': 'Sign out', 'p.mainSite': 'Main site',
    'p.scope.upcoming': 'Upcoming', 'p.scope.past': 'Past', 'p.scope.cancelled': 'Cancelled', 'p.scope.all': 'All',
    'p.range.month': 'Last month', 'p.range.quarter': '3 months', 'p.range.half': 'Half a year', 'p.range.year': 'Year', 'p.range.all': 'All',
    'p.empty.upcoming': 'No upcoming bookings. You can book a round from the Cards screen.', 'p.empty.past': 'No past bookings in this range.', 'p.empty.cancelled': 'No cancelled bookings.', 'p.empty.all': 'No bookings yet.',
    'p.status.used': 'Used', 'p.status.cancelled': 'Cancelled', 'p.status.booked': 'Booked',
    'p.barcode': 'Barcode: {label}', 'p.child': 'Child – walking age to 6', 'p.children': '{n} children', 'p.extraIncluded': 'Includes an extra companion',
    'p.reschedule': 'Change time', 'p.cancel': 'Cancel booking', 'p.cancelPolicy': 'You can cancel up to 24 hours before the round starts, and change the time until the original booking starts.',
    'p.cancelTitle': 'Cancel the booking?', 'p.cancelRefund': 'The entry goes back to your card.', 'p.cancelYes': 'Yes, cancel and refund me', 'p.cancelled': 'Booking cancelled. The entry is back on your card.',
    'p.err.late': 'Too late to cancel (possible up to 24 hours before the round).', 'p.err.entries': 'Not enough entries left on the card.', 'p.err.spots': 'Not enough spots in the round. Pick another time.', 'p.err.expired': 'The card has expired.', 'p.err.over': 'That round is over. Pick another time.',
    'p.err.name': 'First and last name are required.', 'p.err.email': 'Invalid email address.',
    'p.noCards': 'No active punch cards.', 'p.card': 'Punch card', 'p.left': '{n} of {total} entries left', 'p.noExpiry': 'No expiry', 'p.of': 'of {n}', 'p.entriesLeft': 'Entries left',
    'p.qrOf': 'QR code: {serial}', 'p.book': 'Book a spot in a round', 'p.cardNote': 'The card is not a reservation. Pick a round before each visit. Walk-ins only if there is room.',
    'p.flowIntro': 'Arrive any time during the round you pick, but the visit ends at the round\'s end time, even if you arrive late.',
    'p.calendar': 'Calendar', 'p.today': 'Today', 'p.pickDay': 'Pick a day',
    'p.day.closed': 'Closed on this date.', 'p.day.free': 'Free entry on this date. No need to book a round, just come.', 'p.day.full': 'All rounds are full on this day. You can join the waitlist.',
    'p.spotsNote': 'Free spots count children. Each child includes one companion who isn\'t counted.',
    'p.spots': '{n} spots free', 'p.roundFull': 'Full · waitlist', 'p.waitlistJoined': 'You\'re on the waitlist for the {time} round. We\'ll tell you if a spot opens.',
    'legend.plenty': 'Plenty of room', 'legend.few': 'Few left', 'legend.full': 'Full', 'legend.free': 'Entry without a round', 'legend.closed': 'Closed',
    'p.howMany': 'How many entries?', 'p.punchLine': 'Entry to the {time} round. {n} of the {left} entries left will be punched.',
    'p.companionPolicy': 'Each child or baby ticket includes one companion. You can add one extra paid companion in advance.',
    'p.extraCompanion': 'Extra companion', 'p.extraNote': 'One companion is included. Payment happens on the site after booking.',
    'p.summary': 'Booking summary', 'p.sum.date': 'Date', 'p.sum.round': 'Round', 'p.sum.children': 'Child tickets', 'p.sum.companions': 'Companions', 'p.sum.total': 'Total entering',
    'p.confirm': 'Confirm & book', 'p.confirmPay': 'Confirm, book and pay {price}',
    'p.booked.one': 'Booked! Your barcode is waiting here, under Upcoming.', 'p.booked.many': 'Booked! Your barcodes are waiting here, under Upcoming.',
    'rules.title': 'A few important things before confirming', 'rules.ok': 'I\'ve read it, confirm the round', 'rules.terms': 'By continuing you agree to the site\'s terms',
    'rule.ages': 'Playground ages', 'rule.ages.short': 'For children up to age 6 only.',
    'rule.socks': 'Socks are a must in the play areas', 'rule.socks.short': 'For children and adults, babies included.',
    'rule.entry': 'What does each card entry include?', 'rule.entry.short': 'A child plus one companion aged 16 or over.',
    'rule.round': 'Booking a round', 'rule.round.short': 'Valid for the chosen round only.',
    'rule.cancel': 'Cancelling and changing', 'rule.cancel.short': 'Cancel up to 24 hours before; change until the round starts, if there is room.',
    'rule.parking': 'Getting there and parking', 'rule.parking.short': '1 Example Street, Tel Aviv',
    'p.editDetails': 'Edit details', 'p.first': 'First name', 'p.lastName': 'Last name', 'p.phone': 'Phone', 'p.phoneLocked': 'The phone can\'t be changed · contact staff', 'p.email': 'Email',
    'p.channel': 'Preferred update channel', 'p.childrenHint': 'To edit the children list · contact staff', 'p.save': 'Save changes', 'p.saved': 'Details saved',
    'channel.sms': 'SMS', 'channel.whatsapp': 'WhatsApp', 'channel.email': 'Email',
    'd.tabs': 'Front desk', 'd.till': 'Till', 'd.rounds': 'Rounds',
    'd.greet.morning': 'Good morning, {name}', 'd.greet.afternoon': 'Good afternoon, {name}', 'd.greet.evening': 'Good evening, {name}', 'd.greet.night': 'Good night, {name}',
    'd.entriesToday': 'Entries today', 'd.cardsToday': 'Cards sold today',
    'd.find': 'Find customer', 'd.findSub': 'All customers · search, sort, filter', 'd.new': 'New customer', 'd.newSub': 'Register and sell a punch card', 'd.scan': 'Scan QR', 'd.scanSub': 'Quick entry punch',
    'd.camera': 'Scanning camera', 'd.camHint': 'Place the QR code in the frame: a punch card or a round ticket',
    'd.held': 'Codes on the counter. Click one to hold it up to the camera:', 'd.heldCard': 'Punch card', 'd.heldTicket': 'Round ticket · {round}',
    'd.manual': 'Enter a serial number instead', 'd.serial': 'Serial number',
    'd.err.empty': 'Please enter a serial number', 'd.err.qr': 'Invalid QR. Use the serial number.', 'd.err.used': 'This card is used up. No entries left.', 'd.err.expired': 'The card has expired.',
    'd.err.count': 'That number of entries isn\'t possible.', 'd.err.cancelled': 'This booking was cancelled. No entry.', 'd.err.day': 'Check-in only on the round\'s own day.', 'd.err.already': 'This entry was already checked in.',
    'd.howMany': 'How many entries to punch?', 'd.oneEntry': 'one entry', 'd.entries': '{n} entries', 'd.max': 'Up to {n} entries in this scan', 'd.punch': 'Punch', 'd.punching': 'Punching…',
    'd.punched': '✓ Punched · {n} left', 'd.punchEntry': 'Punch entry',
    'd.confirmEntry': 'Confirm entry', 'd.plusCompanion': '+ extra companion', 'd.arrivedToast': '{name}: entry confirmed.',
    'd.searchPh': 'Name, phone, customer # or email…', 'd.sort': 'Sort', 'd.filter': 'Filter',
    'd.sort.az': 'A–Z', 'd.sort.newest': 'Newest', 'd.sort.purchase': 'Last purchase',
    'd.filter.all': 'All', 'd.filter.vip': 'VIP', 'd.filter.frozen': 'Frozen', 'd.filter.active': 'With an active card',
    'd.count': '{n} customers', 'd.found': '{n} found', 'd.noMatch': 'No customers match your search',
    'd.backSearch': 'Back to search', 'd.history': 'Entry history', 'd.noHistory': 'No entries yet.', 'd.refund': 'Refund', 'd.refundNote': 'Refunding an entry needs permission and a password, so it isn\'t part of this demo.',
    'd.children': 'Children', 'd.noChildren': 'No children registered.', 'd.note': 'Internal staff note', 'd.noNotes': 'No notes.',
    'd.todayRounds': 'Today\'s rounds', 'd.autoUpdate': 'Auto-updating · just updated',
    'd.kids': '{n} / {cap} children', 'd.free': '{n} free', 'd.arrivedOf': '{a} of {b} booked have arrived',
    'd.room': 'There\'s room — {n} free. You can sell a walk-in entry.', 'd.noRoom': 'This round is full.',
    'd.showList': 'Who arrived? Show the list', 'd.hideList': 'Hide the list', 'd.arrSearch': 'Search by name or phone…',
    'd.walkin': 'Walk-in', 'd.manualTag': 'Added manually', 'd.noDetails': 'no details', 'd.arrived': 'Arrived', 'd.markArrived': 'Check in', 'd.more': 'and {n} more',
    'type.child': 'Child', 'type.baby': 'Baby',
    'm.nav': 'Back office', 'm.page.dashboard': 'Dashboard', 'm.page.customers': 'Customers', 'm.page.cards': 'Punch cards', 'm.page.tickets': 'Tickets', 'm.page.staff': 'Staff', 'm.page.reports': 'Reports',
    'm.refresh': 'Auto-refresh every 30 s · updated just now', 'm.todayRounds': 'Today\'s rounds', 'm.manage': 'Manage participants ›', 'm.closeManage': 'Close participant management',
    'm.participants': '{round} participants', 'm.add': 'Add participant', 'm.addTitle': 'Add participant: find a customer', 'm.addPh': 'Name, phone or customer number…', 'm.walkin': 'Walk-in, no details',
    'm.added': '{name} added to the round.', 'm.full': 'This round is full.', 'm.arrived': 'arrived', 'm.move': 'Move to another round', 'm.remove': 'Remove', 'm.removed': 'Participant removed from the round.',
    'm.inNumbers': 'Today in numbers', 'm.kpi.revenue': 'Revenue today', 'm.kpi.bookings': 'Bookings today', 'm.kpi.holds': 'Active holds', 'm.kpi.cards': 'Cards sold', 'm.kpi.companions': 'Extra companions', 'm.vsYesterday': 'vs yesterday',
    'm.week': 'Next 7 days',
    'm.stat.24h': 'Entries in the last 24 hours', 'm.stat.7d': 'Entries in the last 7 days', 'm.stat.30d': 'Entries in the last 30 days', 'm.stat.cards30': 'Cards sold in 30 days', 'm.stat.expiring': 'Expiring in the next 30 days', 'm.stat.new7': 'New customers this week',
    'm.activity': 'Recent activity',
    'm.custSearch': 'Search by name, phone or customer number…', 'm.custCount': '{n} customers', 'm.addCustomer': 'Add customer',
    'm.col.name': 'Name', 'm.col.id': 'Customer #', 'm.col.phone': 'Phone', 'm.col.email': 'Email',
    'm.custDetails': 'Customer details', 'm.delete': 'Delete', 'm.channel': 'Preferred channel', 'm.heard': 'How they heard of us', 'm.joined': 'Registered on', 'm.custCards': 'Punch cards ({n})', 'm.noCards': 'No punch cards.',
    'm.cardCount': '{n} cards', 'm.cardSearch': 'Search by serial, customer name, phone or customer #…',
    'm.cards.active': 'Active', 'm.cards.expired': 'Expired', 'm.cards.cancelled': 'Cancelled',
    'm.cardCol.serial': 'Serial', 'm.cardCol.customer': 'Customer', 'm.cardCol.usage': 'Usage', 'm.cardCol.issued': 'Issued', 'm.cardCol.validity': 'Validity', 'm.cardCol.status': 'Status',
    'm.status.active': 'Active', 'm.status.used': 'Used up', 'm.status.expired': 'Expired', 'm.status.cancelled': 'Cancelled', 'm.soldBy': 'Sold by: {who}',
    'm.staff.team': 'Team', 'm.staff.perms': 'Permissions', 'm.addStaff': 'Add staff member', 'm.me': 'me', 'm.pin': 'Personal code', 'm.edit': 'Edit',
    'm.permsTitle': 'Permissions by role', 'm.permsSub': 'Set which actions each role may do. Changes save automatically.', 'm.viewOnly': 'View only. Only an admin can change this table.', 'm.perm': 'Permission',
    'm.roleNote.admin': 'Always full, can\'t be changed', 'm.roleNote.manager': 'Shift lead role', 'm.roleNote.cashier': 'Cashier role',
    'role.admin': 'Admin', 'role.manager': 'Shift manager', 'role.cashier': 'Cashier',
    'perm.group.staff': 'Staff management', 'perm.group.customers': 'Customers', 'perm.group.cards': 'Punch cards', 'perm.group.rounds': 'Rounds',
    'perm.staff.view': 'View staff', 'perm.staff.create': 'Add staff member', 'perm.staff.edit': 'Edit staff member', 'perm.staff.change_role': 'Change role',
    'perm.customers.view': 'View customers', 'perm.customers.edit': 'Edit customer', 'perm.customers.delete': 'Delete customer',
    'perm.cards.sell': 'Sell a punch card', 'perm.cards.refund_entry': 'Refund an entry', 'perm.cards.cancel': 'Cancel a punch card',
    'perm.rounds.manage_participants': 'Manage round participants', 'perm.rounds.edit_rules': 'Edit round rules',
    'heard.friend': 'A friend', 'heard.social': 'Social media', 'heard.web': 'Website', 'heard.street': 'Walked by', 'heard.none': 'Not specified',
    'act.punch': 'entry punched', 'act.book': 'booked on the site', 'act.sale': 'card sold', 'act.walkin': 'manual add to round · walk-in', 'act.cancel': 'booking cancelled',
    'act.checkin': 'entry confirmed', 'act.arrive': 'checked in', 'act.manual': 'manual add to round', 'act.remove': 'removed from round',
    'round.morning': 'Morning', 'round.noon': 'Noon', 'round.evening': 'Evening'
  }
};

var lang = 'he';

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
  lang = next === 'en' ? 'en' : 'he';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}

/* t('p.left', { n: 10, total: 12 }) */
export function t(key, vars) {
  var s = STRINGS[lang][key];
  if (s === undefined) s = STRINGS.he[key];
  if (s === undefined) return key;
  return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; }) : s;
}

/* ---------- Formats ---------- */

function pad2(n) { return (n < 10 ? '0' : '') + n; }
export function dmy(d) { return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear(); }
export function ymdArr(a) { return dmy(new Date(a[0], a[1], a[2])); }
export function money(n) { return '₪' + Math.round(n).toLocaleString('en-US'); }
export function roundName(id) { return t('round.' + id); }
export function personName(p) { return p[lang]; }
export function firstName(p) { return p[lang].split(' ')[0]; }
export function childLine(c) { return c[lang] + ', ' + c.age; }

var WD = { he: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'], en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] };
var WDL = { he: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
var MONTHS = {
  he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

export function weekdayShort(d) { return WD[lang][d.getDay()]; }
/* "יום ב׳" or "Monday" */
export function weekdayLong(d) { return lang === 'he' ? 'יום ' + WD.he[d.getDay()] : WDL.en[d.getDay()]; }
/* "יום שני · 23 נובמבר 2026" or "Monday · 23 November 2026" */
export function longDate(d) { return (lang === 'he' ? 'יום ' : '') + WDL[lang][d.getDay()] + ' · ' + d.getDate() + ' ' + MONTHS[lang][d.getMonth()] + ' ' + d.getFullYear(); }
export function monthYear(d) { return MONTHS[lang][d.getMonth()] + ' ' + d.getFullYear(); }

/* One line of the activity feed: who · what · details, with ids turned into names and rounds. */
export function activityLine(a) {
  var staff = STAFF.filter(function (s) { return s.id === a.who; })[0];
  var who = staff || CUSTOMERS.filter(function (c) { return c.id === a.who; })[0];
  var detail = String(a.detail || '').split(' · ').map(function (part) {
    var at = part.split('@');
    var round = ROUNDS.filter(function (r) { return r.id === at[0]; })[0];
    if (round) {
      var when = at[1] ? ' · ' + dmy(new Date(TODAY.year, TODAY.month, TODAY.day + Number(at[1]))) : '';
      return roundName(round.id) + ' ' + round.start + ' - ' + round.end + when;
    }
    var person = CUSTOMERS.filter(function (c) { return c.id === part; })[0];
    return person ? person[lang] : part;
  }).join(' · ');
  return [who ? who[lang] : a.who, t('act.' + a.action), detail].filter(Boolean).join(' · ');
}
