// Interfaz: elegir usuario → panel de una asignatura (global + temas + historial) → sesión de estudio tipo Anki → ranking con nota esperada → modo test de examen.
// Todas las vistas se pintan con mount(), que añade la barra superior común. state.view indica la vista activa
// (lo usan los atajos de teclado y el repintado al cambiar de idioma).

const $app = document.getElementById('app');
const Q = Object.fromEntries(SUBJECTS.flatMap((s) => s.questions.map((q) => [q.id, q])));
const SUBJECT_OF = Object.fromEntries(SUBJECTS.flatMap((s) => s.questions.map((q) => [q.id, s])));
const LETTERS = 'ABCDEF';
const RATINGS = ['again', 'hard', 'good', 'easy'];
const ratingLabel = (r) => t(`rating_${r}`);

const state = {
  view: null, // 'loading' | 'users' | 'dashboard' | 'study' | 'done' | 'forceDone' | 'test' | 'results' | 'ranking' | 'stats'
  users: [],
  user: null, // { id, name, cards, log }
  subject: SUBJECTS.find((s) => s.id === localStorage.getItem('lewis-quiz-subject')) || SUBJECTS[0],
  scope: 'all', // 'all', 'final-mock' o el id de un tema
  practice: false, // modo práctica: no cambia la programación
  current: null, // { id, order: [índices de opciones], sel: [marcadas antes de comprobar], picked, correct }
  lastId: null,
  timer: null,
  rankingScope: 'all', // 'all' o id de una asignatura
  rankingSort: 'score', // 'score', 'accuracy', 'coverage', 'mature', 'reviews'
  rankingData: null,
  expandedUserId: null,
  cachedRanking: null,
  testMode: null, // estado de la sesión de test/examen
  forceStudy: null, // estado de la sesión forzada de estudio
};
window.state = state;

const rich = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
// Enunciados: las líneas con columnas alineadas (dos o más espacios entre valores: tablas, matrices) van en monoespaciado.
const questionHtml = (s) => esc(s).replace(/(?:^.*\S {2,}\S.*(?:\n|$))+/gm, (m) => `<pre>${m.replace(/\n$/, '')}</pre>`);
const fmt1 = (n) =>
  n === null || n === undefined ? '–' : Number(n).toLocaleString(currentLang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 1 });

async function call(method, url, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || t('connection_error'));
  return data;
}

function stopTimer() {
  clearInterval(state.timer);
  state.timer = null;
}

const scopeIds = (scope) => {
  if (scope === 'all') return state.subject.questions.map((q) => q.id);
  if (scope === 'final-mock') return state.subject.questions.filter((q) => q.exam === 'final-mock').map((q) => q.id);
  return state.subject.questions.filter((q) => q.topic === scope).map((q) => q.id);
};

// Nombre traducido de un tema (claves `sp_t1`, `dm_t3`…); si falta, el de los datos.
function topicLabel(subject, id) {
  if (id === 'final-mock') return t('final_mock_name');
  const key = `${subject.id}_t${id}`;
  if (I18N[currentLang][key] || I18N.es[key]) return t(key);
  const tp = subject.topics.find((x) => x.id === id);
  return tp ? tp.name : String(id);
}
const topicName = (id) => topicLabel(state.subject, id);

const scopeName = (scope) => {
  if (scope === 'all') return `${state.subject.name} · ${t('all_topics')}`;
  if (scope === 'final-mock') return `${state.subject.name} · ${t('final_mock_name')}`;
  return topicName(scope);
};
const scopeShort = (scope) => (scope === 'all' ? t('all_topics') : topicName(scope));

// Preguntas de respuesta múltiple: `answer` es un array y hay que marcar exactamente esas opciones.
const isMulti = (q) => Array.isArray(q.answer);
const isRight = (q, oi) => (isMulti(q) ? q.answer.includes(oi) : q.answer === oi);

function accuracy(entries) {
  if (!entries.length) return null;
  return Math.round((100 * entries.filter((e) => e.correct).length) / entries.length);
}

function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return t('ago_now');
  if (s < 3600) return t('ago', { v: `${Math.round(s / 60)} min` });
  if (s < 86400) return t('ago', { v: `${Math.round(s / 3600)} h` });
  return t('ago', { v: `${Math.round(s / 86400)} d` });
}

// ---------------- Estructura común ----------------

function topbar(active) {
  const u = state.user;
  const links = u
    ? [
        ['dashboard', 'layout', t('nav_dashboard')],
        ['stats', 'chart', t('nav_stats')],
        ['ranking', 'trophy', t('nav_ranking')],
      ]
    : [
        ['users', 'users', t('nav_sign_in')],
        ['ranking', 'trophy', t('nav_ranking')],
      ];
  return `
  <header class="topbar">
    <div class="container topbar-inner">
      <button class="brand" data-nav="${u ? 'dashboard' : 'users'}" aria-label="Lewis Quiz">
        <span class="logo">L</span><span class="brand-name">Lewis Quiz</span>
      </button>
      <nav class="nav">
        ${links
          .map(
            ([id, ic, label]) =>
              `<button class="nav-link ${active === id ? 'active' : ''}" data-nav="${id}" title="${label}">${icon(ic)}<span>${label}</span></button>`
          )
          .join('')}
      </nav>
      <div class="topbar-right">
        ${renderTopControls()}
        ${
          u
            ? `<div class="user-chip">${avatar(u.name, 'sm')}<span class="user-name">${esc(u.name)}</span>
                <button class="btn btn-ghost btn-icon btn-sm" data-nav="logout" title="${t('nav_switch')}" aria-label="${t('nav_switch')}">${icon('logout')}</button></div>`
            : ''
        }
      </div>
    </div>
  </header>`;
}

// La animación de entrada solo se aplica al cambiar de vista, no en cada repintado (responder, filtrar, expandir…).
let lastMountedView = null;
function mount(html, { nav = null, width = '' } = {}) {
  if (window.statsDestroyCharts) statsDestroyCharts();
  const enter = state.view !== lastMountedView;
  lastMountedView = state.view;
  $app.innerHTML = `${topbar(nav)}<main class="page ${enter ? 'enter' : ''}"><div class="container ${width}">${html}</div></main>`;
  $app.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => navigate(b.dataset.nav)));
}

const pageHead = (title, sub = '', actions = '') => `
  <div class="page-head">
    <div><h1>${title}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ''}</div>
    ${actions ? `<div class="page-actions">${actions}</div>` : ''}
  </div>`;

// Al salir de una sesión con progreso, pide confirmación.
async function confirmLeave() {
  if (state.view === 'test' && state.testMode && state.testMode.answers.length > 0) {
    return confirmDialog({ title: t('confirm_exit_test_title'), body: t('confirm_exit_test_body'), confirmLabel: t('exit'), danger: true });
  }
  if (state.view === 'study' && state.forceStudy && state.forceStudy.active && state.forceStudy.currentIndex > 0) {
    return confirmDialog({ title: t('confirm_exit_force_title'), body: t('confirm_exit_force_body'), confirmLabel: t('exit') });
  }
  return true;
}

async function navigate(to) {
  if (!(await confirmLeave())) return;
  stopTimer();
  state.testMode = null;
  state.forceStudy = null;
  state.current = null;
  if (to === 'logout') {
    localStorage.removeItem('lewis-quiz-user');
    return showUsers();
  }
  if (to === 'users' || !state.user) {
    if (to === 'ranking') return showRanking();
    return showUsers();
  }
  if (to === 'stats') return showStats();
  if (to === 'ranking') return showRanking();
  return showDashboard();
}

// ---------------- Modelo de Métricas y Nota Esperada ----------------

function getGradeInfo(score) {
  if (score >= 9.0) return { text: t('grade_sobresaliente'), cls: 'badge-sobresaliente', color: 'var(--grade-a)' };
  if (score >= 7.0) return { text: t('grade_notable'), cls: 'badge-notable', color: 'var(--grade-b)' };
  if (score >= 5.0) return { text: t('grade_aprobado'), cls: 'badge-aprobado', color: 'var(--grade-c)' };
  return { text: t('grade_suspenso'), cls: 'badge-suspenso', color: 'var(--grade-f)' };
}

