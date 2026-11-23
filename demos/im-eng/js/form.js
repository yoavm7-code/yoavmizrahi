/* I.M demo: the contact form. Name and phone are required, email is checked when filled. Sending is
   mocked: 800 ms, then the thank-you card. Nothing is emailed; the demo note shows what the real
   site would send to Ido. ?form=fail shows the error banner instead, for the tests. */

import { checkLead, leadEmail } from './logic.js';
import { h, icon, toast, log } from './dom.js';

var FIELDS = [
  ['name', 'שם מלא', true, 'הכנס שם מלא', 'text', 'name'],
  ['phone', 'טלפון', true, '050-0000000', 'tel', 'tel'],
  ['email', 'אימייל', false, 'your@email.com', 'email', 'email'],
  ['message', 'הודעה', false, 'ספרו לנו על הפרויקט שלכם…', 'textarea', null]
];

export function createForm(app) {
  var box = h('div.form-box.reveal');
  var fail = new URLSearchParams(location.search).get('form') === 'fail';

  function draw() {
    var st = app.lead;
    if (st.sent) {
      box.replaceChildren(h('div.thanks', { role: 'status' },
        h('span.thanks__mark', icon('check', 30)),
        h('h3', { text: 'תודה! הפנייה התקבלה' }),
        h('p', { text: 'עידו יחזור אליכם בהקדם' }),
        h('button.link', { type: 'button', 'data-again': '', onclick: function () {
          app.lead = { values: {}, errors: {}, sending: false, sent: false, failed: false };
          draw();
          box.querySelector('input').focus();
        } }, 'שליחת פנייה נוספת')));
      return;
    }
    var form = h('form.form', { novalidate: true, onsubmit: submit },
      h('div.form__row', field(FIELDS[0]), field(FIELDS[1])),
      field(FIELDS[2]), field(FIELDS[3]),
      st.failed ? h('p.form__error', { role: 'alert' }, 'משהו השתבש. נסו שוב או התקשרו ', h('span', { dir: 'ltr', text: '054-2806344' })) : null,
      h('button.send', { type: 'submit', 'data-send': '', disabled: st.sending ? true : null, 'aria-busy': st.sending ? 'true' : null },
        st.sending ? [h('span.spinner', { 'aria-hidden': 'true' }), 'שולח…'] : 'שליחה'));
    box.replaceChildren(form);
  }

  function field(f) {
    var st = app.lead;
    var id = 'lead-' + f[0];
    var err = st.errors[f[0]];
    var attrs = { id: id, name: f[0], placeholder: f[3], value: st.values[f[0]] || '', 'aria-invalid': err ? 'true' : null, 'aria-describedby': err ? id + '-err' : null, autocomplete: f[5],
      oninput: function (e) {
        st.values[f[0]] = e.target.value;
        if (st.errors[f[0]]) { delete st.errors[f[0]]; e.target.removeAttribute('aria-invalid'); var m = box.querySelector('#' + id + '-err'); if (m) m.remove(); e.target.parentNode.classList.remove('is-bad'); }
      } };
    var input = f[4] === 'textarea' ? h('textarea.input', Object.assign(attrs, { rows: '4' })) : h('input.input', Object.assign(attrs, { type: f[4], dir: f[4] === 'text' ? null : 'ltr' }));
    if (f[4] === 'textarea') input.value = st.values[f[0]] || '';
    return h('label.field' + (err ? '.is-bad' : ''), { for: id },
      h('span.field__label', f[1], f[2] ? h('span.gold', { text: ' *' }) : null),
      input,
      err ? h('small.field__err', { id: id + '-err', text: err }) : null);
  }

  function submit(e) {
    e.preventDefault();
    var st = app.lead;
    st.errors = checkLead(st.values);
    st.failed = false;
    var bad = Object.keys(st.errors);
    if (bad.length) {
      draw();
      box.querySelector('#lead-' + bad[0]).focus();
      log('form', 'invalid', { fields: bad });
      return;
    }
    st.sending = true;
    draw();
    setTimeout(function () {
      st.sending = false;
      if (fail) { st.failed = true; draw(); return; }
      st.sent = true;
      var mail = leadEmail(st.values);
      log('form', 'sent (demo)', mail);
      draw();
      toast('Demo only: nothing was sent. The real site emails this lead to ' + mail.to + '.');
    }, 800);
  }

  draw();
  return box;
}
