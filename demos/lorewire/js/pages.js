/* LoreWire demo: the grid pages. Browse (category chips over a poster grid), Today's Verdicts, Saved
   (your list) and Search (filters as you type). */

import { STORIES, CATEGORIES, CATALOG_SIZE } from './data.js';
import { search, inCategory } from './logic.js';
import { h, toast } from './dom.js';
import { grid } from './cards.js';

export function createBrowse(app) {
  var el = h('section.view.page', { 'aria-label': 'Browse' });
  var cat = 'ALL';
  function render() {
    var list = cat === 'ALL' ? STORIES : inCategory(STORIES, cat);
    el.replaceChildren(
      h('div.page__head', h('h1.page__title', { text: 'BROWSE' }), h('small.mono.muted', { text: STORIES.length + ' STORIES IN THIS DEMO · ' + CATALOG_SIZE.toLocaleString('en-US') + ' ON LOREWIRE' })),
      h('div.chips', ['ALL'].concat(CATEGORIES.map(function (c) { return c.name; })).map(function (c) {
        var on = c === cat;
        return h('button.chip.chip--pick' + (on ? '.is-on' : ''), { type: 'button', 'aria-pressed': String(on), 'data-cat': c, onclick: function () { cat = c; render(); } }, c.toUpperCase());
      })),
      list.length ? grid(app, list) : h('p.empty', { text: 'No story in this demo is filed under ' + cat + '. LoreWire itself has plenty.' }));
  }
  return { el: el, show: render, render: render };
}

export function createVerdicts(app) {
  var el = h('section.view.page', { 'aria-label': 'Today\'s Verdicts' });
  function render() {
    el.replaceChildren(
      h('div.page__head', h('h1.page__title', { text: 'TODAY\'S VERDICTS' }), h('small.mono.muted', { text: 'FRESH THREADS THIS WEEK' })),
      grid(app, STORIES.slice(0, 10)));
  }
  return { el: el, show: render, render: render };
}

export function createSaved(app) {
  var el = h('section.view.page', { 'aria-label': 'Saved' });
  function render() {
    var list = STORIES.filter(function (s) { return app.saved.indexOf(s.id) !== -1; });
    el.replaceChildren(
      h('div.page__head.page__head--row',
        h('div', h('h1.page__title', { text: 'SAVED' }), h('small.mono.muted', { text: list.length + ' SAVED' })),
        h('button.btn.btn--outline.btn--sm', { type: 'button', onclick: function () { toast('Signing in keeps your list across devices. It isn\'t part of this demo.'); } }, 'Sign in')),
      list.length ? grid(app, list) : h('div.empty-saved', h('b', { text: 'Nothing here yet.' }), h('p', { text: 'Press + on any story to keep it here.' })));
  }
  return { el: el, show: render, render: render };
}

export function createSearch(app) {
  var el = h('section.view.page', { 'aria-label': 'Search' });
  var results = h('div');
  function paint() {
    var list = search(STORIES, app.query);
    results.replaceChildren(list.length ? grid(app, list) : h('p.empty', { text: 'No story matches "' + app.query + '".' }));
  }
  return {
    el: el,
    show: function () {
      el.replaceChildren(h('div.page__head', h('small.mono.muted', { text: 'BROWSE ALL · ' + STORIES.length + ' STORIES IN THIS DEMO' }), h('h1.page__title', { text: 'SEARCH' })), results);
      paint();
    },
    render: paint
  };
}