function calcUserMetrics(user, subjectOrAll) {
  const isAll = subjectOrAll === 'all';
  const questions = isAll ? SUBJECTS.flatMap((s) => s.questions) : subjectOrAll.questions;
  const total = questions.length;
  if (!total) return null;

  const qSet = new Set(questions.map((q) => q.id));
  const cards = user.cards || {};
  const logs = (user.log || []).filter((l) => qSet.has(l.qid));

  const totalReviews = logs.length;
  const correctReviews = logs.filter((l) => l.correct).length;
  const acc = totalReviews > 0 ? correctReviews / totalReviews : null;
  const accFactor = acc !== null ? Math.max(0.75, Math.min(1.1, acc / 0.8)) : 0.85;

  const midnight = new Date().setHours(0, 0, 0, 0);
  const todayReviews = logs.filter((l) => l.t >= midnight).length;
  const lastActive = logs.length ? Math.max(...logs.map((l) => l.t)) : null;

  let studied = 0,
    mature = 0,
    young = 0,
    learning = 0,
    unseen = 0,
    sumP = 0;

  for (const q of questions) {
    const c = cards[q.id];
    let p = 0;
    if (c && c.state !== 'new') {
      studied++;
      if (c.state === 'learning' || c.state === 'relearning') {
        learning++;
        p = 0.5 * accFactor;
      } else if (c.state === 'review') {
        const lapseMod = Math.max(0.7, 1 - 0.04 * (c.lapses || 0));
        if (c.ivl >= 21) {
          mature++;
          p = 0.94 * lapseMod * accFactor;
        } else {
          young++;
          const ivlProg = Math.min(1, Math.max(0, c.ivl / 21));
          p = (0.72 + 0.2 * ivlProg) * lapseMod * accFactor;
        }
      }
    } else {
      const qLogs = logs.filter((l) => l.qid === q.id);
      if (qLogs.length > 0) {
        studied++;
        const last = qLogs[qLogs.length - 1];
        p = (last.correct ? 0.6 : 0.25) * accFactor;
      } else {
        unseen++;
        p = 0.0;
      }
    }
    sumP += Math.max(0, Math.min(0.98, p));
  }

  const rawScore = (sumP / total) * 10;
  const expectedScore = Math.round(rawScore * 10) / 10;
  const coverage = Math.round((studied / total) * 100);
  const accuracyPct = acc !== null ? Math.round(acc * 100) : null;
  const grade = getGradeInfo(expectedScore);

  let topicsBreakdown = [];
  if (!isAll && subjectOrAll.topics) {
    topicsBreakdown = subjectOrAll.topics.map((tp) => {
      const tQuestions = subjectOrAll.questions.filter((q) => q.topic === tp.id);
      let tSumP = 0,
        tStudied = 0,
        tMature = 0,
        tYoung = 0,
        tLearning = 0;
      for (const tq of tQuestions) {
        const c = cards[tq.id];
        let p = 0;
        if (c && c.state !== 'new') {
          tStudied++;
          if (c.state === 'learning' || c.state === 'relearning') {
            tLearning++;
            p = 0.5 * accFactor;
          } else if (c.state === 'review') {
            const lapseMod = Math.max(0.7, 1 - 0.04 * (c.lapses || 0));
            const ivlProg = Math.min(1, Math.max(0, c.ivl / 21));
            if (c.ivl >= 21) {
              tMature++;
              p = 0.94 * lapseMod * accFactor;
            } else {
              tYoung++;
              p = (0.72 + 0.2 * ivlProg) * lapseMod * accFactor;
            }
          }
        }
        tSumP += Math.max(0, Math.min(0.98, p));
      }
      const tScore = tQuestions.length ? Math.round((tSumP / tQuestions.length) * 10 * 10) / 10 : 0;
      return {
        id: tp.id,
        name: topicLabel(subjectOrAll, tp.id),
        total: tQuestions.length,
        studied: tStudied,
        mature: tMature,
        young: tYoung,
        learning: tLearning,
        score: tScore,
        grade: getGradeInfo(tScore),
      };
    });
  }

  // Diagnóstico / consejo según métricas
  let advice;
  if (coverage < 50) advice = t('advice_low', { cov: coverage, left: total - studied });
  else if (coverage < 100) advice = t('advice_mid', { cov: coverage, left: total - studied });
  else if (mature < total * 0.5) advice = t('advice_full', { n: young + learning, score: fmt1(expectedScore) });
  else advice = t('advice_mastered', { n: mature, acc: accuracyPct });

  return {
    expectedScore,
    grade,
    coverage,
    total,
    studied,
    mature,
    young,
    learning,
    unseen,
    accuracyPct,
    totalReviews,
    correctReviews,
    todayReviews,
    lastActive,
    topicsBreakdown,
    advice,
  };
}

// ---------------- Usuarios ----------------

async function showUsers() {
  stopTimer();
  Object.assign(state, { user: null, testMode: null, forceStudy: null, current: null });
  try {
    state.users = await call('GET', '/api/users');
  } catch (e) {
    toast(e.message);
  }
  renderUsers();
}

function renderUsers() {
  state.view = 'users';
  const users = state.users;
  mount(
    `<div class="auth-wrap">
      <div class="auth-hero">
        <span class="logo logo-lg">L</span>
        <h1>${t('choose_user_title')}</h1>
        <p class="page-sub">${t('choose_user_subtitle')}</p>
        <div class="row wrap">${SUBJECTS.map((s) => `<span class="badge badge-pill">${icon('book')}${esc(s.name)}</span>`).join('')}</div>
      </div>
      <div class="card auth-card">
        ${
          users.length
            ? `<div class="user-grid">${users
                .map(
                  (u) => `<button class="user-tile" data-user="${esc(u.id)}">${avatar(u.name)}<span class="user-tile-name">${esc(u.name)}</span>${icon('chevronRight', 'chev')}</button>`
                )
                .join('')}</div>`
            : `<div class="empty-inline" style="padding:16px 12px">${t('no_users_yet')}</div>`
        }
        <form id="new-user" class="auth-form">
          <label class="field-label" for="new-user-name">${t('new_student')}</label>
          <div class="input-row">
            <input class="input" id="new-user-name" name="name" placeholder="${t('your_name')}" maxlength="40" required autocomplete="off">
            <button class="btn btn-primary" type="submit">${t('start_btn')}${icon('arrowRight')}</button>
          </div>
        </form>
      </div>
    </div>`,
    { nav: 'users' }
  );
  $app.querySelectorAll('[data-user]').forEach((b) => (b.onclick = () => openUser(b.dataset.user)));
  $app.querySelector('#new-user').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const u = await call('POST', '/api/users', { name: e.target.name.value });
      openUser(u.id);
    } catch (err) {
      btn.disabled = false;
      toast(err.message);
    }
  };
}

async function openUser(id) {
  try {
    state.user = await call('GET', `/api/users/${id}`);
    localStorage.setItem('lewis-quiz-user', id);
    showDashboard();
  } catch (e) {
    localStorage.removeItem('lewis-quiz-user');
    showUsers();
  }
}

// ---------------- Panel Principal ----------------

function countsHtml(c) {
  return `<div class="counts">
    <span class="count new" title="${t('never_seen')}"><i></i><b>${c.new}</b> ${t('new_label')}</span>
    <span class="count learn" title="${t('in_learning')}"><i></i><b>${c.dueLearn}</b> ${t('learning_label')}</span>
    <span class="count review" title="${t('due_reviews')}"><i></i><b>${c.dueReview}</b> ${t('review_label')}</span>
  </div>`;
}

function barHtml(c) {
  const pct = (n) => (c.total ? (100 * n) / c.total : 0);
  return `<div class="bar" title="${t('bar_legend')}">
    <span style="width:${pct(c.mature)}%;background:var(--review)"></span>
    <span style="width:${pct(c.young)}%;background:color-mix(in srgb, var(--review) 45%, transparent)"></span>
    <span style="width:${pct(c.learning)}%;background:var(--learn)"></span>
  </div>`;
}

function scopeRow({ scope, title, sub, c, badge = '', testLabel }) {
  const seenPct = c.total ? Math.round((100 * (c.total - c.new)) / c.total) : 0;
  return `<div class="list-row">
    <div style="min-width:0">
      <div class="row-title"><span>${title}</span>${badge}</div>
      ${sub ? `<div class="small muted" style="margin-top:2px">${sub}</div>` : ''}
      <div class="row-meta">${countsHtml(c)}</div>
    </div>
    <div class="row-progress"><div class="small"><span>${t('seen')}</span><span>${seenPct}%</span></div>${barHtml(c)}</div>
    <div class="row-actions">
      <button class="btn btn-ghost btn-sm" data-force-study="${scope}" title="${t('force_session')}">${icon('zap', 'i-violet')}<span class="hide-sm">${t('force')}</span></button>
      <button class="btn btn-secondary btn-sm" data-test="${scope}">${icon('clipboard', 'i-emerald')}${testLabel}</button>
      <button class="btn btn-primary btn-sm" data-scope="${scope}">${icon('play')}${t('study')}</button>
    </div>
  </div>`;
}

const parseScope = (val) => (val === 'all' || val === 'final-mock' || isNaN(val) ? val : Number(val));

