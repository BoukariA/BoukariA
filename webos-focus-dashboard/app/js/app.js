/*
 * Focus Dashboard – hoofdlogica
 * Schermen: Home, Ochtendsessie en Focus. Alle tijden worden berekend vanaf
 * tijdstempels, zodat timers kloppen ook als je tussendoor een andere app opent.
 */
(function () {
  'use strict';

  var C = window.APP_CONFIG;
  var TV = window.TV;
  var Nav = window.Nav;
  var Sound = window.Sound;
  var Store = window.Store;

  /* ---------- Hulpfuncties ---------- */

  var MIN = 60000;
  var DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  var MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  var KEYS = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
    BACK: 461, ESC: 27, BACKSPACE: 8,
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406,
    PLAY: 415, PAUSE: 19, PLAYPAUSE: 10252, INFO: 457
  };

  function now() { return Date.now(); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function dayKey(t) {
    var d = new Date(t == null ? now() : t);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function hhmm(t) {
    var d = new Date(t == null ? now() : t);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function countdown(ms) {
    var s;
    if (ms >= 0) {
      s = Math.ceil(ms / 1000);
      return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
    }
    s = Math.floor(-ms / 1000);
    return '+' + pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }
  function greeting() {
    var h = new Date().getHours();
    if (h < 5) { return 'Goedenacht'; }
    if (h < 12) { return 'Goedemorgen'; }
    if (h < 18) { return 'Goedemiddag'; }
    return 'Goedenavond';
  }
  function dateLabel() {
    var d = new Date();
    var s = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function uid() { return now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function $(sel, root) { return (root || document).querySelector(sel); }

  var ICON = {
    sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v3"/><path d="m5.3 7.8 1.8 1.8"/><path d="m18.7 7.8-1.8 1.8"/><path d="M3 16h2"/><path d="M19 16h2"/><path d="M7.5 16a4.5 4.5 0 0 1 9 0"/><path d="M3 20h18"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="m8.2 12.2 2.6 2.6 5-5.4"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5.5 12.5 4 4 9-9.5"/></svg>',
    skip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6.5v11l8-5.5z" fill="currentColor"/><path d="M17.5 6v12"/></svg>',
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11 12 4l8 7"/><path d="M6.5 9.5V20h11V9.5"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.3-3.5-8.5s1.1-6 3.5-8.5z"/></svg>'
  };

  /* ---------- Toestand ---------- */

  var saved = Store.load() || {};
  var state = {
    view: 'home',
    todos: Array.isArray(saved.todos) ? saved.todos : [],
    routine: saved.routine || null,
    focus: saved.focus || null,
    history: Array.isArray(saved.history) ? saved.history : [],
    lastDay: saved.lastDay || dayKey()
  };

  function persist() {
    Store.save({
      todos: state.todos,
      routine: state.routine,
      focus: state.focus,
      history: state.history.slice(-120),
      lastDay: state.lastDay
    });
  }

  var apps = C.apps.map(function (a, i) {
    return {
      index: i, name: a.name, id: a.id || '', aliases: a.aliases || [], icon: a.icon || '',
      params: a.params || null, resolvedId: a.id || '', status: 'unknown'
    };
  });
  var discovery = 'nog niet gecontroleerd';

  /* Nieuwe dag: afgevinkte taken van eerdere dagen opruimen, tellers resetten. */
  function rollDay() {
    var today = dayKey();
    if (state.lastDay === today) { return false; }
    state.lastDay = today;
    state.todos = state.todos.filter(function (t) { return !t.done || (t.doneAt && dayKey(t.doneAt) === today); });
    if (state.routine && state.routine.date !== today) { state.routine = null; }
    if (state.focus && state.focus.date !== today) { state.focus.date = today; state.focus.sessions = 0; }
    persist();
    return true;
  }

  /* ---------- Ochtendsessie ---------- */

  function routine() {
    var r = state.routine;
    return r && r.date === dayKey() ? r : null;
  }
  function stepElapsed(r) { return r.elapsed + (r.status === 'running' ? now() - r.stepStart : 0); }
  function stepRemaining(r) { return r.steps[r.index].minutes * MIN - stepElapsed(r); }
  function stepFillPct(r) {
    var pct = (stepElapsed(r) / (r.steps[r.index].minutes * MIN)) * 100;
    return Math.min(100, Math.max(0, pct)).toFixed(2);
  }
  function totalMinutes(steps) { return steps.reduce(function (a, s) { return a + s.minutes; }, 0); }
  function routineEta(r) {
    if (!r) { return now() + totalMinutes(C.routine.steps) * MIN; }
    if (r.status === 'done') { return r.finishedAt; }
    var t = now() + Math.max(0, stepRemaining(r));
    for (var i = r.index + 1; i < r.steps.length; i++) {
      if (!r.steps[i].result) { t += r.steps[i].minutes * MIN; }
    }
    return t;
  }
  function nextOpenIndex(r, after) {
    for (var i = after + 1; i < r.steps.length; i++) { if (!r.steps[i].result) { return i; } }
    return -1;
  }
  function startRoutine() {
    var t = now();
    state.routine = {
      date: dayKey(t), status: 'running', index: 0,
      steps: C.routine.steps.map(function (s) { return { name: s.name, minutes: s.minutes, result: null }; }),
      startedAt: t, stepStart: t, elapsed: 0, alerted: false, finishedAt: null
    };
    persist();
  }
  function finishStep(r, result) {
    r.steps[r.index].result = result;
    var next = nextOpenIndex(r, r.index);
    if (next === -1) {
      r.status = 'done';
      r.finishedAt = now();
      var today = dayKey();
      if (state.history.indexOf(today) === -1) { state.history.push(today); }
      Sound.success();
    } else {
      r.index = next;
      r.stepStart = now();
      r.elapsed = 0;
      r.alerted = false;
      r.status = 'running';
      Sound.blip();
    }
    persist();
  }
  function toggleRoutine(r) {
    if (r.status === 'running') { r.elapsed += now() - r.stepStart; r.status = 'paused'; }
    else if (r.status === 'paused') { r.stepStart = now(); r.status = 'running'; }
    persist();
  }
  function streak() {
    var set = {};
    state.history.forEach(function (d) { set[d] = true; });
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    if (!set[dayKey(d.getTime())]) { d.setDate(d.getDate() - 1); }
    var n = 0;
    while (set[dayKey(d.getTime())]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function streakText() {
    var n = streak();
    return n > 1 ? '<strong>' + n + '</strong> dagen op rij' : 'Dag 1 van je reeks';
  }

  /* ---------- Focus-timer ---------- */

  function focusState() {
    var today = dayKey();
    if (!state.focus) {
      state.focus = {
        date: today, mode: 'focus', status: 'idle', duration: C.focus.focusMinutes * MIN,
        start: 0, elapsed: 0, taskId: null, sessions: 0
      };
    }
    if (state.focus.date !== today) { state.focus.date = today; state.focus.sessions = 0; }
    return state.focus;
  }
  function focusElapsed(f) { return f.elapsed + (f.status === 'running' ? now() - f.start : 0); }
  function focusRemaining(f) {
    if (f.status === 'idle') { return C.focus.focusMinutes * MIN; }
    return Math.max(0, f.duration - focusElapsed(f));
  }
  function focusFill(f) { return f.status === 'idle' ? 0 : Math.min(1, focusElapsed(f) / f.duration); }
  function breakMinutes(sessionsDone) {
    return sessionsDone > 0 && sessionsDone % C.focus.longBreakEvery === 0 ? C.focus.longBreakMinutes : C.focus.shortBreakMinutes;
  }
  function currentTask(f) {
    var t = null;
    if (f && f.taskId) { t = state.todos.filter(function (x) { return x.id === f.taskId && !x.done; })[0] || null; }
    if (!t) { t = state.todos.filter(function (x) { return !x.done; })[0] || null; }
    return t;
  }
  function sessionLabel(f) {
    var n = f.sessions + 1;
    return n <= C.focus.dailyGoal ? 'Sessie ' + n + ' van ' + C.focus.dailyGoal : 'Sessie ' + n;
  }
  function startFocus(mode) {
    var f = focusState();
    f.mode = mode;
    f.duration = (mode === 'break' ? breakMinutes(f.sessions) : C.focus.focusMinutes) * MIN;
    f.status = 'running';
    f.start = now();
    f.elapsed = 0;
    if (mode === 'focus') {
      var t = currentTask(f);
      f.taskId = t ? t.id : null;
    }
    persist();
  }
  function toggleFocus() {
    var f = focusState();
    if (f.status === 'running') { f.elapsed += now() - f.start; f.status = 'paused'; }
    else if (f.status === 'paused') { f.start = now(); f.status = 'running'; }
    persist();
  }
  function extendFocus() {
    var f = focusState();
    if (f.status === 'running' || f.status === 'paused') { f.duration += C.focus.extendMinutes * MIN; persist(); }
  }
  function stopFocus() {
    var f = focusState();
    f.status = 'idle';
    f.mode = 'focus';
    f.elapsed = 0;
    f.duration = C.focus.focusMinutes * MIN;
    persist();
  }
  function setTodoDone(t, done) {
    t.done = done;
    t.doneAt = done ? now() : null;
  }

  /* ---------- Controles per tik ---------- */

  function checkRoutineAlert() {
    var r = routine();
    if (!r || r.status !== 'running' || r.alerted || stepRemaining(r) > 0) { return false; }
    r.alerted = true;
    persist();
    Sound.chime();
    if (state.view !== 'morning') { toast('Tijd voor ' + r.steps[r.index].name + ' is om'); }
    return true;
  }
  function checkFocusEnd() {
    var f = state.focus;
    if (!f || f.status !== 'running' || f.duration - focusElapsed(f) > 0) { return false; }
    f.elapsed = f.duration;
    f.status = 'ended';
    if (f.mode === 'focus') { f.sessions += 1; }
    persist();
    Sound.chime();
    toast(f.mode === 'focus' ? 'Sessie klaar. Tijd voor een pauze.' : 'Pauze voorbij. Klaar voor de volgende sessie?');
    return true;
  }

  /* ---------- Weergave: bouwstenen ---------- */

  var els = {
    stage: $('#stage'),
    home: $('#view-home'),
    morning: $('#view-morning'),
    focus: $('#view-focus'),
    toast: $('#toast'),
    diag: $('#diag')
  };

  function btn(action, label, icon, tone, primary, extraClass) {
    return '<button class="btn btn--lg' + (tone ? ' btn--' + tone : '') + (extraClass ? ' ' + extraClass : '') +
      ' focusable" data-action="' + action + '" data-key="' + action + '"' + (primary ? ' data-primary' : '') + '>' +
      (icon || '') + '<span>' + label + '</span></button>';
  }

  function topHeader() {
    return '<header class="top">' +
      '<div class="top__left"><p class="top__date" data-bind="date">' + dateLabel() + '</p>' +
      '<h1 class="top__greet" data-bind="greet">' + greeting() + '</h1></div>' +
      '<p class="top__clock" data-bind="clock">' + hhmm() + '</p></header>';
  }

  function crumbHeader(tone, icon, title, sub) {
    return '<header class="bar-top"><div class="crumb"><span class="ic ic--' + tone + '">' + icon + '</span>' +
      '<span class="crumb__title">' + title + '</span><span aria-hidden="true">·</span><span>' + sub + '</span></div>' +
      '<p class="bar-top__clock" data-bind="clock">' + hhmm() + '</p></header>';
  }

  function segBar(steps, r, size) {
    return '<div class="seg seg--' + size + '" aria-hidden="true">' + steps.map(function (s, i) {
      var cls = 'is-planned';
      var fill = '';
      if (r) {
        cls = s.result === 'done' ? 'is-done' : s.result === 'skipped' ? 'is-skipped' : '';
        if (!s.result && i === r.index && r.status !== 'done') {
          cls = 'is-current';
          fill = '<b data-bind-w="r-fill" style="width:' + stepFillPct(r) + '%"></b>';
        }
      }
      return '<i class="seg__part ' + cls + '" style="flex:' + s.minutes + ' 1 0">' + fill + '</i>';
    }).join('') + '</div>';
  }

  function stepsList(steps, r, variant) {
    return '<ol class="steps steps--' + variant + '">' + steps.map(function (s, i) {
      var cls = '';
      var badge = String(i + 1);
      var right = s.minutes + ' min';
      var bind = '';
      if (r) {
        if (s.result === 'done') { cls = 'is-done'; badge = ICON.check; }
        else if (s.result === 'skipped') { cls = 'is-skipped'; right = 'overgeslagen'; }
        else if (i === r.index && r.status !== 'done') {
          cls = 'is-current';
          right = countdown(stepRemaining(r));
          bind = ' data-bind="r-remaining"';
        }
      }
      return '<li class="step ' + cls + '"><span class="step__badge">' + badge + '</span>' +
        '<span class="step__name">' + esc(s.name) + '</span><span class="step__dur"' + bind + '>' + right + '</span></li>';
    }).join('') + '</ol>';
  }

  function dots(f, large) {
    var goal = C.focus.dailyGoal;
    var n = f.sessions;
    var running = f.mode === 'focus' && (f.status === 'running' || f.status === 'paused');
    var count = Math.max(goal, n + (running ? 1 : 0));
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<span class="dot' + (i < n ? ' is-done' : (running && i === n ? ' is-current' : '')) + '"></span>';
    }
    return '<div class="dots' + (large ? ' dots--lg' : '') + '" role="img" aria-label="' + n + ' van ' + goal + ' sessies voltooid">' + html + '</div>';
  }

  /* ---------- Home ---------- */

  function morningCard() {
    var r = routine();
    var steps = r ? r.steps : C.routine.steps;
    var meta, foot;
    if (!r) {
      meta = steps.length + ' stappen · ' + totalMinutes(steps) + ' min';
      foot = '<button class="btn btn--amber btn--lg focusable" data-action="morning-start" data-key="morning-main">' + ICON.play +
        '<span>Start ' + esc(C.routine.title.toLowerCase()) + '</span></button>' +
        '<p class="card__note">Klaar om <strong data-bind="r-eta">' + hhmm(routineEta(null)) + '</strong></p>';
    } else if (r.status === 'done') {
      meta = 'Voltooid om ' + hhmm(r.finishedAt);
      foot = '<button class="btn focusable" data-action="morning-restart" data-key="morning-main">' + ICON.restart + '<span>Opnieuw</span></button>' +
        '<p class="card__note">' + streakText() + '</p>';
    } else {
      meta = 'Stap ' + (r.index + 1) + ' van ' + steps.length + (r.status === 'paused' ? ' · gepauzeerd' : '');
      foot = '<button class="btn btn--amber btn--lg focusable" data-action="morning-open" data-key="morning-main">' + ICON.play + '<span>Ga verder</span></button>' +
        '<p class="card__note">Klaar om <strong data-bind="r-eta">' + hhmm(routineEta(r)) + '</strong></p>';
    }
    return '<article class="card card--morning">' +
      '<div class="card__head"><h2 class="card__title"><span class="ic ic--amber">' + ICON.sunrise + '</span>' + esc(C.routine.title) + '</h2>' +
      '<p class="card__meta">' + meta + '</p></div>' +
      segBar(steps, r, 'sm') + stepsList(steps, r, 'card') +
      '<div class="card__foot">' + foot + '</div></article>';
  }

  function focusCard() {
    var f = focusState();
    var t = currentTask(f);
    var meta, label, button;
    if (f.status === 'idle') {
      meta = sessionLabel(f);
      label = 'Volgende taak';
      button = '<button class="btn focusable" data-action="focus-start" data-key="focus-main">' + ICON.play + '<span>Start focus</span></button>';
    } else {
      if (f.status === 'ended') { meta = f.mode === 'focus' ? 'Sessie ' + f.sessions + ' klaar' : 'Pauze voorbij'; }
      else if (f.mode === 'break') { meta = 'Pauze' + (f.status === 'paused' ? ' · gepauzeerd' : ''); }
      else { meta = sessionLabel(f) + (f.status === 'paused' ? ' · gepauzeerd' : ''); }
      label = f.mode === 'break' ? 'Daarna' : f.status === 'ended' ? 'Gewerkt aan' : 'Werkt aan';
      button = '<button class="btn btn--sky focusable" data-action="focus-open" data-key="focus-main">' + ICON.target + '<span>Open focus</span></button>';
    }
    return '<article class="card card--focus">' +
      '<div class="card__head"><h2 class="card__title"><span class="ic ic--sky">' + ICON.target + '</span>Focus</h2>' +
      '<p class="card__meta">' + meta + '</p></div>' +
      '<div class="focus-mini"><p class="focus-mini__time" data-bind="f-remaining">' + countdown(focusRemaining(f)) + '</p>' +
      '<div class="bar"><b data-bind-w="f-fill" style="width:' + (focusFill(f) * 100).toFixed(2) + '%"></b></div></div>' +
      '<div class="task-line"><p class="label">' + label + '</p><p class="task-line__text">' +
      (t ? esc(t.text) : '<span class="muted">Kies een taak in je lijst</span>') + '</p></div>' +
      '<div class="card__foot">' + button + dots(f) + '</div></article>';
  }

  function todoCard() {
    var total = state.todos.length;
    var done = state.todos.filter(function (t) { return t.done; }).length;
    var items = state.todos.map(function (t) {
      return '<li><button class="todo focusable' + (t.done ? ' is-done' : '') + '" data-action="todo-toggle" data-id="' + t.id +
        '" data-key="todo-' + t.id + '" aria-pressed="' + (t.done ? 'true' : 'false') + '">' +
        '<span class="todo__box">' + (t.done ? ICON.check : '') + '</span><span class="todo__text">' + esc(t.text) + '</span></button></li>';
    }).join('');
    return '<article class="card card--todo">' +
      '<div class="card__head"><h2 class="card__title"><span class="ic">' + ICON.list + '</span>Vandaag</h2>' +
      '<p class="card__meta">' + (total ? done + ' van ' + total + ' klaar' : '') + '</p></div>' +
      (total ? '<ul class="todos" data-scroll data-group="todos" data-remember>' + items + '</ul>'
        : '<p class="todos__empty">Nog geen taken. Voeg hieronder je eerste taak toe.</p>') +
      '<div class="todo-add-wrap">' +
      '<button class="todo-add focusable" data-action="todo-add" data-key="todo-add">' + ICON.plus + '<span>Taak toevoegen</span></button>' +
      '<input class="todo-input" id="todo-input" type="text" maxlength="80" tabindex="-1" autocomplete="off" enterkeyhint="done" aria-label="Nieuwe taak" placeholder="Typ je taak en druk op OK">' +
      '</div>' +
      (done ? '<button class="link focusable" data-action="todo-clear" data-key="todo-clear">Voltooide wissen</button>' : '') +
      '</article>';
  }

  function tileHtml(a) {
    var sub = a.status === 'noid' ? 'ID instellen' : a.status === 'missing' ? 'Niet gevonden' : '';
    return '<button class="tile focusable' + (sub ? ' tile--missing' : '') + '" data-action="launch" data-app="' + a.index +
      '" data-key="app-' + a.index + '" aria-label="' + esc(a.name) + ' openen"><span class="tile__inner">' +
      (a.icon && ICON[a.icon] ? '<span class="tile__icon">' + ICON[a.icon] + '</span>' : '') +
      '<span class="tile__name">' + esc(a.name) + '</span>' +
      (sub ? '<span class="tile__sub">' + sub + '</span>' : '') + '</span></button>';
  }

  function renderHome() {
    els.home.innerHTML = topHeader() +
      '<div class="home-grid">' + morningCard() + focusCard() + todoCard() + '</div>' +
      '<section class="dock" aria-label="Apps"><h2 class="label">Apps</h2>' +
      '<div class="dock__row">' + apps.map(tileHtml).join('') + '</div></section>';
    var list = $('.todos', els.home);
    if (list && list.scrollHeight > list.clientHeight + 2) { list.classList.add('has-more'); }
  }

  /* ---------- Ochtendsessie-scherm ---------- */

  function renderMorning() {
    var r = routine();
    if (!r) { els.morning.innerHTML = ''; return; }
    if (r.status === 'done') { els.morning.innerHTML = morningDoneHtml(r); return; }
    var st = r.steps[r.index];
    var rem = stepRemaining(r);
    var over = rem <= 0;
    var paused = r.status === 'paused';
    var nextIdx = nextOpenIndex(r, r.index);
    var next = nextIdx >= 0 ? r.steps[nextIdx] : null;
    var doneCount = r.steps.filter(function (s) { return s.result === 'done'; }).length;
    var kicker = over ? 'Tijd is om' : paused ? 'Gepauzeerd' : 'Nu';
    var sub = over ? 'Vink af als je klaar bent'
      : 'van ' + st.minutes + ' min' + (next ? ' · daarna <strong>' + esc(next.name) + '</strong>' : ' · laatste stap');

    els.morning.innerHTML = crumbHeader('amber', ICON.sunrise, esc(C.routine.title), 'Stap ' + (r.index + 1) + ' van ' + r.steps.length) +
      '<div class="session"><div class="session__main">' +
      '<p class="kicker kicker--amber">' + kicker + '</p>' +
      '<h1 class="session__step">' + esc(st.name) + '</h1>' +
      '<p class="session__time' + (over ? ' is-over' : '') + (paused ? ' is-paused' : '') + '" data-bind="r-remaining">' + countdown(rem) + '</p>' +
      '<p class="session__sub">' + sub + '</p>' +
      '<div class="actions">' +
      btn('r-done', 'Afvinken', ICON.check, 'amber', true) +
      btn('r-toggle', paused ? 'Hervat' : 'Pauze', paused ? ICON.play : ICON.pause) +
      btn('r-skip', 'Overslaan', ICON.skip) +
      '</div></div>' +
      '<aside class="card session__aside"><div class="card__head"><h2 class="card__title card__title--sm">Stappen</h2>' +
      '<p class="card__meta">' + doneCount + ' van ' + r.steps.length + ' afgevinkt</p></div>' +
      stepsList(r.steps, r, 'panel') +
      '<dl class="times"><div><dt>Gestart</dt><dd>' + hhmm(r.startedAt) + '</dd></div>' +
      '<div><dt>Klaar om</dt><dd data-bind="r-eta">' + hhmm(routineEta(r)) + '</dd></div></dl></aside></div>' +
      '<footer class="timeline">' + segBar(r.steps, r, 'lg') +
      '<div class="timeline__labels">' + r.steps.map(function (s, i) {
        return '<div class="tl' + (s.result ? ' is-done' : '') + (i === r.index ? ' is-current' : '') + '" style="flex:' + s.minutes + ' 1 0">' +
          '<span class="tl__name">' + esc(s.name) + '</span><span class="tl__dur">' + s.minutes + ' min</span></div>';
      }).join('') + '</div></footer>';
  }

  function morningDoneHtml(r) {
    var done = r.steps.filter(function (s) { return s.result === 'done'; }).length;
    var skipped = r.steps.filter(function (s) { return s.result === 'skipped'; }).length;
    var mins = Math.max(1, Math.round((r.finishedAt - r.startedAt) / MIN));
    return crumbHeader('amber', ICON.sunrise, esc(C.routine.title), 'Voltooid om ' + hhmm(r.finishedAt)) +
      '<div class="done"><span class="done__badge">' + ICON.check + '</span>' +
      '<h1 class="done__title">' + esc(C.routine.title) + ' voltooid</h1>' +
      '<p class="done__sub">' + done + ' van ' + r.steps.length + ' stappen afgevinkt' +
      (skipped ? ' · ' + skipped + ' overgeslagen' : '') + ' · ' + mins + ' min</p>' +
      '<p class="done__streak">' + streakText() + '</p>' +
      '<div class="actions">' + btn('go-focus', 'Naar focus', ICON.target, 'sky', true) + btn('go-home', 'Naar Home', ICON.home) + '</div></div>';
  }

  /* ---------- Focus-scherm ---------- */

  function renderFocus() {
    var f = focusState();
    var t = currentTask(f);
    var isBreak = f.mode === 'break';
    var taskTitle = t ? esc(t.text) : 'Geen taak gekozen';
    var crumbSub, kicker, title, meta, actions;
    var titleEmpty = !t;

    if (f.status === 'idle') {
      crumbSub = sessionLabel(f);
      kicker = 'Klaar om te beginnen';
      title = taskTitle;
      meta = C.focus.focusMinutes + ' min focus · daarna ' + breakMinutes(f.sessions + 1) + ' min pauze';
      actions = btn('focus-start', 'Start focus', ICON.play, 'sky', true) + btn('go-home', 'Naar Home', ICON.home);
    } else if (f.status === 'ended') {
      if (isBreak) {
        crumbSub = 'Pauze voorbij';
        kicker = 'Klaar voor de volgende sessie?';
        title = taskTitle;
        meta = sessionLabel(f);
        actions = btn('focus-start', 'Start focus', ICON.play, 'sky', true) + btn('go-home', 'Naar Home', ICON.home);
      } else {
        crumbSub = 'Sessie ' + f.sessions + ' klaar';
        kicker = 'Goed gedaan';
        title = t ? taskTitle : 'Sessie voltooid';
        titleEmpty = false;
        meta = 'Neem ' + breakMinutes(f.sessions) + ' min pauze';
        actions = btn('focus-break', 'Start pauze', ICON.play, 'sky', true) +
          (t ? btn('focus-task-done', 'Taak afgerond', ICON.check) : '') +
          btn('focus-start', 'Nog een sessie', ICON.restart);
      }
    } else {
      var paused = f.status === 'paused';
      crumbSub = isBreak ? 'Pauze' : sessionLabel(f);
      kicker = isBreak ? (paused ? 'Pauze gepauzeerd' : 'Even pauze') : (paused ? 'Gepauzeerd' : 'Werkt aan');
      title = isBreak ? 'Tijd voor een korte pauze' : taskTitle;
      titleEmpty = isBreak ? false : !t;
      meta = 'Klaar om <strong data-bind="f-eta">' + hhmm(now() + focusRemaining(f)) + '</strong>' +
        (isBreak ? '' : ' · daarna ' + breakMinutes(f.sessions + 1) + ' min pauze');
      actions = btn('focus-toggle', paused ? 'Hervat' : 'Pauze', paused ? ICON.play : ICON.pause, 'sky', true) +
        btn('focus-extend', '+' + C.focus.extendMinutes + ' min', '') +
        (!isBreak && t ? btn('focus-task-done', 'Taak afgerond', ICON.check) : '') +
        btn('focus-stop', 'Stoppen', ICON.stop);
    }

    var items = state.todos.map(function (x) {
      var cur = t && x.id === t.id && !isBreak;
      return '<li><button class="todo focusable' + (x.done ? ' is-done' : '') + (cur ? ' is-current' : '') +
        '" data-action="focus-pick" data-id="' + x.id + '" data-key="pick-' + x.id + '"' + (cur ? ' aria-current="true"' : '') + '>' +
        '<span class="todo__box">' + (x.done ? ICON.check : '') + '</span><span class="todo__text">' + esc(x.text) + '</span>' +
        (cur ? '<span class="chip">Nu</span>' : '') + '</button></li>';
    }).join('');
    var doneCount = state.todos.filter(function (x) { return x.done; }).length;

    els.focus.innerHTML = crumbHeader('sky', ICON.target, 'Focus', crumbSub) +
      '<div class="session"><div class="session__main">' +
      '<p class="kicker kicker--sky">' + kicker + '</p>' +
      '<h1 class="focus-title' + (titleEmpty ? ' is-empty' : '') + '">' + title + '</h1>' +
      '<p class="focus-time' + (f.status === 'paused' ? ' is-paused' : '') + '" data-bind="f-remaining">' + countdown(focusRemaining(f)) + '</p>' +
      '<div class="bar bar--lg"><b data-bind-w="f-fill" style="width:' + (focusFill(f) * 100).toFixed(2) + '%"></b></div>' +
      '<div class="meta-row"><p>' + meta + '</p>' + dots(f, true) + '</div>' +
      '<div class="actions">' + actions + '</div></div>' +
      '<aside class="card focus-aside"><div class="card__head"><h2 class="card__title card__title--sm">Vandaag</h2>' +
      '<p class="card__meta">' + (state.todos.length ? doneCount + ' van ' + state.todos.length + ' klaar' : '') + '</p></div>' +
      (state.todos.length ? '<ul class="todos" data-scroll data-group="picks" data-remember>' + items + '</ul>'
        : '<p class="todos__empty">Nog geen taken. Voeg ze toe op het Home-scherm.</p>') +
      '<p class="aside-hint">Kies een taak voor je volgende sessie</p></aside></div>';
    var list = $('.todos', els.focus);
    if (list && list.scrollHeight > list.clientHeight + 2) { list.classList.add('has-more'); }
  }

  /* ---------- Weergave: algemeen ---------- */

  function render(view) {
    if (view === 'home') { renderHome(); }
    else if (view === 'morning') { renderMorning(); }
    else { renderFocus(); }
    updateBindings();
  }

  function defaultFocus(view) {
    var root = els[view];
    if (view === 'home') {
      var r = routine();
      var f = state.focus;
      if (f && f.status !== 'idle') { return $('[data-key="focus-main"]', root); }
      if ((!r && new Date().getHours() < 12) || (r && r.status !== 'done')) { return $('[data-key="morning-main"]', root); }
      return $('[data-key="focus-main"]', root);
    }
    return $('[data-primary]', root) || $('.focusable', root);
  }

  function show(view, focusKey) {
    state.view = view;
    ['home', 'morning', 'focus'].forEach(function (v) { els[v].hidden = v !== view; });
    els.stage.setAttribute('data-view', view);
    render(view);
    Nav.setRoot(els[view]);
    var el = focusKey ? $('.focusable[data-key="' + focusKey + '"]', els[view]) : null;
    Nav.focus(el || defaultFocus(view));
  }

  /* Opnieuw tekenen en de focus op hetzelfde element houden. */
  function rerender(focusKey) {
    var a = document.activeElement;
    var key = focusKey || (a && a.getAttribute ? a.getAttribute('data-key') : null);
    render(state.view);
    var el = key ? $('.focusable[data-key="' + window.CSS.escape(key) + '"]', els[state.view]) : null;
    Nav.focus(el || defaultFocus(state.view));
  }

  function bindingValues() {
    var v = { clock: hhmm(), date: dateLabel(), greet: greeting() };
    var r = routine();
    if (r && r.status !== 'done') {
      v['r-remaining'] = countdown(stepRemaining(r));
      v['r-fill'] = stepFillPct(r) + '%';
      v['r-eta'] = hhmm(routineEta(r));
    } else if (!r) {
      v['r-eta'] = hhmm(routineEta(null));
    }
    var f = state.focus;
    if (f) {
      v['f-remaining'] = countdown(focusRemaining(f));
      v['f-fill'] = (focusFill(f) * 100).toFixed(2) + '%';
      v['f-eta'] = hhmm(now() + focusRemaining(f));
    }
    return v;
  }

  function updateBindings() {
    var root = els[state.view];
    var v = bindingValues();
    Array.prototype.forEach.call(root.querySelectorAll('[data-bind]'), function (el) {
      var val = v[el.getAttribute('data-bind')];
      if (val != null && el.textContent !== val) { el.textContent = val; }
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-bind-w]'), function (el) {
      var val = v[el.getAttribute('data-bind-w')];
      if (val != null && el.style.width !== val) { el.style.width = val; }
    });
  }

  var toastTimer = 0;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 3600);
  }

  /* ---------- Taak toevoegen (schermtoetsenbord van de TV) ---------- */

  function addWrap() { return $('.todo-add-wrap', els.home); }
  function beginAdd() {
    var wrap = addWrap();
    var input = $('#todo-input', els.home);
    if (!wrap || !input) { return; }
    wrap.classList.add('is-editing');
    input.focus();
  }
  function endAdd(clear) {
    var wrap = addWrap();
    var input = $('#todo-input', els.home);
    if (wrap) { wrap.classList.remove('is-editing'); }
    if (input && clear) { input.value = ''; }
    Nav.focus($('[data-key="todo-add"]', els.home));
  }
  function commitAdd(input) {
    var text = input.value.replace(/\s+/g, ' ').trim();
    if (!text) { endAdd(true); return; }
    state.todos.push({ id: uid(), text: text.slice(0, 80), done: false, doneAt: null, createdAt: now() });
    persist();
    Sound.blip();
    rerender('todo-add');
    toast('Taak toegevoegd');
  }
  els.home.addEventListener('focusout', function (e) {
    if (e.target && e.target.id === 'todo-input') {
      setTimeout(function () {
        var wrap = addWrap();
        if (wrap && document.activeElement !== $('#todo-input', els.home)) { wrap.classList.remove('is-editing'); }
      }, 0);
    }
  });

  /* ---------- Apps starten ---------- */

  function launchApp(a) {
    if (!a) { return; }
    var id = a.resolvedId || a.id;
    if (!id) { toast('Nog geen app-ID voor ' + a.name + '. Zie js/config.js.'); return; }
    if (!TV.isWebOS) { toast('Op de TV opent dit ' + a.name + ' (' + id + ')'); return; }
    TV.launch(id, a.params).catch(function () {
      toast('Kon ' + a.name + ' niet openen. Controleer de app-ID (' + id + ').');
    });
  }

  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9+]/g, '');
  }
  function nameMatches(title, a) {
    var t = norm(title);
    return !!t && [a.name].concat(a.aliases).some(function (n) { return norm(n) === t; });
  }

  /* Zoek per tegel de juiste app-ID op deze TV. */
  function resolveApps() {
    if (!TV.isWebOS) { discovery = 'browser-voorbeeld (geen TV)'; return Promise.resolve(); }
    return TV.listLaunchPoints()
      .then(function (points) { discovery = 'app-lijst gelezen (' + points.length + ' apps)'; return points; })
      .catch(function () { discovery = 'app-lijst niet beschikbaar, alleen ID-controle'; return null; })
      .then(function (points) {
        return apps.reduce(function (p, a) {
          return p.then(function () {
            var check = a.id ? TV.appExists(a.id).catch(function () { return null; }) : Promise.resolve(null);
            return check.then(function (exists) {
              if (exists === true) { a.resolvedId = a.id; a.status = 'found'; return; }
              var m = points ? points.filter(function (pt) { return nameMatches(pt.title, a); })[0] : null;
              if (m) { a.resolvedId = m.id; a.status = 'found'; return; }
              a.resolvedId = a.id;
              a.status = !a.id ? 'noid' : exists === false ? 'missing' : 'unknown';
            });
          });
        }, Promise.resolve());
      })
      .then(function () {
        if (state.view !== 'home') { return; }
        var row = $('.dock__row', els.home);
        if (!row) { return; }
        var a = document.activeElement;
        var key = a && row.contains(a) ? a.getAttribute('data-key') : null;
        row.innerHTML = apps.map(tileHtml).join('');
        if (key) { Nav.focus($('[data-key="' + key + '"]', row)); }
      });
  }

  /* ---------- Diagnose (blauwe knop of Info) ---------- */

  function toggleDiag(force) {
    var open = force == null ? els.diag.hidden : force;
    if (open) {
      els.diag.innerHTML = '<div class="diag__panel"><h2>Diagnose</h2>' +
        '<p class="diag__hint">' + (TV.isWebOS ? 'webOS gevonden' : 'Geen webOS gevonden') + ' · ' + esc(discovery) + '</p>' +
        '<table><thead><tr><th>App</th><th>Ingestelde ID</th><th>Gebruikte ID</th><th>Status</th></tr></thead><tbody>' +
        apps.map(function (a) {
          var st = { found: ['ok', 'gevonden'], missing: ['warn', 'niet gevonden'], noid: ['warn', 'ID ontbreekt'], unknown: ['', 'onbekend'] }[a.status];
          return '<tr><td>' + esc(a.name) + '</td><td><code>' + esc(a.id || '–') + '</code></td><td><code>' + esc(a.resolvedId || '–') +
            '</code></td><td class="' + st[0] + '">' + st[1] + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<p class="diag__hint">ID onbekend? Open de app op je TV en voer op je computer <code>ares-launch -r -d tv</code> uit. Zet de ID daarna in <code>js/config.js</code>.</p>' +
        '<p class="diag__hint">Sluiten met Terug of de blauwe knop.</p></div>';
    }
    els.diag.hidden = !open;
  }

  /* ---------- Acties ---------- */

  function todoById(id) { return state.todos.filter(function (x) { return x.id === id; })[0] || null; }

  var actions = {
    'morning-start': function () { startRoutine(); Sound.blip(); show('morning'); },
    'morning-restart': function () { startRoutine(); show('morning'); },
    'morning-open': function () { show('morning'); },
    'r-done': function () { var r = routine(); if (r) { finishStep(r, 'done'); rerender(); } },
    'r-skip': function () { var r = routine(); if (r) { finishStep(r, 'skipped'); rerender(); } },
    'r-toggle': function () { var r = routine(); if (r) { toggleRoutine(r); rerender(); } },
    'go-home': function () { show('home'); },
    'go-focus': function () { show('focus'); },
    'focus-open': function () { show('focus'); },
    'focus-start': function () { startFocus('focus'); Sound.blip(); if (state.view === 'focus') { rerender('focus-toggle'); } else { show('focus'); } },
    'focus-break': function () { startFocus('break'); rerender('focus-toggle'); },
    'focus-toggle': function () { toggleFocus(); rerender(); },
    'focus-extend': function () { extendFocus(); rerender(); toast('+' + C.focus.extendMinutes + ' minuten'); },
    'focus-stop': function () { stopFocus(); rerender('focus-start'); },
    'focus-task-done': function () {
      var f = focusState();
      var t = currentTask(f);
      if (!t) { return; }
      setTodoDone(t, true);
      var nt = currentTask(null);
      f.taskId = nt ? nt.id : null;
      persist();
      Sound.blip();
      toast('Afgevinkt: ' + t.text);
      rerender();
    },
    'focus-pick': function (el) {
      var t = todoById(el.getAttribute('data-id'));
      if (!t) { return; }
      if (t.done) { toast('Deze taak is al afgevinkt'); return; }
      focusState().taskId = t.id;
      persist();
      rerender();
    },
    'todo-toggle': function (el) {
      var t = todoById(el.getAttribute('data-id'));
      if (!t) { return; }
      setTodoDone(t, !t.done);
      if (t.done) { Sound.blip(); }
      persist();
      rerender();
    },
    'todo-add': function () { beginAdd(); },
    'todo-clear': function () {
      var n = state.todos.filter(function (t) { return t.done; }).length;
      state.todos = state.todos.filter(function (t) { return !t.done; });
      persist();
      rerender('todo-add');
      toast(n + (n === 1 ? ' taak' : ' taken') + ' gewist');
    },
    'launch': function (el) { launchApp(apps[Number(el.getAttribute('data-app'))]); }
  };

  els.stage.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el || !els.stage.contains(el)) { return; }
    var fn = actions[el.getAttribute('data-action')];
    if (fn) { Sound.unlock(); fn(el); }
  });

  /* ---------- Toetsen van de afstandsbediening ---------- */

  function goBack() {
    var from = state.view;
    if (from === 'home') { TV.back(); return; }
    show('home', from === 'morning' ? 'morning-main' : 'focus-main');
  }

  function deleteFocusedTodo() {
    var el = Nav.current();
    if (!el || el.getAttribute('data-action') !== 'todo-toggle') { return; }
    var id = el.getAttribute('data-id');
    var idx = -1;
    state.todos.forEach(function (t, i) { if (t.id === id) { idx = i; } });
    if (idx === -1) { return; }
    state.todos.splice(idx, 1);
    persist();
    var next = state.todos[idx] || state.todos[idx - 1];
    rerender(next ? 'todo-' + next.id : 'todo-add');
    toast('Taak verwijderd');
  }

  function playPause() {
    var r = routine();
    if (state.view === 'morning' && r && r.status !== 'done') { actions['r-toggle'](); return; }
    var f = focusState();
    if (f.status === 'running' || f.status === 'paused') {
      toggleFocus();
      if (state.view === 'home' || state.view === 'focus') { rerender(); }
    } else if (state.view === 'focus' && f.status === 'idle') {
      actions['focus-start']();
    }
  }

  function handleInputKey(e) {
    var k = e.keyCode;
    if (k === KEYS.ENTER) { e.preventDefault(); commitAdd(e.target); }
    else if (k === KEYS.BACK || k === KEYS.ESC) { e.preventDefault(); endAdd(false); }
    else if (k === KEYS.UP || k === KEYS.DOWN) { e.preventDefault(); endAdd(false); Nav.move(k === KEYS.UP ? 'up' : 'down'); }
  }

  document.addEventListener('keydown', function (e) {
    Sound.unlock();
    var k = e.keyCode;
    if (e.target && e.target.id === 'todo-input') { handleInputKey(e); return; }
    if (!els.diag.hidden) {
      if (k === KEYS.BACK || k === KEYS.ESC || k === KEYS.BLUE || k === KEYS.INFO || k === KEYS.ENTER) { toggleDiag(false); e.preventDefault(); }
      return;
    }
    switch (k) {
      case KEYS.LEFT: Nav.move('left'); break;
      case KEYS.RIGHT: Nav.move('right'); break;
      case KEYS.UP: Nav.move('up'); break;
      case KEYS.DOWN: Nav.move('down'); break;
      case KEYS.ENTER: {
        var el = Nav.current();
        if (el) { el.click(); } else { Nav.focus(defaultFocus(state.view)); }
        break;
      }
      case KEYS.BACK: case KEYS.ESC: case KEYS.BACKSPACE: goBack(); break;
      case KEYS.RED: deleteFocusedTodo(); break;
      case KEYS.PLAY: case KEYS.PAUSE: case KEYS.PLAYPAUSE: playPause(); break;
      case KEYS.BLUE: case KEYS.INFO: toggleDiag(); break;
      default: return;
    }
    e.preventDefault();
  });

  /* ---------- Klok en timers ---------- */

  function tick() {
    if (rollDay()) { rerender(); return; }
    var changed = checkRoutineAlert();
    if (checkFocusEnd()) { changed = true; }
    if (changed) { rerender(); return; }
    updateBindings();
  }

  /* Terug in de app (na Netflix e.d.): direct bijwerken. */
  function refresh() { tick(); rerender(); }
  document.addEventListener('webOSRelaunch', refresh);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { refresh(); } });

  /* Het ontwerp is 1920×1080; schaal mee als het scherm (of de browser) anders is. */
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    if (Math.abs(s - 1) < 0.001) { els.stage.style.transform = ''; return; }
    var x = (window.innerWidth - 1920 * s) / 2;
    var y = (window.innerHeight - 1080 * s) / 2;
    els.stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
  }
  window.addEventListener('resize', fit);

  /* ---------- Start ---------- */

  fit();
  rollDay();
  var running = routine();
  show(running && running.status !== 'done' ? 'morning' : 'home');
  setInterval(tick, 500);
  resolveApps();
  TV.guardScreenSaver(function () {
    var r = routine();
    var f = state.focus;
    return !document.hidden && ((r && r.status === 'running') || (f && f.status === 'running'));
  });

  /* Alleen voor tests/debuggen in de browser. */
  window.__focusDashboard = { state: state, apps: apps, show: show, rerender: rerender };
})();
