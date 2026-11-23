// The I.M Engineering replica's rules (demos/im-eng/js/logic.js) and its content.
// The DOM-free modules only, so this runs in Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import * as D from '../../demos/im-eng/js/data.js';
import * as L from '../../demos/im-eng/js/logic.js';

const MEDIA = new URL('../../demos/im-eng/media/', import.meta.url);
const media = (name) => new URL(name + (/\.\w+$/.test(name) ? '' : '.webp'), MEDIA);

/* ---------- The contact form ---------- */

test('name and phone are required; email only when filled', () => {
  assert.deepEqual(L.checkLead({}), { name: 'שדה חובה', phone: 'שדה חובה' });
  assert.deepEqual(L.checkLead({ name: '  ', phone: ' ' }), { name: 'שדה חובה', phone: 'שדה חובה' });
  assert.deepEqual(L.checkLead({ name: 'דנה', phone: '052-1234567' }), {});
  assert.deepEqual(L.checkLead({ name: 'דנה', phone: '12345' }), { phone: 'מספר טלפון לא תקין' });
  assert.deepEqual(L.checkLead({ name: 'דנה', phone: '0521234567', email: 'not-an-email' }), { email: 'כתובת אימייל לא תקינה' });
  assert.deepEqual(L.checkLead({ name: 'דנה', phone: '0521234567', email: ' dana@example.co.il ' }), {});
});

test('Israeli phone numbers: mobile, landline, 07X and +972', () => {
  for (const ok of ['054-2806344', '0542806344', '054 280 6344', '+972 54-280-6344', '972542806344', '03-1234567', '077-1234567', '(08) 123-4567'])
    assert.ok(L.validPhone(ok), ok);
  for (const bad of ['', '05428063', '05428063445', '1542806344', '06-1234567', 'abc', '054-28o6344'])
    assert.ok(!L.validPhone(bad), bad);
  assert.equal(L.cleanPhone('+972 54-280-6344'), '0542806344');
});

test('the email the real site would send Ido', () => {
  const mail = L.leadEmail({ name: ' דנה כהן ', phone: '+972 52-123-4567', message: 'שלום' });
  assert.equal(mail.to, D.COMPANY.email);
  assert.equal(mail.subject, 'פנייה חדשה מהאתר – דנה כהן');
  assert.equal(mail.body, 'שם: דנה כהן\nטלפון: 0521234567\nאימייל: –\nהודעה: שלום');
});

/* ---------- Projects and headings ---------- */

test('projects: lookup, the home six, the next one wraps round', () => {
  assert.equal(L.bySlug('bbb-restaurant').title, 'מסעדת BBB');
  assert.equal(L.bySlug('nope'), null);
  assert.equal(L.homeProjects().length, 6);
  const last = D.PROJECTS[D.PROJECTS.length - 1];
  assert.equal(L.nextProject(last.slug), D.PROJECTS[0]);
  assert.equal(L.nextProject(D.PROJECTS[0].slug), D.PROJECTS[1]);
});

test('two-tone headings put the last word in gold', () => {
  assert.deepEqual(L.twoTone('הפרויקטים שלנו'), ['הפרויקטים', 'שלנו']);
  assert.deepEqual(L.twoTone('בואו נדבר'), ['בואו', 'נדבר']);
  assert.deepEqual(L.twoTone(' אחת '), ['', 'אחת']);
});

test('text size steps by 10% between 80% and 150%', () => {
  assert.equal(L.textSize(1, 1), 1.1);
  assert.equal(L.textSize(1, -1), 0.9);
  assert.equal(L.textSize(1.5, 1), 1.5);
  assert.equal(L.textSize(0.8, -1), 0.8);
  assert.equal(L.textSize(1.23, 1), 1.1, 'an unknown size starts from 100%');
});

/* ---------- The content ---------- */

test('the live site\'s mistakes are fixed here', () => {
  const text = JSON.stringify(D);
  assert.ok(!text.includes('[עיר]'), 'no "[city]" placeholders');
  assert.ok(!text.includes('לללימוד'), 'the triple ל typo');
  assert.ok(!/kritix/i.test(text), 'no Powered by line');
  assert.equal(D.PROJECTS.filter((p) => /גורן/.test(p.title)).length, 1, 'the law office once');
  assert.ok(L.bySlug('monday-com-offices').title.endsWith('תל אביב'));
  assert.ok(L.bySlug('habardakaya-montessori-playground').title.endsWith('פתח תקווה'));
  assert.doesNotMatch(text, /—/, 'no em dashes');
});

test('every project is complete and every photo and logo is there', async () => {
  const slugs = new Set();
  for (const p of D.PROJECTS) {
    assert.ok(!slugs.has(p.slug), p.slug); slugs.add(p.slug);
    assert.match(p.slug, /^[a-z0-9-]+$/);
    assert.ok(['עבודות גמר משרדים', 'מסחרי'].includes(p.category), p.slug + ' category');
    assert.ok(p.title && p.desc && p.intro.length, p.slug);
    for (const d of p.details) assert.ok(d[0] && d[1], p.slug + ' detail');
    await access(media(p.cover));
    for (const g of p.gallery) { assert.ok(g[1] && g[2], p.slug + ' caption'); await access(media(g[0])); }
  }
  for (const c of D.CLIENTS) await access(media(c.logo));
  for (const name of ['logo', 'logo-hero', 'hero-poster', 'ido', 'hero.mp4']) await access(media(name));
  assert.equal(D.A11Y.length, 12);
  assert.equal(new Set(D.A11Y.map((o) => o[0])).size, 12);
});