function showDashboard() {
  stopTimer();
  Object.assign(state, { view: 'dashboard', testMode: null, forceStudy: null, current: null, practice: false });
  const { user, subject } = state;
  const now = Date.now();
  const all = SRS.counts(scopeIds('all'), user.cards, now);
  const log = user.log.filter((e) => SUBJECT_OF[e.qid] === subject);
  const midnight = new Date().setHours(0, 0, 0, 0);
  const todayCount = log.filter((e) => e.t >= midnight).length;
  const acc = accuracy(log);
  const m = calcUserMetrics(user, subject);
  const due = all.dueLearn + all.dueReview;
  const exams = subject.exams || [];
  const hasMock = exams.some((ex) => ex.id === 'final-mock');

  const subjectSwitch =
    SUBJECTS.length > 1
      ? `<div class="seg lg subject-switch" role="tablist">${SUBJECTS.map(
          (s) => `<button role="tab" data-subject="${s.id}" class="${s === subject ? 'active' : ''}">${esc(s.name)}</button>`
        ).join('')}</div>`
      : '';

  const kpis = `<div class="kpi-grid">
    <div class="card kpi card-clickable" id="kpi-grade" title="${t('view_ranking_btn')}">
      <div class="kpi-label">${icon('target')}${t('kpi_expected')}</div>
      <div class="kpi-value" style="color:${m.grade.color}">${fmt1(m.expectedScore)}<span class="kpi-unit">/10</span></div>
      <div class="meter"><span style="width:${Math.min(100, m.expectedScore * 10)}%;background:${m.grade.color}"></span></div>
      <div class="kpi-sub"><span class="badge badge-grade ${m.grade.cls}">${m.grade.text}</span></div>
    </div>
    <div class="card kpi">
      <div class="kpi-label">${icon('clock')}${t('kpi_due')}</div>
      <div class="kpi-value">${due}</div>
      <div class="kpi-sub">${t('kpi_due_sub', { n: all.new })}</div>
    </div>
    <div class="card kpi">
      <div class="kpi-label">${icon('book')}${t('coverage')}</div>
      <div class="kpi-value">${m.coverage}<span class="kpi-unit">%</span></div>
      <div class="kpi-sub">${t('kpi_coverage_sub', { seen: m.studied, total: m.total })}</div>
    </div>
    <div class="card kpi">
      <div class="kpi-label">${icon('checkCircle')}${t('accuracy')}</div>
      <div class="kpi-value">${acc === null ? '–' : `${acc}<span class="kpi-unit">%</span>`}</div>
      <div class="kpi-sub">${t('kpi_acc_sub', { n: log.length, today: todayCount })}</div>
    </div>
  </div>`;

  const studyCard = `<div class="card hero-card study-card">
    <div class="row" style="gap:12px;align-items:flex-start">
      <span class="icon-tile">${icon('book')}</span>
      <div><h2>${t('study_card_title')}</h2><p class="card-sub">${t('study_card_sub', { subject: esc(subject.name) })}</p></div>
    </div>
    <div class="due-big"><b>${due}</b><span class="muted">${t('cards_due_now')}</span></div>
    <div>${countsHtml(all)}<div style="margin-top:10px">${barHtml(all)}</div></div>
    <div class="actions">
      <button class="btn btn-primary btn-lg" data-scope="all">${icon('play')}${t('study_now')}</button>
      <button class="btn btn-secondary btn-lg" data-force-study="all">${icon('zap', 'i-violet')}${t('force_session')}</button>
    </div>
  </div>`;

  const testCard = `<div class="card hero-card">
    <div class="row" style="gap:12px;align-items:flex-start">
      <span class="icon-tile emerald">${icon('clipboard')}</span>
      <div><h2>${t('test_sim_title')}</h2><p class="card-sub">${t('test_sim_desc', { total: all.total })}</p></div>
    </div>
    <div class="actions" style="flex-direction:column;align-items:stretch">
      ${hasMock ? `<button class="btn btn-primary" data-test="final-mock">${icon('cap')}${t('btn_final_mock', { n: scopeIds('final-mock').length })}</button>` : ''}
      <button class="btn ${hasMock ? 'btn-secondary' : 'btn-primary'}" id="btn-quick-full-test">${icon('clipboard', hasMock ? 'i-emerald' : '')}${t('btn_test_all', { total: all.total })}</button>
      <button class="btn btn-secondary" data-test="all">${icon('sliders')}${t('btn_custom_test')}</button>
    </div>
  </div>`;

  const examRows = exams
    .map((ex) => {
      const c = SRS.counts(scopeIds(ex.id), user.cards, now);
      const a = accuracy(log.filter((e) => Q[e.qid].exam === ex.id));
      const isMock = ex.id === 'final-mock';
      return scopeRow({
        scope: ex.id,
        title: `${icon('cap', 'i-accent')} ${esc(isMock ? t('final_mock_name') : ex.name)}`,
        sub: `${esc(isMock ? t('final_mock_desc') : ex.description || ex.title)}${a !== null ? ` · ${t('acc_pct', { n: a })}` : ''}`,
        c,
        badge: `<span class="badge badge-accent">${c.total} ${t('questions')}</span>`,
        testLabel: t('exam'),
      });
    })
    .join('');

  const topicRows = subject.topics
    .map((tp) => {
      const c = SRS.counts(scopeIds(tp.id), user.cards, now);
      const a = accuracy(log.filter((e) => Q[e.qid].topic === tp.id));
      return scopeRow({
        scope: tp.id,
        title: esc(topicName(tp.id)),
        sub: `${c.total} ${t('questions')}${a !== null ? ` · ${t('acc_pct', { n: a })}` : ''}`,
        c,
        testLabel: t('test'),
      });
    })
    .join('');

  const fails = {};
  for (const e of log) if (!e.correct) fails[e.qid] = (fails[e.qid] || 0) + 1;
  const worst = Object.entries(fails)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const recent = log.slice(-6).reverse();

  mount(
    `${pageHead(t('dashboard_greeting', { name: esc(user.name) }), t('dashboard_sub'), subjectSwitch)}
    ${kpis}
    <div class="grid-hero">${studyCard}${testCard}</div>

    ${
      exams.length
        ? `<section class="section">
        <div class="section-head"><h2>${icon('cap')}${t('exams_section_title')}</h2></div>
        <div class="card flush">${examRows}</div>
      </section>`
        : ''
    }

    <section class="section">
      <div class="section-head"><h2>${icon('book')}${t('topics_section_title')}</h2><span class="small muted">${t('n_topics', { n: subject.topics.length })}</span></div>
      <div class="card flush">${topicRows}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>${icon('history')}${t('history_section_title')}</h2></div>
      <div class="grid-2">
        <div class="card">
          <div class="card-head"><h3>${t('most_missed_title')}</h3></div>
          ${
            worst.length
              ? `<ul class="list">${worst
                  .map(
                    ([id, n]) =>
                      `<li><span class="fail-count">×${n}</span><span class="q" title="${esc(Q[id].q)}">${esc(Q[id].q)}</span><span class="badge">T${Q[id].topic}</span></li>`
                  )
                  .join('')}</ul>`
              : `<p class="empty-inline">${t('no_misses_yet')}</p>`
          }
        </div>
        <div class="card">
          <div class="card-head"><h3>${t('recent_answers_title')}</h3></div>
          ${
            recent.length
              ? `<ul class="list">${recent
                  .map(
                    (e) =>
                      `<li><span class="mark ${e.correct ? 'ok' : 'bad'}">${icon(e.correct ? 'check' : 'x')}</span><span class="q" title="${esc(Q[e.qid].q)}">${esc(Q[e.qid].q)}</span><span class="meta">${e.practice ? t('practice_label') : ratingLabel(e.rating)} · ${timeAgo(e.t)}</span></li>`
                  )
                  .join('')}</ul>`
              : `<p class="empty-inline">${t('no_answers_yet')}</p>`
          }
        </div>
      </div>
    </section>

    <section class="section">
      <details class="disclosure">
        <summary>${icon('help')}${t('faq_summary')}${icon('chevronDown', 'chev')}</summary>
        <div class="disclosure-body"><p>${t('faq_p1')}</p><p>${t('faq_p2')}</p></div>
      </details>
      <div class="footer-actions">
        <button class="btn btn-ghost-danger btn-sm" id="reset">${icon('rotate')}${t('reset_progress')}</button>
        <button class="btn btn-ghost-danger btn-sm" id="delete">${icon('trash')}${t('delete_user')}</button>
      </div>
    </section>`,
    { nav: 'dashboard' }
  );

  $app.querySelectorAll('[data-subject]').forEach((b) => {
    b.onclick = () => {
      state.subject = SUBJECTS.find((s) => s.id === b.dataset.subject);
      localStorage.setItem('lewis-quiz-subject', state.subject.id);
      showDashboard();
    };
  });
  $app.querySelectorAll('[data-scope]').forEach((b) => (b.onclick = () => startStudy(parseScope(b.dataset.scope))));
  $app.querySelectorAll('[data-force-study]').forEach((b) => (b.onclick = () => openForceStudyModal(parseScope(b.dataset.forceStudy))));
  $app.querySelectorAll('[data-test]').forEach((b) => (b.onclick = () => openTestModal(parseScope(b.dataset.test))));
  $app.querySelector('#btn-quick-full-test').onclick = () => startTest('all', state.subject.questions.length, true, true);
  $app.querySelector('#kpi-grade').onclick = () => showRanking();

  $app.querySelector('#reset').onclick = async () => {
    const ok = await confirmDialog({ title: t('confirm_reset_title'), body: t('confirm_reset_body', { name: esc(user.name) }), confirmLabel: t('reset_progress'), danger: true });
    if (!ok) return;
    try {
      await call('POST', `/api/users/${user.id}/reset`);
      toast(t('reset_done'), 'success');
    } catch (e) {
      toast(e.message);
    }
    openUser(user.id);
  };
  $app.querySelector('#delete').onclick = async () => {
    const ok = await confirmDialog({ title: t('confirm_delete_title'), body: t('confirm_delete_body', { name: esc(user.name) }), confirmLabel: t('delete_user'), danger: true });
    if (!ok) return;
    try {
      await call('DELETE', `/api/users/${user.id}`);
    } catch (e) {
      return toast(e.message);
    }
    localStorage.removeItem('lewis-quiz-user');
    showUsers();
  };
}

// ---------------- Selector de número de preguntas (modales) ----------------

function countPicker(presets, total, def, unit, allLabel) {
  return `<div class="chips">
      ${presets.map((p) => `<button type="button" class="chip ${p === def ? 'active' : ''}" data-chip="${p}">${p} ${unit}</button>`).join('')}
      <button type="button" class="chip ${total === def ? 'active' : ''}" data-chip="${total}">${allLabel}</button>
    </div>
    <div class="count-row">${t('exact_number')}
      <input type="number" class="input input-sm input-num" data-count min="1" max="${total}" value="${def}">
      ${t('of_total', { total })}
    </div>`;
}

// Devuelve una función que lee el número elegido, acotado a [1, total].
function bindCountPicker(root, total) {
  const input = root.querySelector('[data-count]');
  const chips = root.querySelectorAll('[data-chip]');
  const sync = (v) => chips.forEach((c) => c.classList.toggle('active', Number(c.dataset.chip) === v));
  chips.forEach(
    (c) =>
      (c.onclick = () => {
        input.value = c.dataset.chip;
        sync(Number(c.dataset.chip));
      })
  );
  input.oninput = () => sync(Number(input.value));
  return () => Math.min(total, Math.max(1, Math.round(Number(input.value)) || total));
}

const choice = (type, name, value, checked, title, desc) => `
  <label class="choice">
    <input type="${type}" name="${name}" value="${value}" ${checked ? 'checked' : ''}>
    <div><div class="choice-title">${title}</div>${desc ? `<div class="choice-desc">${desc}</div>` : ''}</div>
  </label>`;

// ---------------- Sesión Forzada de Estudio ----------------

function openForceStudyModal(scope = 'all') {
  const total = scopeIds(scope).length;
  if (!total) return toast(t('no_questions_scope'));
  const presets = [10, 20, 30, 50].filter((n) => n < total);
  const def = presets[0] || total;

  const m = openModal(`
    ${modalHead(t('force_modal_title'), t('force_modal_sub', { scope: esc(scopeName(scope)), total }), 'zap')}
    <div class="modal-body">
      <p class="field-desc">${t('force_modal_desc')}</p>
      <div>
        <span class="field-label">${t('how_many_cards')}</span>
        ${countPicker(presets, total, def, t('cards_unit'), t('all_cards_chip', { total }))}
      </div>
      <div>
        <span class="field-label">${t('priority_criteria')}</span>
        <div class="choices">
          ${choice('radio', 'force-strategy', 'due', true, `${icon('clock')} ${t('strat_due_title')} <span class="badge badge-accent">${t('recommended')}</span>`, t('strat_due_desc'))}
          ${choice('radio', 'force-strategy', 'hard', false, `${icon('flame')} ${t('strat_hard_title')}`, t('strat_hard_desc'))}
          ${choice('radio', 'force-strategy', 'random', false, `${icon('shuffle')} ${t('strat_random_title')}`, t('strat_random_desc'))}
        </div>
      </div>
      ${choice('checkbox', 'force-reschedule', '1', true, t('reschedule_cb_title'), t('reschedule_cb_desc'))}
    </div>
    <div class="modal-foot">
      <button class="btn btn-secondary" data-close>${t('cancel')}</button>
      <button class="btn btn-violet" id="start-force" autofocus>${icon('zap')}${t('btn_start_force')}</button>
    </div>`);
  m.querySelector('#start-force').focus();

  const getCount = bindCountPicker(m, total);
  m.querySelector('#start-force').onclick = () => {
    const strategy = m.querySelector('input[name="force-strategy"]:checked').value;
    const reschedule = m.querySelector('input[name="force-reschedule"]').checked;
    const count = getCount();
    closeModal();
    startForceStudy(scope, count, strategy, reschedule);
  };
}

function startForceStudy(scope, count, strategy = 'due', reschedule = true) {
  stopTimer();
  const ids = scopeIds(scope);
  if (!ids.length) return toast(t('no_questions_scope'));
  const cardIds = SRS.getForcedQueue(ids, state.user.cards, count, strategy, state.user.log || []);
  if (!cardIds.length) return toast(t('no_questions_scope'));

  Object.assign(state, { scope, practice: false, testMode: null, lastId: null });
  state.forceStudy = { active: true, scope, strategy, reschedule: !!reschedule, cardIds, currentIndex: 0, total: cardIds.length, results: [] };
  nextCard();
}

// ---------------- Modo Test ----------------

function openTestModal(scope = 'all') {
  const total = scopeIds(scope).length;
  if (!total) return toast(t('no_questions_scope'));
  const isMock = scope === 'final-mock';
  const presets = [10, 20, 30, 50].filter((n) => n < total);

  const m = openModal(`
    ${modalHead(
      isMock ? t('mock_modal_title') : t('test_modal_title'),
      isMock ? t('mock_modal_sub', { total }) : t('test_modal_sub', { scope: esc(scopeName(scope)), total }),
      isMock ? 'cap' : 'clipboard'
    )}
    <div class="modal-body">
      <div>
        <span class="field-label">${t('how_many_questions')}</span>
        ${countPicker(presets, total, total, t('questions_unit'), isMock ? t('full_exam_chip', { total }) : t('all_questions_chip', { total }))}
      </div>
      <div class="choices">
        ${choice('checkbox', 'test-immediate', '1', true, t('immediate_feedback_title'), t('immediate_feedback_desc'))}
        ${choice('checkbox', 'test-shuffle', '1', true, t('shuffle_title'), t('shuffle_desc'))}
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-secondary" data-close>${t('cancel')}</button>
      <button class="btn btn-primary" id="start-test">${icon(isMock ? 'cap' : 'play')}${isMock ? t('btn_start_exam') : t('btn_start_test')}</button>
    </div>`);

  const getCount = bindCountPicker(m, total);
  m.querySelector('#start-test').onclick = () => {
    const immediate = m.querySelector('input[name="test-immediate"]').checked;
    const shuffle = m.querySelector('input[name="test-shuffle"]').checked;
    const count = getCount();
    closeModal();
    startTest(scope, count, immediate, shuffle);
  };
}

// `questions` permite repetir exactamente las mismas preguntas de un test anterior.
function startTest(scope, count, immediateFeedback = true, shuffle = true, questions = null) {
  stopTimer();
  let selected = questions;
  if (!selected) {
    const ids = scopeIds(scope);
    if (!ids.length) return toast(t('no_questions_scope'));
    let pool = ids.map((id) => Q[id]);
    if (shuffle) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    } else {
      pool.sort((a, b) => (a.examOrder || 999) - (b.examOrder || 999));
    }
    selected = pool.slice(0, Math.min(count, pool.length));
  }

  Object.assign(state, { forceStudy: null, current: null });
  state.testMode = {
    active: true,
    scope,
    questions: selected,
    total: selected.length,
    currentIndex: 0,
    immediateFeedback: !!immediateFeedback,
    answers: [], // { qid, picked, correct, order }
    currentOrder: shuffledOrder(selected[0]),
    currentSel: [],
    currentPicked: null,
    currentCorrect: null,
    startTime: Date.now(),
    endTime: null,
    filterReview: 'all',
  };
  renderTestCard();
}

// ---------------- Piezas comunes de estudio y test ----------------

function optionHtml(q, oi, pos, cls, attr, answered) {
  const key = /\bcorrect\b/.test(cls) ? icon('check') : /\bwrong\b/.test(cls) ? icon('x') : LETTERS[pos];
  return `<button class="option ${cls}" ${attr}="${oi}" ${answered ? 'disabled' : ''}>
    <span class="key">${key}</span><span class="text">${esc(q.options[oi])}</span></button>`;
}

function feedbackHtml(q, correct) {
  const right = [].concat(q.answer);
  return `<div class="feedback ${correct ? 'ok' : 'bad'}">${icon(correct ? 'checkCircle' : 'xCircle')}
    <div>
      <div class="fb-title">${correct ? t('correct_msg') : t('incorrect_msg')}</div>
      ${correct ? '' : `<div class="fb-answer">${right.length > 1 ? t('were_multi') : t('was_single')} <b>${right.map((i) => esc(q.options[i])).join(' · ')}</b></div>`}
      ${q.explain ? `<div class="fb-explain">${rich(q.explain)}</div>` : ''}
    </div>
  </div>`;
}

function hintsHtml(kind, n) {
  const keys = `<kbd>1</kbd>–<kbd>${n}</kbd>`;
  const letters = `<kbd>A</kbd>–<kbd>${LETTERS[n - 1]}</kbd>`;
  const enter = '<kbd>Enter</kbd>';
  const space = `<kbd>${t('key_space')}</kbd>`;
  const text = {
    single: t('kbd_single', { keys, letters }),
    multi: t('kbd_multi', { keys, enter }),
    rate: t('kbd_rate', { keys: '<kbd>1</kbd>–<kbd>4</kbd>', space }),
    continue: t('kbd_continue', { space, enter }),
  }[kind];
  return `<div class="hints">${text}</div>`;
}

function sessionBar(badges, right) {
  return `<div class="session-bar">
    <div class="left"><button class="btn btn-ghost btn-sm" id="back">${icon('arrowLeft')}${t('back')}</button>${badges}</div>
    <div class="right">${right}</div>
  </div>`;
}

function shuffledOrder(q) {
  const idx = q.options.map((_, i) => i);
  if (q.options === TF) return idx; // True/False siempre en el mismo orden
  const pinned = idx.filter((i) => /^(none of the above|any \(|todas las anteriores)/i.test(q.options[i]));
  const free = idx.filter((i) => !pinned.includes(i));
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  return [...free, ...pinned];
}

// ---------------- Ejecución del Test ----------------

function renderTestCard() {
  const tm = state.testMode;
  if (!tm || !tm.active) return showDashboard();
  state.view = 'test';

  const q = tm.questions[tm.currentIndex];
  const answered = tm.currentPicked !== null;
  const multi = isMulti(q);
  const correctCount = tm.answers.filter((a) => a.correct).length;
  const progressPct = ((tm.currentIndex + (answered ? 1 : 0)) / tm.total) * 100;
  const picked = [].concat(tm.currentPicked ?? []);

  const options = tm.currentOrder
    .map((oi, pos) => {
      let cls = '';
      if (answered) {
        if (tm.immediateFeedback) {
          if (isRight(q, oi)) cls = multi && !picked.includes(oi) ? 'correct missed' : 'correct';
          else if (picked.includes(oi)) cls = 'wrong';
          else cls = 'dim';
        } else if (picked.includes(oi)) cls = 'selected';
        else cls = 'dim';
      } else if (tm.currentSel.includes(oi)) cls = 'selected';
      return optionHtml(q, oi, pos, cls, 'data-test-opt', answered);
    })
    .join('');

  let after = '';
  if (answered) {
    if (tm.immediateFeedback) after += feedbackHtml(q, tm.currentCorrect);
    const isLast = tm.currentIndex + 1 === tm.total;
    after += `<div class="session-actions"><button class="btn ${isLast ? 'btn-emerald' : 'btn-primary'} btn-lg btn-block" id="test-btn-next">
      ${isLast ? t('btn_finish_test') : t('btn_next_question')}${icon(isLast ? 'checkCircle' : 'arrowRight')}</button></div>`;
  }

  const scopeBadge = tm.scope === 'final-mock' ? t('final_mock_name') : scopeShort(tm.scope);
  mount(
    `${sessionBar(
      `<span class="badge badge-accent">${icon(tm.scope === 'final-mock' ? 'cap' : 'clipboard')}${esc(scopeBadge)}</span>`,
      `${tm.immediateFeedback && tm.answers.length ? `<span class="badge badge-ok" title="${t('accuracy')}">${icon('check')}${correctCount} / ${tm.answers.length}</span>` : ''}
       <span class="session-count">${t('question_counter', { cur: tm.currentIndex + 1, total: tm.total })}</span>`
    )}
    <div class="progress"><span style="width:${progressPct}%"></span></div>
    <div class="card q-card">
      <div class="q-meta"><span class="topic">${esc(topicName(q.topic))}</span><span class="badge">${t('question')} ${tm.currentIndex + 1}</span></div>
      <div class="question">${questionHtml(q.q)}</div>
      ${multi ? `<div class="multi-hint">${icon('info')}${t('multi_hint')}</div>` : ''}
      <div class="options">${options}</div>
      ${multi && !answered ? `<div class="session-actions"><button class="btn btn-primary btn-lg btn-block" id="test-check-multi" ${tm.currentSel.length ? '' : 'disabled'}>${icon('check')}${t('check_btn')}</button></div>` : ''}
      ${after}
    </div>
    ${hintsHtml(answered ? 'continue' : multi ? 'multi' : 'single', tm.currentOrder.length)}`,
    { nav: 'dashboard', width: 'narrow' }
  );

  $app.querySelector('#back').onclick = () => navigate('dashboard');
  $app.querySelectorAll('[data-test-opt]').forEach((b) => (b.onclick = () => pickTestOption(Number(b.dataset.testOpt))));
  const checkBtn = $app.querySelector('#test-check-multi');
  if (checkBtn) checkBtn.onclick = checkTestMulti;
  const nextBtn = $app.querySelector('#test-btn-next');
  if (nextBtn) nextBtn.onclick = nextTestQuestion;
}

function pickTestOption(oi) {
  const tm = state.testMode;
  if (!tm || tm.currentPicked !== null) return;
  if (isMulti(tm.questions[tm.currentIndex])) {
    tm.currentSel = tm.currentSel.includes(oi) ? tm.currentSel.filter((i) => i !== oi) : [...tm.currentSel, oi];
    renderTestCard();
  } else {
    recordTestAnswer(oi, oi === tm.questions[tm.currentIndex].answer);
  }
}

function checkTestMulti() {
  const tm = state.testMode;
  if (!tm || tm.currentPicked !== null || !tm.currentSel.length) return;
  const q = tm.questions[tm.currentIndex];
  const correct = tm.currentSel.length === q.answer.length && tm.currentSel.every((i) => q.answer.includes(i));
  recordTestAnswer([...tm.currentSel], correct);
}

// Guarda la respuesta del test y la registra en el historial como práctica (no altera la programación SRS).
function recordTestAnswer(picked, correct) {
  const tm = state.testMode;
  const q = tm.questions[tm.currentIndex];
  tm.currentPicked = picked;
  tm.currentCorrect = correct;
  tm.answers.push({ qid: q.id, picked, correct, order: tm.currentOrder });

  if (state.user) {
    const rating = correct ? 'good' : 'again';
    state.user.log.push({ t: Date.now(), qid: q.id, rating, correct, practice: true });
    call('POST', `/api/users/${state.user.id}/review`, { qid: q.id, rating, correct, practice: true }).catch((e) => toast(t('save_failed', { msg: e.message })));
  }
  renderTestCard();
}

function nextTestQuestion() {
  const tm = state.testMode;
  if (!tm || tm.currentPicked === null) return;
  if (tm.currentIndex + 1 < tm.total) {
    tm.currentIndex++;
    tm.currentOrder = shuffledOrder(tm.questions[tm.currentIndex]);
    tm.currentSel = [];
    tm.currentPicked = null;
    tm.currentCorrect = null;
    renderTestCard();
  } else {
    tm.endTime = Date.now();
    showTestResults();
  }
}

// ---------------- Resultados del Test ----------------

function showTestResults() {
  const tm = state.testMode;
  if (!tm) return showDashboard();
  state.view = 'results';

  const total = tm.questions.length;
  const correctCount = tm.answers.filter((a) => a.correct).length;
  const wrongCount = total - correctCount;
  const accuracyPct = Math.round((correctCount / total) * 100);
  const score = Math.round((correctCount / total) * 100) / 10;
  const grade = getGradeInfo(score);
  const isMock = tm.scope === 'final-mock';

  const totalSeconds = Math.round(Math.max(1000, (tm.endTime || Date.now()) - tm.startTime) / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const durationText = mins > 0 ? `${mins} min ${totalSeconds % 60} s` : `${totalSeconds} s`;
  const avgPerQuestion = Math.round(totalSeconds / total);

  // Desglose por temas tocados en este test
  const topicStats = {};
  tm.questions.forEach((q, idx) => {
    const ts = (topicStats[q.topic] ||= { name: topicName(q.topic), total: 0, correct: 0 });
    ts.total++;
    if (tm.answers[idx]?.correct) ts.correct++;
  });
  const topicsList = Object.values(topicStats);

  const filter = tm.filterReview || 'all';
  const indices = tm.questions
    .map((_, i) => i)
    .filter((i) => (filter === 'wrong' ? !tm.answers[i]?.correct : filter === 'correct' ? !!tm.answers[i]?.correct : true));

  const reviewHtml = indices
    .map((idx) => {
      const q = tm.questions[idx];
      const a = tm.answers[idx];
      const ok = !!a?.correct;
      const picked = [].concat(a ? a.picked : []);
      const right = [].concat(q.answer);
      const opts = q.options
        .map((text, oi) => {
          const isPicked = picked.includes(oi);
          const isRightOpt = right.includes(oi);
          const cls = isRightOpt ? 'opt-correct' : isPicked ? 'opt-wrong' : '';
          return `<div class="review-opt ${cls}">
            <span class="letter">${LETTERS[oi]}</span><span class="text">${esc(text)}</span>
            ${isRightOpt ? `<span class="badge badge-ok">${icon('check')}${t('tag_correct')}</span>` : ''}
            ${isPicked ? `<span class="badge ${isRightOpt ? '' : 'badge-bad'}">${t('tag_yours')}</span>` : ''}
          </div>`;
        })
        .join('');
      return `<div class="card review-item ${ok ? 'is-correct' : 'is-wrong'}">
        <div class="review-head">
          <span class="badge ${ok ? 'badge-ok' : 'badge-bad'}">${icon(ok ? 'check' : 'x')}${ok ? t('review_correct') : t('review_wrong')}</span>
          <span class="small muted">${t('question')} ${idx + 1} · ${esc(topicName(q.topic))}</span>
        </div>
        <div class="review-q">${questionHtml(q.q)}</div>
        <div class="review-opts">${opts}</div>
        ${q.explain ? `<div class="review-explain">${icon('bulb')}<div>${rich(q.explain)}</div></div>` : ''}
      </div>`;
    })
    .join('');

  const message = score >= 9 ? t('feedback_excellent') : score >= 7 ? t('feedback_great') : score >= 5 ? t('feedback_pass') : t('feedback_fail');

  mount(
    `${pageHead(t('test_results_title'), t('test_results_sub', { scope: esc(scopeName(tm.scope)), total }))}
    <div class="card result-hero" style="--grade-color:${grade.color}">
      <div class="result-label">${isMock ? t('mock_score_label') : t('test_score_label')}</div>
      <div class="result-score" style="color:${grade.color}">${fmt1(score)}<span class="kpi-unit">/10</span></div>
      ${isMock ? `<div class="result-points">${t('mock_points_detail', { correct: correctCount, total })}</div>` : ''}
      <span class="badge badge-grade ${grade.cls}">${grade.text}</span>
      <p class="result-msg">${message}</p>
      <div class="actions">
        <button class="btn btn-primary" id="btn-repeat-test">${icon('rotate')}${t('btn_repeat_test')}</button>
        <button class="btn btn-secondary" id="btn-new-test">${icon('sliders')}${t('btn_new_test')}</button>
        <button class="btn btn-ghost" id="btn-finish-dashboard">${t('btn_to_dashboard')}${icon('arrowRight')}</button>
      </div>
    </div>

    <div class="kpi-grid three" style="margin-top:16px">
      <div class="card kpi">
        <div class="kpi-label">${icon('checkCircle')}${t('correct_label')}</div>
        <div class="kpi-value ok">${correctCount}<span class="kpi-unit">/ ${total}</span></div>
        <div class="kpi-sub">${t('acc_pct', { n: accuracyPct })}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-label">${icon('xCircle')}${t('incorrect_label')}</div>
        <div class="kpi-value ${wrongCount ? 'bad' : 'ok'}">${wrongCount}</div>
        <div class="kpi-sub">${t('to_review_below')}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-label">${icon('clock')}${t('time_label')}</div>
        <div class="kpi-value">${durationText}</div>
        <div class="kpi-sub">${t('avg_per_question', { s: avgPerQuestion })}</div>
      </div>
    </div>

    ${
      topicsList.length > 1
        ? `<section class="section">
        <div class="section-head"><h2>${icon('chart')}${t('topic_performance')}</h2></div>
        <div class="topic-grid">
          ${topicsList
            .map((tp) => {
              const pct = Math.round((tp.correct / tp.total) * 100);
              const g = getGradeInfo((tp.correct / tp.total) * 10);
              return `<div class="mini-card">
                <div class="title" title="${esc(tp.name)}">${esc(tp.name)}</div>
                <div class="row"><span class="tabular" style="font-weight:600;color:${g.color}">${t('n_correct', { c: tp.correct, total: tp.total })}</span><span class="badge badge-grade ${g.cls}">${pct}%</span></div>
                <div class="meter"><span style="width:${pct}%;background:${g.color}"></span></div>
              </div>`;
            })
            .join('')}
        </div>
      </section>`
        : ''
    }

    <section class="section">
      <div class="section-head">
        <h2>${icon('list')}${t('answer_review_title')}</h2>
        <div class="seg">
          <button data-filter-btn="all" class="${filter === 'all' ? 'active' : ''}">${t('filter_all', { n: total })}</button>
          <button data-filter-btn="wrong" class="${filter === 'wrong' ? 'active' : ''}">${t('filter_wrong', { n: wrongCount })}</button>
          <button data-filter-btn="correct" class="${filter === 'correct' ? 'active' : ''}">${t('filter_correct', { n: correctCount })}</button>
        </div>
      </div>
      <div class="stack">${reviewHtml || `<div class="card empty-inline" style="text-align:center;padding:28px">${t('no_filter_match')}</div>`}</div>
    </section>`,
    { nav: 'dashboard', width: 'mid' }
  );

  const goHome = () => navigate('dashboard');
  $app.querySelector('#btn-finish-dashboard').onclick = goHome;
  $app.querySelector('#btn-repeat-test').onclick = () => startTest(tm.scope, total, tm.immediateFeedback, false, tm.questions);
  $app.querySelector('#btn-new-test').onclick = () => openTestModal(tm.scope);
  $app.querySelectorAll('[data-filter-btn]').forEach((btn) => {
    btn.onclick = () => {
      tm.filterReview = btn.dataset.filterBtn;
      showTestResults();
    };
  });
}

// ---------------- Ranking de Alumnos ----------------

async function showRanking() {
  stopTimer();
  state.view = 'ranking';
  mount(`${pageHead(t('ranking_title'))}<div class="card empty"><p>${t('loading_ranking')}</p></div>`, { nav: 'ranking', width: 'mid' });

  let data = [];
  try {
    data = await call('GET', '/api/ranking');
    state.cachedRanking = data;
  } catch (e) {
    toast(t('ranking_load_error', { msg: e.message }));
    data = state.cachedRanking || (state.user ? [state.user] : []);
  }
  // El usuario actual va con sus datos en memoria, que pueden ser más recientes que los del servidor.
  if (state.user) {
    const idx = data.findIndex((u) => u.id === state.user.id);
    if (idx >= 0) data[idx] = state.user;
    else data.push(state.user);
  }
  state.rankingData = data;
  if (state.view === 'ranking') renderRankingView();
}

function renderRankingView() {
  state.view = 'ranking';
  const data = state.rankingData || [];
  const scope = state.rankingScope;
  const subj = scope === 'all' ? 'all' : SUBJECTS.find((s) => s.id === scope) || 'all';
  const scopeLabel = subj === 'all' ? t('all_subjects') : subj.name;

  const rows = data.map((u) => ({ id: u.id, name: u.name, metrics: calcUserMetrics(u, subj), isMe: !!state.user && state.user.id === u.id }));
  const sortKey = state.rankingSort;
  const by = {
    score: (a, b) =>
      b.metrics.expectedScore - a.metrics.expectedScore ||
      (b.metrics.accuracyPct || 0) - (a.metrics.accuracyPct || 0) ||
      b.metrics.mature - a.metrics.mature ||
      b.metrics.totalReviews - a.metrics.totalReviews,
    accuracy: (a, b) => (b.metrics.accuracyPct || 0) - (a.metrics.accuracyPct || 0) || b.metrics.expectedScore - a.metrics.expectedScore,
    coverage: (a, b) => b.metrics.coverage - a.metrics.coverage || b.metrics.expectedScore - a.metrics.expectedScore,
    mature: (a, b) => b.metrics.mature - a.metrics.mature || b.metrics.expectedScore - a.metrics.expectedScore,
    reviews: (a, b) => b.metrics.totalReviews - a.metrics.totalReviews || b.metrics.expectedScore - a.metrics.expectedScore,
  };
  rows.sort(by[sortKey] || by.score);
  rows.forEach((u, i) => (u.rank = i + 1));
  const me = rows.find((u) => u.isMe);
  const canCompare = (u) => state.user && !u.isMe;
  const compareBtn = (u) =>
    canCompare(u) ? `<button class="btn btn-secondary btn-sm" data-compare-peer="${esc(u.id)}" title="${t('compare_with', { name: esc(u.name) })}">${icon('users')}<span class="hide-sm">${t('compare')}</span></button>` : '';
  const youBadge = (u) => (u.isMe ? `<span class="badge badge-you">${t('you')}</span>` : '');
  const medal = (rank) => `<span class="podium-medal medal-${rank}">${rank}</span>`;

  const podiumSlot = (u, cls) =>
    u
      ? `<div class="card podium-slot ${cls} ${u.isMe ? 'is-me' : ''}" data-expand="${esc(u.id)}">
        ${u.rank === 1 ? `<span style="color:var(--grade-a)">${icon('crown')}</span>` : ''}
        ${medal(u.rank)}
        ${avatar(u.name, 'lg')}
        <div class="podium-name"><span>${esc(u.name)}</span>${youBadge(u)}</div>
        <div class="podium-score" style="color:${u.metrics.grade.color}">${fmt1(u.metrics.expectedScore)}<span class="kpi-unit">/10</span></div>
        <span class="badge badge-grade ${u.metrics.grade.cls}">${u.metrics.grade.text}</span>
        <div class="small muted">${t('podium_meta', { cov: u.metrics.coverage, n: u.metrics.totalReviews })}</div>
      </div>`
      : '<div></div>';
  const podium = rows.length >= 2 ? `<div class="podium">${podiumSlot(rows[1], 'second')}${podiumSlot(rows[0], 'first')}${podiumSlot(rows[2], 'third')}</div>` : '';

  const detailHtml = (u) => {
    const m = u.metrics;
    return `<div class="rank-detail">
      <div class="small muted" style="padding-top:12px">
        ${m.lastActive ? t('last_review', { when: timeAgo(m.lastActive) }) : t('no_activity')}
        ${m.todayReviews > 0 ? ` · ${t('answers_today', { n: m.todayReviews })}` : ''}
      </div>
      <div class="kpi-grid three">
        <div class="card kpi"><div class="kpi-label">${t('kpi_expected')}</div><div class="kpi-value" style="color:${m.grade.color}">${fmt1(m.expectedScore)}<span class="kpi-unit">/10</span></div></div>
        <div class="card kpi"><div class="kpi-label">${t('coverage')}</div><div class="kpi-value">${m.coverage}<span class="kpi-unit">%</span></div><div class="kpi-sub">${t('kpi_coverage_sub', { seen: m.studied, total: m.total })}</div></div>
        <div class="card kpi"><div class="kpi-label">${t('accuracy')}</div><div class="kpi-value">${m.accuracyPct !== null ? `${m.accuracyPct}<span class="kpi-unit">%</span>` : '–'}</div></div>
      </div>
      <div class="banner" style="margin:14px 0 0">${icon('bulb')}<div><b>${t('diagnosis')}</b> ${esc(m.advice)}</div></div>
      ${
        m.topicsBreakdown.length
          ? `<div class="field-label" style="margin-top:16px">${t('topic_mastery')}</div>
        <div class="topic-grid">
          ${m.topicsBreakdown
            .map(
              (tp) => `<div class="mini-card">
            <div class="title" title="${esc(tp.name)}">${esc(tp.name)}</div>
            <div class="row"><span class="tabular" style="font-weight:700;color:${tp.grade.color}">${fmt1(tp.score)}<span class="kpi-unit">/10</span></span><span class="badge badge-grade ${tp.grade.cls}">${tp.grade.text}</span></div>
            <div class="meter"><span style="width:${Math.min(100, tp.score * 10)}%;background:${tp.grade.color}"></span></div>
            <div class="small muted" style="margin-top:6px">${t('seen_of', { seen: tp.studied, total: tp.total })}</div>
          </div>`
            )
            .join('')}
        </div>`
          : ''
      }
    </div>`;
  };

  const listRows = rows
    .map((u) => {
      const m = u.metrics;
      const expanded = state.expandedUserId === u.id;
      return `<div class="rank-row ${u.isMe ? 'is-me' : ''}" data-expand="${esc(u.id)}">
        <div class="rank-num">${u.rank <= 3 ? medal(u.rank) : u.rank}</div>
        <div class="rank-user">${avatar(u.name)}
          <div style="min-width:0">
            <div class="rank-name"><span>${esc(u.name)}</span>${youBadge(u)}</div>
            <div class="rank-meta">
              <span>${t('coverage')} <b>${m.coverage}%</b></span>
              <span><b>${m.mature}</b> ${t('mastered')}</span>
              <span><b>${m.accuracyPct !== null ? m.accuracyPct + '%' : '–'}</b> ${t('accuracy_lc')}</span>
              <span><b>${m.totalReviews}</b> ${t('reps')}</span>
              ${m.todayReviews > 0 ? `<span style="color:var(--warn-text)">${t('n_today', { n: m.todayReviews })}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="rank-score">
          ${compareBtn(u)}
          <span class="badge badge-grade ${m.grade.cls} hide-sm">${m.grade.text}</span>
          <span class="val" style="color:${m.grade.color}">${fmt1(m.expectedScore)}<small>/10</small></span>
          <span class="muted">${icon(expanded ? 'chevronUp' : 'chevronDown')}</span>
        </div>
      </div>${expanded ? detailHtml(u) : ''}`;
    })
    .join('');

  const scopeSeg = `<div class="seg">
    <button data-rank-scope="all" class="${scope === 'all' ? 'active' : ''}">${t('all_subjects')}</button>
    ${SUBJECTS.map((s) => `<button data-rank-scope="${s.id}" class="${scope === s.id ? 'active' : ''}">${esc(s.name)}</button>`).join('')}
  </div>`;

  const sorts = [
    ['score', t('sort_score')],
    ['accuracy', t('sort_accuracy')],
    ['coverage', t('sort_coverage')],
    ['mature', t('sort_mature')],
    ['reviews', t('sort_reviews')],
  ];

  mount(
    `${pageHead(t('ranking_title'), `${esc(scopeLabel)} · ${t('ranking_sub')}`, scopeSeg)}
    ${
      me
        ? `<div class="card me-card">
        <span class="me-rank">#${me.rank}</span>
        <div style="flex:1;min-width:220px">
          <div style="font-weight:600">${t('your_rank_is', { rank: me.rank, total: rows.length })}</div>
          <div class="small muted" style="margin-top:4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${t('kpi_expected')}: <b style="color:${me.metrics.grade.color}">${fmt1(me.metrics.expectedScore)}/10</b>
            <span class="badge badge-grade ${me.metrics.grade.cls}">${me.metrics.grade.text}</span>
            · ${t('coverage')} <b>${me.metrics.coverage}%</b>
            · ${t('accuracy')} <b>${me.metrics.accuracyPct !== null ? me.metrics.accuracyPct + '%' : '–'}</b>
          </div>
        </div>
        <button id="my-study-btn" class="btn btn-primary">${icon('play')}${t('study_now')}</button>
      </div>`
        : ''
    }
    ${podium}
    ${
      rows.length
        ? `<div class="filter-bar">
        <div class="small muted">${t('n_students', { n: rows.length })}</div>
        <label class="row small muted">${t('sort_by_label')}
          <select id="rank-sort-select" class="input input-sm">${sorts.map(([k, l]) => `<option value="${k}" ${sortKey === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </label>
      </div>
      <div class="card flush">${listRows}</div>`
        : `<div class="card empty"><span class="icon-tile lg">${icon('users')}</span><h2>${t('no_students_title')}</h2><p>${t('no_students_desc')}</p></div>`
    }
    <section class="section">
      <details class="disclosure">
        <summary>${icon('help')}${t('ranking_faq_title')}${icon('chevronDown', 'chev')}</summary>
        <div class="disclosure-body">
          <p>${t('ranking_faq_intro')}</p>
          <ul>
            <li>${t('ranking_faq_unseen')}</li>
            <li>${t('ranking_faq_mature')}</li>
            <li>${t('ranking_faq_young')}</li>
            <li>${t('ranking_faq_learning')}</li>
            <li>${t('ranking_faq_factor')}</li>
          </ul>
          <p>${t('ranking_faq_scale')}</p>
        </div>
      </details>
    </section>`,
    { nav: 'ranking', width: 'mid' }
  );

  const myStudy = $app.querySelector('#my-study-btn');
  if (myStudy) myStudy.onclick = () => showDashboard();
  $app.querySelectorAll('[data-rank-scope]').forEach((b) => {
    b.onclick = () => {
      state.rankingScope = b.dataset.rankScope;
      renderRankingView();
    };
  });
  $app.querySelectorAll('[data-compare-peer]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      showStats({ subjectId: scope, peerId: btn.dataset.comparePeer });
    };
  });
  const sortSelect = $app.querySelector('#rank-sort-select');
  if (sortSelect) {
    sortSelect.onchange = (e) => {
      state.rankingSort = e.target.value;
      renderRankingView();
    };
  }
  $app.querySelectorAll('[data-expand]').forEach((el) => {
    el.onclick = () => {
      const uid = el.dataset.expand;
      state.expandedUserId = state.expandedUserId === uid ? null : uid;
      renderRankingView();
    };
  });
}

// ---------------- Modo Estudio Espaciado (SRS) ----------------

function startStudy(scope) {
  Object.assign(state, { scope, practice: false, forceStudy: null, lastId: null, testMode: null });
  nextCard();
}

function nextCard() {
  stopTimer();
  const ids = scopeIds(state.scope);
  let id;
  const fs = state.forceStudy;
  if (fs && fs.active) {
    if (fs.currentIndex >= fs.cardIds.length) return showForceStudyDone();
    id = fs.cardIds[fs.currentIndex];
  } else if (state.practice) {
    const pool = ids.length > 1 ? ids.filter((x) => x !== state.lastId) : ids;
    id = pool[Math.floor(Math.random() * pool.length)];
  } else {
    id = SRS.pickNext(ids, state.user.cards, Date.now(), state.lastId);
  }
  if (!id) return showDone();
  state.current = { id, order: shuffledOrder(Q[id]), sel: [], picked: null, correct: null };
  renderCard();
}

function studyBar() {
  const fs = state.forceStudy && state.forceStudy.active ? state.forceStudy : null;
  const c = SRS.counts(scopeIds(state.scope), state.user.cards);
  const badges = `<span class="badge">${esc(scopeShort(state.scope))}</span>${fs ? `<span class="badge badge-violet">${icon('zap')}${t('tag_forced_session')}</span>` : ''}`;
  const right = fs
    ? `<span class="session-count">${t('question_counter', { cur: Math.min(fs.currentIndex + 1, fs.total), total: fs.total })}</span>`
    : state.practice
      ? `<span class="badge badge-accent">${icon('shuffle')}${t('practice_label')}</span>`
      : `<span class="counts-compact" title="${t('bar_legend')}"><span class="n-new" title="${t('never_seen')}">${c.new}</span><span class="n-learn" title="${t('in_learning')}">${c.dueLearn}</span><span class="n-review" title="${t('due_reviews')}">${c.dueReview}</span></span>`;
  return sessionBar(badges, right);
}

function bindStudyBack() {
  $app.querySelector('#back').onclick = () => navigate('dashboard');
}

function renderCard() {
  state.view = 'study';
  const { id, order, sel, picked, correct } = state.current;
  const q = Q[id];
  const multi = isMulti(q);
  const card = state.user.cards[id] || SRS.newCard();
  const answered = picked !== null;
  const fs = state.forceStudy && state.forceStudy.active ? state.forceStudy : null;
  const noReschedule = state.practice || (fs && !fs.reschedule);
  const pickedArr = [].concat(picked ?? []);

  const options = order
    .map((oi, pos) => {
      let cls = '';
      if (answered) {
        if (isRight(q, oi)) cls = multi && !pickedArr.includes(oi) ? 'correct missed' : 'correct';
        else if (pickedArr.includes(oi)) cls = 'wrong';
        else cls = 'dim';
      } else if (sel.includes(oi)) cls = 'selected';
      return optionHtml(q, oi, pos, cls, 'data-opt', answered);
    })
    .join('');

  let after = '';
  if (answered) {
    after = feedbackHtml(q, correct);
    if (noReschedule) {
      after += `<div class="session-actions"><button class="btn btn-primary btn-lg btn-block" data-next>${t('next_btn')}${icon('arrowRight')}</button></div>`;
    } else {
      const pv = SRS.preview(card);
      const ratings = correct ? RATINGS : ['again'];
      after += `<div class="grades ${correct ? '' : 'one'}">${ratings
        .map(
          (r, i) =>
            `<button class="grade ${r}" data-rate="${r}">${correct ? `<kbd>${i + 1}</kbd>` : ''}<span class="g-label">${ratingLabel(r)}</span><span class="g-ivl">${pv[r]}</span></button>`
        )
        .join('')}</div>`;
    }
  }

  const status =
    card.state === 'new'
      ? `<span class="badge badge-new">${t('status_new')}</span>`
      : SRS.isLearning(card)
        ? `<span class="badge badge-learn">${t('status_learning')}</span>`
        : `<span class="badge badge-review">${t('status_review')}</span>`;
  const progressPct = fs ? ((fs.currentIndex + (answered ? 1 : 0)) / fs.total) * 100 : 0;

  mount(
    `${studyBar()}
    ${
      fs
        ? `<div class="progress violet"><span style="width:${progressPct}%"></span></div>
          <div class="banner violet">${icon('zap')}<div>${fs.reschedule ? t('forced_banner_resched') : t('forced_banner_no_resched')}</div></div>`
        : state.practice
          ? `<div class="banner">${icon('info')}<div>${t('practice_banner')}</div></div>`
          : ''
    }
    <div class="card q-card">
      <div class="q-meta"><span class="topic">${esc(topicName(q.topic))}</span>${status}</div>
      <div class="question">${questionHtml(q.q)}</div>
      ${multi ? `<div class="multi-hint">${icon('info')}${t('multi_hint')}</div>` : ''}
      <div class="options">${options}</div>
      ${multi && !answered ? `<div class="session-actions"><button class="btn btn-primary btn-lg btn-block" data-check ${sel.length ? '' : 'disabled'}>${icon('check')}${t('check_btn')}</button></div>` : ''}
      ${after}
    </div>
    ${hintsHtml(answered ? (correct && !noReschedule ? 'rate' : 'continue') : multi ? 'multi' : 'single', order.length)}`,
    { nav: 'dashboard', width: 'narrow' }
  );

  bindStudyBack();
  $app.querySelectorAll('[data-opt]').forEach((b) => (b.onclick = () => answer(Number(b.dataset.opt))));
  $app.querySelectorAll('[data-rate]').forEach((b) => (b.onclick = () => rate(b.dataset.rate)));
  const check = $app.querySelector('[data-check]');
  if (check) check.onclick = checkMulti;
  const next = $app.querySelector('[data-next]');
  if (next) next.onclick = () => rate(state.current.correct ? 'good' : 'again');
}

function answer(optIndex) {
  const cur = state.current;
  if (cur.picked !== null) return;
  if (isMulti(Q[cur.id])) {
    cur.sel = cur.sel.includes(optIndex) ? cur.sel.filter((i) => i !== optIndex) : [...cur.sel, optIndex];
  } else {
    cur.picked = optIndex;
    cur.correct = optIndex === Q[cur.id].answer;
  }
  renderCard();
}

// Respuesta múltiple: acierto solo si se marcan exactamente las correctas.
function checkMulti() {
  const cur = state.current;
  const q = Q[cur.id];
  if (cur.picked !== null || !cur.sel.length) return;
  cur.picked = cur.sel;
  cur.correct = cur.sel.length === q.answer.length && cur.sel.every((i) => q.answer.includes(i));
  renderCard();
}

function rate(rating) {
  const { id, correct } = state.current;
  const { user } = state;
  const fs = state.forceStudy && state.forceStudy.active ? state.forceStudy : null;
  const shouldReschedule = fs ? fs.reschedule : !state.practice;
  const oldCard = user.cards[id] || SRS.newCard();
  let next = null;

  if (shouldReschedule) {
    next = SRS.schedule(oldCard, rating);
    user.cards[id] = next;
  }
  const isPracticeLog = !shouldReschedule;
  const body = { qid: id, rating, correct, practice: isPracticeLog };
  if (next) body.card = next;

  user.log.push({ t: Date.now(), qid: id, rating, correct, practice: isPracticeLog, forced: !!fs });

  if (fs) {
    fs.results.push({ qid: id, rating, correct, oldIvl: oldCard.ivl || 0, newIvl: next ? next.ivl : oldCard.ivl || 0, rescheduled: shouldReschedule });
    fs.currentIndex++;
  }

  state.lastId = id;
  call('POST', `/api/users/${user.id}/review`, body).catch((e) => toast(t('save_failed', { msg: e.message })));
  nextCard();
}

function showDone() {
  state.view = 'done';
  state.current = null;
  const c = SRS.counts(scopeIds(state.scope), state.user.cards);
  const wait = c.nextDue ? SRS.formatDelay(c.nextDue - Date.now()) : null;
  mount(
    `${studyBar()}
    <div class="card empty">
      <span class="icon-tile ok lg">${icon('checkCircle')}</span>
      <h2>${t('study_done_title', { scope: esc(scopeName(state.scope)) })}</h2>
      <p>${t('study_done_sub')}${wait ? ` ${t('next_due_in', { wait })}` : ''}</p>
      <div class="actions">
        <button class="btn btn-violet" id="force-study-btn">${icon('zap')}${t('btn_force_study')}</button>
        <button class="btn btn-secondary" id="practice">${icon('shuffle')}${t('btn_practice_random')}</button>
        <button class="btn btn-ghost" id="home">${t('back_to_panel')}</button>
      </div>
      <p class="small muted" style="margin-top:12px">${t('force_study_tip')}</p>
    </div>`,
    { nav: 'dashboard', width: 'narrow' }
  );
  bindStudyBack();
  $app.querySelector('#home').onclick = () => showDashboard();
  $app.querySelector('#force-study-btn').onclick = () => openForceStudyModal(state.scope);
  $app.querySelector('#practice').onclick = () => {
    state.practice = true;
    nextCard();
  };
  // Si una tarjeta de aprendizaje vence mientras esperas, se reanuda sola.
  state.timer = setInterval(() => {
    if (state.view === 'done' && !isModalOpen() && SRS.pickNext(scopeIds(state.scope), state.user.cards, Date.now())) nextCard();
  }, 15000);
}

function showForceStudyDone() {
  const fs = state.forceStudy;
  if (!fs) return showDashboard();
  state.view = 'forceDone';
  state.current = null;

  const results = fs.results || [];
  const total = results.length || fs.total;
  const correctCount = results.filter((r) => r.correct).length;
  const pct = total ? Math.round((correctCount / total) * 100) : 0;
  const improved = results.filter((r) => r.newIvl > r.oldIvl).length;

  mount(
    `<div class="card empty" style="padding:40px 24px">
      <span class="icon-tile violet lg">${icon('zap')}</span>
      <span class="badge badge-violet">${t('tag_forced_completed')}</span>
      <h2>${t('force_completed_title')}</h2>
      <p>${t('force_completed_desc', { total, scope: esc(scopeName(fs.scope)) })}</p>
      <div class="kpi-grid three" style="width:100%;max-width:560px;margin-top:12px;text-align:left">
        <div class="card kpi"><div class="kpi-label">${t('correct_label')}</div><div class="kpi-value" style="color:${pct >= 80 ? 'var(--ok-text)' : pct >= 60 ? 'var(--accent-text)' : 'var(--bad-text)'}">${correctCount}<span class="kpi-unit">/ ${total}</span></div><div class="kpi-sub">${pct}%</div></div>
        <div class="card kpi"><div class="kpi-label">${t('intervals_expanded')}</div><div class="kpi-value" style="color:var(--ok-text)">+${improved}</div></div>
        <div class="card kpi"><div class="kpi-label">${fs.reschedule ? t('srs_active_label') : t('srs_review_label')}</div><div class="kpi-value" style="font-size:1.1rem;color:var(--violet)">${fs.reschedule ? t('srs_active_sub') : t('srs_review_sub')}</div></div>
      </div>
      <div class="actions">
        <button class="btn btn-violet" id="fs-again">${icon('zap')}${t('btn_another_force')}</button>
        <button class="btn btn-primary" id="fs-home">${t('back_to_panel')}</button>
      </div>
    </div>`,
    { nav: 'dashboard', width: 'narrow' }
  );

  $app.querySelector('#fs-home').onclick = () => navigate('dashboard');
  $app.querySelector('#fs-again').onclick = () => openForceStudyModal(fs.scope);
}

// ---------------- Atajos de Teclado ----------------

document.addEventListener('keydown', (e) => {
  if (isModalOpen()) {
    if (e.key === 'Escape') closeModal();
    return;
  }
  const tag = e.target.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  // Un botón con foco ya responde a Enter/Espacio de forma nativa.
  if ((k === 'enter' || k === ' ') && tag === 'BUTTON') return;
  const optionPos = () => {
    let pos = '123456'.indexOf(k);
    if (pos < 0) pos = 'abcdef'.indexOf(k);
    return pos;
  };

  if (state.view === 'test' && state.testMode) {
    const tm = state.testMode;
    const q = tm.questions[tm.currentIndex];
    if (tm.currentPicked === null) {
      if (k === 'enter' && isMulti(q)) {
        e.preventDefault();
        return checkTestMulti();
      }
      const pos = optionPos();
      if (pos >= 0 && pos < tm.currentOrder.length) pickTestOption(tm.currentOrder[pos]);
      return;
    }
    if (k === ' ' || k === 'enter') {
      e.preventDefault();
      nextTestQuestion();
    }
    return;
  }

  if (state.view !== 'study' || !state.current) return;
  const cur = state.current;
  if (cur.picked === null) {
    if (k === 'enter') {
      e.preventDefault();
      return checkMulti();
    }
    const pos = optionPos();
    if (pos >= 0 && pos < cur.order.length) answer(cur.order[pos]);
    return;
  }
  const noReschedule = state.practice || (state.forceStudy && state.forceStudy.active && !state.forceStudy.reschedule);
  if (noReschedule || !cur.correct) {
    if (k === ' ' || k === 'enter' || k === '1') {
      e.preventDefault();
      rate(cur.correct ? 'good' : 'again');
    }
    return;
  }
  const map = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy', ' ': 'good', enter: 'good' };
  if (map[k]) {
    e.preventDefault();
    rate(map[k]);
  }
});

// ---------------- Repintado al cambiar idioma / tema ----------------

function refreshCurrentView() {
  switch (state.view) {
    case 'users':
      return renderUsers();
    case 'dashboard':
      return showDashboard();
    case 'study':
      return state.current ? renderCard() : showDashboard();
    case 'done':
      return showDone();
    case 'forceDone':
      return showForceStudyDone();
    case 'test':
      return renderTestCard();
    case 'results':
      return showTestResults();
    case 'ranking':
      return state.rankingData ? renderRankingView() : showRanking();
    case 'stats':
      return renderStats();
    default:
      return state.user ? showDashboard() : showUsers();
  }
}
window.refreshCurrentView = refreshCurrentView;
window.onThemeChanged = () => {
  if (state.view === 'stats') renderStats();
};

// ---------------- Inicio ----------------

window.startStudy = startStudy;
window.startForceStudy = startForceStudy;
window.openForceStudyModal = openForceStudyModal;

state.view = 'loading';
$app.innerHTML = `${topbar(null)}<main class="page"><div class="container"><div class="empty"><p>${t('loading')}</p></div></div></main>`;
const saved = localStorage.getItem('lewis-quiz-user');
saved ? openUser(saved) : showUsers();
