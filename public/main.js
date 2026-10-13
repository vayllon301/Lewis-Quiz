// Interfaz: elegir usuario → panel de una asignatura (global + temas + historial) → sesión de estudio tipo Anki → ranking con nota esperada → modo test de examen.

const $app = document.getElementById('app');
const Q = Object.fromEntries(SUBJECTS.flatMap((s) => s.questions.map((q) => [q.id, q])));
const LETTERS = 'ABCDEF';
const RATING_LABEL = {
  get again() { return window.t ? window.t('rating_again') : 'Otra vez'; },
  get hard() { return window.t ? window.t('rating_hard') : 'Difícil'; },
  get good() { return window.t ? window.t('rating_good') : 'Bien'; },
  get easy() { return window.t ? window.t('rating_easy') : 'Fácil'; },
};

const state = {
  users: [],
  user: null, // { id, name, cards, log }
  subject: SUBJECTS.find((s) => s.id === localStorage.getItem('lewis-quiz-subject')) || SUBJECTS[0],
  scope: 'all', // 'all' o el id de un tema
  practice: false, // modo práctica: no cambia la programación
  current: null, // { id, order: [índices de opciones], sel: [marcadas antes de comprobar], picked, correct }
  lastId: null,
  timer: null,
  rankingScope: 'all', // 'all' o id de una asignatura
  rankingSort: 'score', // 'score', 'accuracy', 'coverage', 'mature', 'reviews'
  expandedUserId: null,
  cachedRanking: null,
  testMode: null, // estado de la sesión de test/examen
  forceStudy: null, // estado de la sesión forzada de estudio
};
window.state = state;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
// Enunciados: las líneas con columnas alineadas (dos o más espacios entre valores: tablas, matrices) van en monoespaciado.
const questionHtml = (s) => esc(s).replace(/(?:^.*\S {2,}\S.*(?:\n|$))+/gm, (m) => `<pre>${m.replace(/\n$/, '')}</pre>`);

async function call(method, url, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de conexión');
  return data;
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function stopTimer() {
  clearInterval(state.timer);
  state.timer = null;
}

const tSubjectName = (subjId) => {
  const s = SUBJECTS.find((sub) => sub.id === subjId);
  return s ? s.name : subjId;
};

const scopeIds = (scope) => {
  if (scope === 'all') return state.subject.questions.map((q) => q.id);
  if (scope === 'final-mock') return state.subject.questions.filter((q) => q.exam === 'final-mock').map((q) => q.id);
  return state.subject.questions.filter((q) => q.topic === scope).map((q) => q.id);
};

const topicName = (id) => {
  if (id === 'final-mock') return window.t ? window.t('final_mock_name') : 'Final Mock Exam';
  const tKey = `${state.subject.id}_t${id}`;
  if (window.I18N && window.I18N[currentLang] && window.I18N[currentLang][tKey]) {
    return window.I18N[currentLang][tKey];
  }
  const tObj = state.subject.topics.find((t) => t.id === id);
  return tObj ? tObj.name : String(id);
};

const scopeName = (scope) => {
  if (scope === 'all') return `${tSubjectName(state.subject.id)} · ${window.t ? window.t('all') : 'Todas'}`;
  if (scope === 'final-mock') return `${tSubjectName(state.subject.id)} · ${window.t ? window.t('final_mock_name') : 'Final Mock Exam'} (40 ${window.t ? window.t('questions') : 'preguntas'})`;
  return topicName(scope);
};

// Preguntas de respuesta múltiple: `answer` es un array y hay que marcar exactamente esas opciones.
const isMulti = (q) => Array.isArray(q.answer);
const isRight = (q, oi) => (isMulti(q) ? q.answer.includes(oi) : q.answer === oi);

function accuracy(entries) {
  if (!entries.length) return null;
  return Math.round((100 * entries.filter((e) => e.correct).length) / entries.length);
}

function timeAgo(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

// ---------------- Modelo de Métricas y Nota Esperada ----------------

function getGradeInfo(score) {
  const tFn = window.t || ((k) => k);
  if (score >= 9.0) return { text: tFn('grade_sobresaliente'), cls: 'badge-sobresaliente', color: '#f59e0b' };
  if (score >= 7.0) return { text: tFn('grade_notable'), cls: 'badge-notable', color: '#15803d' };
  if (score >= 5.0) return { text: tFn('grade_aprobado'), cls: 'badge-aprobado', color: '#2563eb' };
  return { text: tFn('grade_suspenso'), cls: 'badge-suspenso', color: '#b91c1c' };
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
    topicsBreakdown = subjectOrAll.topics.map((t) => {
      const tQuestions = subjectOrAll.questions.filter((q) => q.topic === t.id);
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
        id: t.id,
        name: t.name,
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
  let advice = '';
  if (coverage < 50) {
    advice = `Has visto el ${coverage}% del temario. Desbloquea las ${total - studied} preguntas restantes para poder aspirar a aprobar el examen.`;
  } else if (coverage < 100) {
    advice = `Llevas un ${coverage}% de cobertura. Te faltan ${total - studied} preguntas nuevas por estudiar para consolidar la materia.`;
  } else if (mature < total * 0.5) {
    advice = `¡Has cubierto el 100% de las preguntas! Ahora consolida las ${young + learning} tarjetas en repaso para convertir tu ${expectedScore}/10 en Sobresaliente.`;
  } else {
    advice = `¡Gran preparación! Tienes ${mature} tarjetas completamente dominadas (≥21 días) con un acierto del ${accuracyPct}%. Mantén los repasos periódicos.`;
  }

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
  state.user = null;
  state.testMode = null;
  try {
    state.users = await call('GET', '/api/users');
  } catch (e) {
    toast(e.message);
  }
  const tFn = window.t || ((k) => k);
  $app.innerHTML = `
    <div class="header row spread" style="flex-wrap:wrap;gap:10px">
      <div>
        <h1>🧠 ${tFn('app_title')}</h1>
        <div class="muted small">${SUBJECTS.map((s) => esc(s.name)).join(' · ')}</div>
      </div>
      <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
        ${window.renderTopControls ? window.renderTopControls() : ''}
        <button class="btn-ranking" id="public-ranking-btn">🏆 ${tFn('nav_ranking')}</button>
      </div>
    </div>
    <div class="card stack">
      <h2 style="margin-top:0">${tFn('choose_user_title')}</h2>
      <p class="muted small" style="margin-top:-6px;margin-bottom:8px">${tFn('choose_user_subtitle')}</p>
      ${state.users.length ? `<div class="users">${state.users.map((u) => `<button data-user="${u.id}">👤 ${esc(u.name)}</button>`).join('')}</div>` : `<p class="muted">${tFn('choose_user_subtitle')}</p>`}
      <form id="new-user" class="row" style="margin-top:16px">
        <input name="name" placeholder="${tFn('your_name')}" maxlength="40" required style="flex:1">
        <button class="primary">${tFn('start_btn')}</button>
      </form>
    </div>`;
  $app.querySelectorAll('[data-user]').forEach((b) => (b.onclick = () => openUser(b.dataset.user)));
  const pubRank = $app.querySelector('#public-ranking-btn');
  if (pubRank) pubRank.onclick = () => showRanking();
  $app.querySelector('#new-user').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const u = await call('POST', '/api/users', { name: e.target.name.value });
      openUser(u.id);
    } catch (err) {
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
  const tFn = window.t || ((k) => k);
  return `<div class="counts">
    <span class="n-new" title="${tFn('never_seen')}">${c.new} ${tFn('new_label')}</span>
    <span class="n-learn" title="${tFn('in_learning')}">${c.dueLearn} ${tFn('learning_label')}</span>
    <span class="n-review" title="${tFn('due_reviews')}">${c.dueReview} ${tFn('review_label')}</span>
  </div>`;
}

function barHtml(c) {
  const pct = (n) => (100 * n) / c.total;
  const tFn = window.t || ((k) => k);
  return `<div class="bar" title="${tFn('bar_legend')}">
    <span style="width:${pct(c.mature)}%;background:var(--review)"></span>
    <span style="width:${pct(c.young)}%;background:color-mix(in srgb, var(--review) 45%, transparent)"></span>
    <span style="width:${pct(c.learning)}%;background:var(--learn)"></span>
  </div>`;
}

function showDashboard() {
  stopTimer();
  state.testMode = null;
  const { user, subject } = state;
  const now = Date.now();
  const all = SRS.counts(scopeIds('all'), user.cards, now);
  const log = user.log.filter((e) => Q[e.qid] && subject.questions.includes(Q[e.qid]));
  const midnight = new Date().setHours(0, 0, 0, 0);
  const today = log.filter((e) => e.t >= midnight);
  const acc = accuracy(log);

  const tFn = window.t || ((k, p) => k);
  // Métricas del usuario actual para la asignatura activa
  const metrics = calcUserMetrics(user, subject);

  const topicRows = subject.topics
    .map((t) => {
      const c = SRS.counts(scopeIds(t.id), user.cards, now);
      const a = accuracy(log.filter((e) => Q[e.qid]?.topic === t.id));
      return `<div class="card topic">
      <div class="info">
        <div class="name">${esc(topicName(t.id))}</div>
        <div class="row spread small"><span class="muted">${c.total} ${tFn('questions')}${a !== null ? ` · ${a}% ${tFn('accuracy').toLowerCase()}` : ''}</span></div>
        ${countsHtml(c)}
        ${barHtml(c)}
      </div>
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <button class="btn-force-study-outline" data-force-study="${t.id}" title="${tFn('force')}">${tFn('force')}</button>
        <button class="btn-test-outline" data-test="${t.id}" title="${tFn('test')}">${tFn('test')}</button>
        <button class="primary" data-scope="${t.id}">${tFn('study')}</button>
      </div>
    </div>`;
    })
    .join('');

  // Preguntas más falladas
  const fails = {};
  for (const e of log) if (!e.correct) fails[e.qid] = (fails[e.qid] || 0) + 1;
  const worst = Object.entries(fails)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const recent = log.slice(-15).reverse();

  $app.innerHTML = `
    <div class="header row spread" style="flex-wrap:wrap;gap:10px">
      <div><h1>🧠 ${tFn('app_title')}</h1><div class="muted small">${esc(tSubjectName(subject.id))}</div></div>
      <div class="row" style="flex-wrap:wrap;gap:8px;align-items:center">
        ${window.renderTopControls ? window.renderTopControls() : ''}
        <button class="btn-ranking" id="btn-stats">📊 ${tFn('nav_stats')}</button>
        <button class="btn-ranking" id="btn-ranking">🏆 ${tFn('nav_ranking')}</button>
        <span>👤 <b>${esc(user.name)}</b></span>
        <button class="link" id="switch">${tFn('nav_switch')}</button>
      </div>
    </div>
    ${
      SUBJECTS.length > 1
        ? `<div class="tabs">${SUBJECTS.map((s) => `<button data-subject="${s.id}" class="${s === subject ? 'active' : ''}">${esc(s.name)}</button>`).join('')}</div>`
        : ''
    }

    <!-- Banner de Nota Esperada y Ranking -->
    <div class="user-rank-banner" id="banner-ranking" title="${tFn('view_ranking_btn')}">
      <div class="left">
        <div class="rank-badge">🏆</div>
        <div>
          <div style="font-weight:700">${tFn('expected_grade_banner')} <span style="font-size:1.15rem;color:${metrics.grade.color}">${metrics.expectedScore} / 10</span>
            <span class="badge-grade ${metrics.grade.cls}">${metrics.grade.text}</span>
          </div>
          <div class="small muted" style="margin-top:2px">
            ${tFn('expected_grade_sub', {
              cov: metrics.coverage,
              seen: metrics.studied,
              total: metrics.total,
              acc: metrics.accuracyPct !== null ? metrics.accuracyPct : '–'
            })}
          </div>
          <div class="score-meter" style="max-width:260px;margin-top:6px">
            <div class="score-meter-fill" style="width:${Math.min(100, metrics.expectedScore * 10)}%;background:${metrics.grade.color}"></div>
          </div>
        </div>
      </div>
      <button class="primary" style="padding:6px 12px;font-size:.88rem">${tFn('view_ranking_btn')}</button>
    </div>

    <!-- Destacado: Modo Test de Examen con Nota Final -->
    <div class="card" style="margin-bottom:18px;border-left:5px solid #059669;background:color-mix(in srgb, #059669 6%, var(--card))">
      <div class="row spread" style="align-items:center;flex-wrap:wrap;gap:12px">
        <div style="flex:1;min-width:240px">
          <div style="font-weight:700;font-size:1.06rem;color:var(--text)">${tFn('test_sim_title')}</div>
          <div class="muted small" style="margin-top:2px">
            ${tFn('test_sim_desc', { total: all.total })}
          </div>
        </div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          ${
            subject.exams && subject.exams.some((e) => e.id === 'final-mock')
              ? `<button class="btn-test" data-test="final-mock" style="background:#4338ca;border-color:#4338ca" title="${tFn('final_mock_desc')}">
            ${tFn('btn_final_mock')}
          </button>`
              : ''
          }
          <button class="btn-test" id="btn-quick-full-test" title="${tFn('btn_test_all', { total: all.total })}">
            ${tFn('btn_test_all', { total: all.total })}
          </button>
          <button class="btn-test-outline" id="btn-custom-test" title="${tFn('btn_custom_test')}">
            ${tFn('btn_custom_test')}
          </button>
        </div>
      </div>
    </div>

    <!-- Bloque Global -->
    <div class="card">
      <div class="row spread" style="align-items:flex-start">
        <div style="flex:1">
          <div class="name"><b>${tFn('global_title')}</b> <span class="muted small">· ${tFn('global_desc', { total: all.total, subject: esc(tSubjectName(subject.id)) })}</span></div>
          ${countsHtml(all)}
          ${barHtml(all)}
        </div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <button class="btn-force-study-outline" data-force-study="all" title="${tFn('force_session')}">${tFn('force_session')}</button>
          <button class="btn-test" data-test="all" title="${tFn('test')}">${tFn('test')}</button>
          <button class="primary" data-scope="all" title="${tFn('study')}">${tFn('study')}</button>
        </div>
      </div>
    </div>

    ${
      subject.exams && subject.exams.length
        ? `<h2>${tFn('exams_section_title')}</h2>
    <div class="stack">
      ${subject.exams
        .map((ex) => {
          const c = SRS.counts(scopeIds(ex.id), user.cards, now);
          const a = accuracy(log.filter((e) => Q[e.qid]?.exam === ex.id));
          return `<div class="card topic" style="border-left:5px solid var(--accent);background:color-mix(in srgb, var(--accent) 4%, var(--card))">
        <div class="info">
          <div class="name">🎓 <b>${esc(ex.id === 'final-mock' ? tFn('final_mock_name') : ex.name)}</b> <span class="tag" style="background:var(--accent-soft);color:var(--accent);font-weight:700">${ex.count} ${tFn('questions')}</span></div>
          <div class="row spread small" style="margin-top:2px"><span class="muted">${esc(ex.id === 'final-mock' ? tFn('final_mock_desc') : (ex.description || ex.title))}${a !== null ? ` · ${a}% ${tFn('historic_accuracy')}` : ''}</span></div>
          ${countsHtml(c)}
          ${barHtml(c)}
        </div>
        <div class="row" style="gap:6px;flex-wrap:wrap">
          <button class="btn-force-study-outline" data-force-study="${ex.id}" title="${tFn('force')}">${tFn('force')}</button>
          <button class="btn-test" data-test="${ex.id}" title="${tFn('exam')}">${tFn('exam')}</button>
          <button class="primary" data-scope="${ex.id}" title="${tFn('study')}">${tFn('study')}</button>
        </div>
      </div>`;
        })
        .join('')}
    </div>`
        : ''
    }

    <h2>${tFn('topics_section_title')}</h2>
    <div class="stack">${topicRows}</div>

    <h2>${tFn('history_section_title')}</h2>
    <div class="stats">
      <div class="card stat"><b>${log.length}</b><span class="muted small">${tFn('answers')}</span></div>
      <div class="card stat"><b>${acc === null ? '–' : acc + '%'}</b><span class="muted small">${tFn('overall_accuracy')}</span></div>
      <div class="card stat"><b>${today.length}</b><span class="muted small">${tFn('today')}</span></div>
    </div>
    ${
      worst.length
        ? `<div class="card" style="margin-top:10px"><b>${tFn('most_missed_title')}</b><ul class="list small" style="margin-top:6px">
      ${worst.map(([id, n]) => `<li><span class="bad">✗${n}</span><span class="q" title="${esc(Q[id].q)}">${esc(Q[id].q)}</span><span class="muted">T${Q[id].topic}</span></li>`).join('')}
    </ul></div>`
        : ''
    }
    ${
      recent.length
        ? `<div class="card" style="margin-top:10px"><b>${tFn('recent_answers_title')}</b><ul class="list small" style="margin-top:6px">
      ${recent.map((e) => `<li><span class="${e.correct ? 'ok' : 'bad'}">${e.correct ? '✓' : '✗'}</span><span class="q" title="${esc(Q[e.qid].q)}">${esc(Q[e.qid].q)}</span><span class="muted">${e.practice ? tFn('practice_label') : RATING_LABEL[e.rating]} · ${timeAgo(e.t)}</span></li>`).join('')}
    </ul></div>`
        : `<p class="muted small">${tFn('no_answers_yet')}</p>`
    }

    <details class="small muted" style="margin-top:24px">
      <summary>${tFn('faq_summary')}</summary>
      <p>${tFn('faq_p1')}</p>
      <p>${tFn('faq_p2')}</p>
    </details>
    <div class="row" style="margin-top:10px">
      <button class="link small" id="reset">${tFn('reset_progress')}</button>
      <button class="link small" id="delete">${tFn('delete_user')}</button>
    </div>`;

  $app.querySelectorAll('[data-subject]').forEach((b) => {
    b.onclick = () => {
      state.subject = SUBJECTS.find((s) => s.id === b.dataset.subject);
      localStorage.setItem('lewis-quiz-subject', state.subject.id);
      showDashboard();
    };
  });

  const parseScope = (val) => (val === 'all' || isNaN(val) ? val : Number(val));

  $app.querySelectorAll('[data-scope]').forEach((b) => {
    b.onclick = () => startStudy(parseScope(b.dataset.scope));
  });

  $app.querySelectorAll('[data-force-study]').forEach((b) => {
    b.onclick = () => openForceStudyModal(parseScope(b.dataset.forceStudy));
  });

  // Botones de Modo Test
  $app.querySelectorAll('[data-test]').forEach((b) => {
    b.onclick = () => openTestModal(parseScope(b.dataset.test));
  });

  const btnQuickFull = $app.querySelector('#btn-quick-full-test');
  if (btnQuickFull) {
    btnQuickFull.onclick = () => {
      const totalAvailable = state.subject.questions.length;
      startTest('all', totalAvailable, true, true);
    };
  }

  const btnCustom = $app.querySelector('#btn-custom-test');
  if (btnCustom) {
    btnCustom.onclick = () => openTestModal('all');
  }

  $app.querySelector('#btn-stats').onclick = () => showStats();
  $app.querySelector('#btn-ranking').onclick = () => showRanking();
  $app.querySelector('#banner-ranking').onclick = () => showRanking();
  $app.querySelector('#switch').onclick = () => {
    localStorage.removeItem('lewis-quiz-user');
    showUsers();
  };
  $app.querySelector('#reset').onclick = async () => {
    if (!confirm(`¿Borrar todo el progreso e historial de ${user.name}?`)) return;
    await call('POST', `/api/users/${user.id}/reset`).catch((e) => toast(e.message));
    openUser(user.id);
  };
  $app.querySelector('#delete').onclick = async () => {
    if (!confirm(`¿Borrar el usuario ${user.name} y todo su historial?`)) return;
    await call('DELETE', `/api/users/${user.id}`).catch((e) => toast(e.message));
    localStorage.removeItem('lewis-quiz-user');
    showUsers();
  };
}

// ---------------- Modal y Configuración de Sesión Forzada de Estudio ----------------

function openForceStudyModal(scope = 'all') {
  const ids = scopeIds(scope);
  const totalAvailable = ids.length;
  if (!totalAvailable) return toast('No hay preguntas disponibles en este ámbito.');

  const presets = [10, 20, 30, 50].filter((n) => n < totalAvailable);
  const defaultCount = presets[0] || totalAvailable;

  const existingBackdrop = document.querySelector('#force-study-modal-backdrop');
  if (existingBackdrop) existingBackdrop.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'force-study-modal-backdrop';
  backdrop.className = 'modal-backdrop';

  backdrop.innerHTML = `
    <div class="modal-card stack">
      <div class="row spread" style="align-items:flex-start">
        <div>
          <div class="row" style="gap:8px;align-items:center">
            <span style="font-size:1.35rem">⚡</span>
            <h2 style="margin:0;font-size:1.25rem">${(window.t || ((k)=>k))('force_modal_title')}</h2>
          </div>
          <div class="muted small" style="margin-top:2px">${esc(scopeName(scope))} · <b>${totalAvailable}</b> ${(window.t || ((k)=>k))('questions')}</div>
        </div>
        <button class="link" id="btn-close-force-modal" style="font-size:1.4rem;line-height:1;padding:0 4px">✕</button>
      </div>

      <p class="small muted" style="margin:6px 0 0;line-height:1.5">
        ${(window.t || ((k)=>k))('force_modal_sub')}
      </p>

      <div style="margin-top:14px">
        <label class="small muted" style="font-weight:700;display:block;margin-bottom:6px">${(window.t || ((k)=>k))('force_modal_how_many')}</label>
        <div class="chip-group">
          ${presets.map((p, i) => `<button class="chip-btn ${i === 0 ? 'active' : ''}" data-force-chip="${p}">${p} ${(window.t || ((k)=>k))('questions')}</button>`).join('')}
          <button class="chip-btn ${presets.length === 0 ? 'active' : ''}" data-force-chip="${totalAvailable}">⭐ ${(window.t || ((k)=>k))('all')} (${totalAvailable})</button>
        </div>
        
        <div class="row" style="margin-top:10px;gap:8px">
          <span class="small muted">${(window.t || ((k)=>k))('exact_number')}</span>
          <input type="number" id="force-count-input" min="1" max="${totalAvailable}" value="${defaultCount}" style="width:110px;font-weight:700;text-align:center">
          <span class="small muted">${(window.t || ((k, p)=>k))('of_total', { total: totalAvailable })}</span>
        </div>
      </div>

      <div style="margin-top:14px">
        <label class="small muted" style="font-weight:700;display:block;margin-bottom:6px">${(window.t || ((k)=>k))('force_modal_criteria')}</label>
        <div class="stack" style="gap:8px">
          <label class="row" style="cursor:pointer;gap:10px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card)">
            <input type="radio" name="force-strategy" value="due" checked>
            <div style="flex:1">
              <div style="font-weight:600;font-size:.9rem">🕒 ${(window.t || ((k)=>k))('force_modal_due_title')} <span class="tag" style="font-size:.7rem;margin-left:4px">${(window.t || ((k)=>k))('recommended')}</span></div>
              <div class="muted small">${(window.t || ((k)=>k))('force_modal_due_desc')}</div>
            </div>
          </label>
          <label class="row" style="cursor:pointer;gap:10px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card)">
            <input type="radio" name="force-strategy" value="hard">
            <div style="flex:1">
              <div style="font-weight:600;font-size:.9rem">🧠 ${(window.t || ((k)=>k))('force_modal_hard_title')}</div>
              <div class="muted small">${(window.t || ((k)=>k))('force_modal_hard_desc')}</div>
            </div>
          </label>
          <label class="row" style="cursor:pointer;gap:10px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card)">
            <input type="radio" name="force-strategy" value="random">
            <div style="flex:1">
              <div style="font-weight:600;font-size:.9rem">🎲 ${(window.t || ((k)=>k))('force_modal_random_title')}</div>
              <div class="muted small">${(window.t || ((k)=>k))('force_modal_random_desc')}</div>
            </div>
          </label>
        </div>
      </div>

      <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:14px" class="stack">
        <label class="row" style="cursor:pointer;gap:10px;align-items:flex-start">
          <input type="checkbox" id="force-reschedule-cb" checked style="margin-top:3px">
          <div class="small">
            <b>${(window.t || ((k)=>k))('force_modal_resched_title')}</b>
            <div class="muted" style="margin-top:2px">${(window.t || ((k)=>k))('force_modal_resched_desc')}</div>
          </div>
        </label>
      </div>

      <div class="row spread" style="margin-top:18px">
        <button class="link" id="btn-cancel-force-modal">${(window.t || ((k)=>k))('cancel')}</button>
        <button class="btn-force-study" id="btn-start-force-study-run" style="padding:10px 22px;font-size:1rem">
          ⚡ ${(window.t || ((k)=>k))('force_modal_start')}
        </button>
      </div>
    </div>`;

  document.body.appendChild(backdrop);

  const inputEl = backdrop.querySelector('#force-count-input');
  const chipBtns = backdrop.querySelectorAll('[data-force-chip]');

  const syncActiveChip = (val) => {
    chipBtns.forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.forceChip) === val);
    });
  };

  chipBtns.forEach((btn) => {
    btn.onclick = () => {
      const val = Number(btn.dataset.forceChip);
      inputEl.value = val;
      syncActiveChip(val);
    };
  });

  inputEl.oninput = () => {
    let val = Number(inputEl.value);
    if (val > totalAvailable) val = totalAvailable;
    if (val < 1) val = 1;
    syncActiveChip(val);
  };

  const closeModal = () => backdrop.remove();
  backdrop.querySelector('#btn-close-force-modal').onclick = closeModal;
  backdrop.querySelector('#btn-cancel-force-modal').onclick = closeModal;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal();
  };

  backdrop.querySelector('#btn-start-force-study-run').onclick = () => {
    let count = Math.min(totalAvailable, Math.max(1, Number(inputEl.value) || totalAvailable));
    const strategyRadio = backdrop.querySelector('input[name="force-strategy"]:checked');
    const strategy = strategyRadio ? strategyRadio.value : 'due';
    const reschedule = backdrop.querySelector('#force-reschedule-cb').checked;
    closeModal();
    startForceStudy(scope, count, strategy, reschedule);
  };
}

function startForceStudy(scope, count, strategy = 'due', reschedule = true) {
  stopTimer();
  state.scope = scope;
  state.practice = false;
  state.testMode = null;
  state.lastId = null;

  const ids = scopeIds(scope);
  if (!ids.length) return toast('No hay preguntas disponibles en este ámbito.');

  const log = (state.user && state.user.log) ? state.user.log : [];
  const cardIds = SRS.getForcedQueue(ids, state.user.cards, count, strategy, log);

  if (!cardIds.length) return toast('No se encontraron preguntas para la sesión.');

  state.forceStudy = {
    active: true,
    scope,
    strategy,
    reschedule: !!reschedule,
    cardIds,
    currentIndex: 0,
    total: cardIds.length,
    results: [],
  };

  nextCard();
}

// ---------------- Modal y Configuración del Modo Test ----------------

function openTestModal(scope = 'all') {
  const ids = scopeIds(scope);
  const totalAvailable = ids.length;
  if (!totalAvailable) return toast('No hay preguntas disponibles en este ámbito.');

  const isFinalMock = scope === 'final-mock';
  // Determinar opciones de preset recomendadas
  const presets = isFinalMock
    ? [10, 20, 30].filter((n) => n < totalAvailable)
    : [10, 20, 30, 50].filter((n) => n < totalAvailable);

  const existingBackdrop = document.querySelector('#test-modal-backdrop');
  if (existingBackdrop) existingBackdrop.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'test-modal-backdrop';
  backdrop.className = 'modal-backdrop';

  backdrop.innerHTML = `
    <div class="modal-card stack">
      <div class="row spread" style="align-items:flex-start">
        <div>
          <h2 style="margin:0;font-size:1.25rem">${isFinalMock ? '🎓 ' + (window.t || ((k)=>k))('final_mock_name') : '📝 ' + (window.t || ((k)=>k))('test')}</h2>
          <div class="muted small" style="margin-top:2px">${esc(isFinalMock ? 'DATA 51000 Practice Final Exam' : scopeName(scope))} · <b>${totalAvailable}</b> ${(window.t || ((k)=>k))('questions')}</div>
        </div>
        <button class="link" id="btn-close-modal" style="font-size:1.4rem;line-height:1;padding:0 4px">✕</button>
      </div>

      <div style="margin-top:14px">
        <label class="small muted" style="font-weight:700;display:block;margin-bottom:6px">${(window.t || ((k)=>k))('test_modal_how_many')}</label>
        <div class="chip-group">
          <button class="chip-btn active" data-chip="${totalAvailable}">${isFinalMock ? `⭐ ${(window.t || ((k)=>k))('all')} (${totalAvailable})` : `⭐ ${(window.t || ((k)=>k))('all')} (${totalAvailable})`}</button>
          ${presets.map((p) => `<button class="chip-btn" data-chip="${p}">${p} ${(window.t || ((k)=>k))('questions')}</button>`).join('')}
        </div>
        
        <div class="row" style="margin-top:10px;gap:8px">
          <span class="small muted">${(window.t || ((k)=>k))('exact_number')}</span>
          <input type="number" id="test-count-input" min="1" max="${totalAvailable}" value="${totalAvailable}" style="width:110px;font-weight:700;text-align:center">
          <span class="small muted">${(window.t || ((k, p)=>k))('of_total', { total: totalAvailable })}</span>
        </div>
      </div>

      <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:14px" class="stack">
        <label class="row" style="cursor:pointer;gap:10px">
          <input type="checkbox" id="test-immediate-cb" checked>
          <span class="small"><b>${(window.t || ((k)=>k))('test_modal_immediate_title')}</b> ${(window.t || ((k)=>k))('test_modal_immediate_desc')}</span>
        </label>
        <label class="row" style="cursor:pointer;gap:10px">
          <input type="checkbox" id="test-shuffle-cb" checked>
          <span class="small"><b>${(window.t || ((k)=>k))('test_modal_shuffle_title')}</b> ${(window.t || ((k)=>k))('test_modal_shuffle_desc')}</span>
        </label>
      </div>

      <div class="row spread" style="margin-top:18px">
        <button class="link" id="btn-cancel-modal">${(window.t || ((k)=>k))('cancel')}</button>
        <button class="btn-test" id="btn-start-test-run" style="padding:10px 22px;font-size:1rem">
          🚀 ${(window.t || ((k)=>k))('test_modal_start')}
        </button>
      </div>
    </div>`;

  document.body.appendChild(backdrop);

  const inputEl = backdrop.querySelector('#test-count-input');
  const chipBtns = backdrop.querySelectorAll('[data-chip]');

  const syncActiveChip = (val) => {
    chipBtns.forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.chip) === val);
    });
  };

  chipBtns.forEach((btn) => {
    btn.onclick = () => {
      const val = Number(btn.dataset.chip);
      inputEl.value = val;
      syncActiveChip(val);
    };
  });

  inputEl.oninput = () => {
    let val = Number(inputEl.value);
    if (val > totalAvailable) val = totalAvailable;
    if (val < 1) val = 1;
    syncActiveChip(val);
  };

  const closeModal = () => backdrop.remove();
  backdrop.querySelector('#btn-close-modal').onclick = closeModal;
  backdrop.querySelector('#btn-cancel-modal').onclick = closeModal;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal();
  };

  backdrop.querySelector('#btn-start-test-run').onclick = () => {
    let count = Math.min(totalAvailable, Math.max(1, Number(inputEl.value) || totalAvailable));
    const immediate = backdrop.querySelector('#test-immediate-cb').checked;
    const shuffle = backdrop.querySelector('#test-shuffle-cb').checked;
    closeModal();
    startTest(scope, count, immediate, shuffle);
  };
}

// ---------------- Ejecución de la Sesión de Test ----------------

function startTest(scope, count, immediateFeedback = true, shuffle = true) {
  stopTimer();
  const ids = scopeIds(scope);
  if (!ids.length) return toast('No hay preguntas disponibles.');

  let pool = ids.map((id) => Q[id]);
  if (shuffle) {
    pool = [...pool];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  } else {
    pool = [...pool].sort((a, b) => (a.examOrder || 999) - (b.examOrder || 999));
  }

  const selectedQuestions = pool.slice(0, Math.min(count, pool.length));

  state.testMode = {
    active: true,
    scope,
    questions: selectedQuestions,
    total: selectedQuestions.length,
    currentIndex: 0,
    immediateFeedback: !!immediateFeedback,
    answers: [], // { qid, picked, correct, order }
    currentOrder: shuffledOrder(selectedQuestions[0]),
    currentSel: [],
    currentPicked: null,
    currentCorrect: null,
    startTime: Date.now(),
    endTime: null,
    filterReview: 'all',
  };

  renderTestCard();
}

function renderTestCard() {
  const tm = state.testMode;
  if (!tm || !tm.active) return showDashboard();

  const q = tm.questions[tm.currentIndex];
  const answered = tm.currentPicked !== null;
  const multi = isMulti(q);
  const correctCount = tm.answers.filter((a) => a.correct).length;

  const progressPct = ((tm.currentIndex + (answered ? 1 : 0)) / tm.total) * 100;

  const optionsHtml = tm.currentOrder
    .map((oi, pos) => {
      let cls = 'option';
      if (answered) {
        if (tm.immediateFeedback) {
          if (isRight(q, oi)) cls += multi && !tm.currentPicked.includes(oi) ? ' correct missed' : ' correct';
          else if ([].concat(tm.currentPicked).includes(oi)) cls += ' wrong';
          else cls += ' dim';
        } else {
          if ([].concat(tm.currentPicked).includes(oi)) cls += ' selected';
        }
      } else if (tm.currentSel.includes(oi)) {
        cls += ' selected';
      }

      return `<button class="${cls}" data-test-opt="${oi}" ${answered ? 'disabled' : ''}>
      <span class="letter">${LETTERS[pos]}</span><span>${esc(q.options[oi])}</span></button>`;
    })
    .join('');

  const tFn = window.t || ((k, p) => k);
  let feedbackHtml = '';
  if (answered) {
    if (tm.immediateFeedback) {
      feedbackHtml = `
        <div class="feedback ${tm.currentCorrect ? 'ok' : 'bad'}" style="margin-top:14px">
          <b class="${tm.currentCorrect ? 'ok' : 'bad'}">
            ${tm.currentCorrect ? '✓ ' + tFn('feedback_correct') : `✗ ${tFn('feedback_incorrect')} ${[].concat(q.answer).map((i) => esc(q.options[i])).join(' · ')}`}
          </b>
          ${q.explain ? `<p>${rich(q.explain)}</p>` : ''}
        </div>`;
    }

    const isLast = tm.currentIndex + 1 === tm.total;
    feedbackHtml += `
      <div class="grades one" style="margin-top:14px">
        <button class="primary ${isLast ? 'btn-test' : ''}" id="test-btn-next" style="padding:12px;font-size:1.05rem">
          ${isLast ? tFn('test_finish_btn') : tFn('test_next_btn', { cur: tm.currentIndex + 2, total: tm.total })}
        </button>
      </div>`;
  }

  $app.innerHTML = `
    <!-- Barra superior de navegación del test -->
    <div class="row spread header" style="flex-wrap:wrap;gap:10px">
      <button class="link" id="test-btn-exit">${tFn('exit_test_btn')}</button>
      <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
        ${window.renderTopControls ? window.renderTopControls() : ''}
        <span class="tag">📝 ${tFn('test')} · ${esc(tm.scope === 'all' ? tFn('global_title') : (tm.scope === 'final-mock' ? tFn('final_mock_name') : topicName(tm.scope)))}</span>
        <span class="tag" style="background:var(--card);border:1px solid var(--line);color:var(--text)">
          ${tFn('question_counter', { cur: tm.currentIndex + 1, total: tm.total })}
        </span>
      </div>
      ${
        tm.immediateFeedback && tm.answers.length > 0
          ? `<div class="small" title="${tFn('accuracy')}">
              <span class="ok" style="font-weight:700">✓ ${correctCount}</span> / <span class="muted">${tm.answers.length}</span>
            </div>`
          : '<div style="width:40px"></div>'
      }
    </div>

    <!-- Barra de progreso visual -->
    <div class="test-progress-bar">
      <div class="test-progress-fill" style="width:${progressPct}%"></div>
    </div>

    <!-- Tarjeta de Pregunta -->
    <div class="card">
      <div class="row spread small muted" style="margin-bottom:8px">
        <span>${window.currentLang === 'es' ? 'Tema ' : 'Topic '}${q.topic}: ${esc(topicName(q.topic))}</span>
        <span>${tFn('question')} #${tm.currentIndex + 1}</span>
      </div>

      <div class="question">${questionHtml(q.q)}</div>
      ${multi ? `<div class="muted small multi-hint">${tFn('multi_hint')}</div>` : ''}
      
      <div class="options">${optionsHtml}</div>

      ${multi && !answered ? `<div class="grades one" style="margin-top:14px"><button class="primary" id="test-check-multi" ${tm.currentSel.length ? '' : 'disabled'}>${tFn('check_btn')}</button></div>` : ''}

      ${feedbackHtml}
    </div>

    <div class="kbd">
      ${
        answered
          ? tFn('kbd_continue')
          : multi
          ? tFn('kbd_multi', { max: tm.currentOrder.length })
          : tFn('kbd_single', { max: tm.currentOrder.length, letters: LETTERS.slice(0, tm.currentOrder.length).split('').join('/') })
      }
    </div>`;

  // Listeners
  $app.querySelector('#test-btn-exit').onclick = () => {
    if (tm.answers.length > 0) {
      if (!confirm('¿Seguro que quieres salir del test? Tu progreso de esta tanda se perderá.')) return;
    }
    state.testMode = null;
    showDashboard();
  };

  $app.querySelectorAll('[data-test-opt]').forEach((b) => {
    b.onclick = () => {
      const oi = Number(b.dataset.testOpt);
      if (multi) {
        tm.currentSel = tm.currentSel.includes(oi) ? tm.currentSel.filter((i) => i !== oi) : [...tm.currentSel, oi];
        renderTestCard();
      } else {
        answerTest(oi);
      }
    };
  });

  const checkBtn = $app.querySelector('#test-check-multi');
  if (checkBtn) checkBtn.onclick = checkTestMulti;

  const nextBtn = $app.querySelector('#test-btn-next');
  if (nextBtn) nextBtn.onclick = nextTestQuestion;
}

function answerTest(optIndex) {
  const tm = state.testMode;
  if (!tm || tm.currentPicked !== null) return;

  const q = tm.questions[tm.currentIndex];
  const correct = optIndex === q.answer;

  tm.currentPicked = optIndex;
  tm.currentCorrect = correct;

  tm.answers.push({
    qid: q.id,
    picked: optIndex,
    correct,
    order: tm.currentOrder,
  });

  // Registrar en historial del usuario (modo práctica, no altera Anki pero computa acierto e historial)
  if (state.user) {
    state.user.log.push({ t: Date.now(), qid: q.id, rating: correct ? 'good' : 'again', correct, practice: true });
    call('POST', `/api/users/${state.user.id}/review`, {
      qid: q.id,
      rating: correct ? 'good' : 'again',
      correct,
      practice: true,
    }).catch(() => {});
  }

  renderTestCard();
}

function checkTestMulti() {
  const tm = state.testMode;
  if (!tm || tm.currentPicked !== null || !tm.currentSel.length) return;

  const q = tm.questions[tm.currentIndex];
  const correct = tm.currentSel.length === q.answer.length && tm.currentSel.every((i) => q.answer.includes(i));

  tm.currentPicked = [...tm.currentSel];
  tm.currentCorrect = correct;

  tm.answers.push({
    qid: q.id,
    picked: tm.currentPicked,
    correct,
    order: tm.currentOrder,
  });

  if (state.user) {
    state.user.log.push({ t: Date.now(), qid: q.id, rating: correct ? 'good' : 'again', correct, practice: true });
    call('POST', `/api/users/${state.user.id}/review`, {
      qid: q.id,
      rating: correct ? 'good' : 'again',
      correct,
      practice: true,
    }).catch(() => {});
  }

  renderTestCard();
}

function nextTestQuestion() {
  const tm = state.testMode;
  if (!tm) return;

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

// ---------------- Pantalla de Resultados y Nota Final ----------------

function showTestResults() {
  const tm = state.testMode;
  if (!tm) return showDashboard();

  const total = tm.questions.length;
  const correctCount = tm.answers.filter((a) => a.correct).length;
  const wrongCount = total - correctCount;
  const accuracyPct = Math.round((correctCount / total) * 100);

  // Escala académica española (0.0 a 10.0)
  const rawScore = (correctCount / total) * 10;
  const score = Math.round(rawScore * 10) / 10;
  const grade = getGradeInfo(score);

  const elapsedMs = Math.max(1000, (tm.endTime || Date.now()) - tm.startTime);
  const totalSeconds = Math.round(elapsedMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const durationText = mins > 0 ? `${mins} min ${secs} s` : `${secs} s`;
  const avgPerQuestion = Math.round(totalSeconds / total);

  // Desglose por temas tocados en este test
  const topicStats = {};
  tm.questions.forEach((q, idx) => {
    if (!topicStats[q.topic]) {
      topicStats[q.topic] = { id: q.topic, name: topicName(q.topic), total: 0, correct: 0 };
    }
    topicStats[q.topic].total++;
    if (tm.answers[idx]?.correct) {
      topicStats[q.topic].correct++;
    }
  });

  const topicsList = Object.values(topicStats);

  // Filtrado de revisión de preguntas
  const filter = tm.filterReview || 'all';
  const displayedIndices = tm.questions
    .map((_, i) => i)
    .filter((i) => {
      const a = tm.answers[i];
      if (filter === 'wrong') return !a?.correct;
      if (filter === 'correct') return !!a?.correct;
      return true;
    });

  const reviewQuestionsHtml = displayedIndices
    .map((idx) => {
      const q = tm.questions[idx];
      const a = tm.answers[idx];
      const isCorrect = a ? a.correct : false;
      const pickedArray = [].concat(a ? a.picked : []);
      const rightArray = [].concat(q.answer);

      const optionsReview = q.options
        .map((optText, oi) => {
          const isUserPicked = pickedArray.includes(oi);
          const isRightOpt = rightArray.includes(oi);

          let optCls = 'test-review-opt';
          let tagBadge = '';

          if (isRightOpt) {
            optCls += ' opt-correct';
            tagBadge = '<span class="ok" style="font-weight:700">✓ Correcta</span>';
          }
          if (isUserPicked && !isRightOpt) {
            optCls += ' opt-wrong';
            tagBadge = '<span class="bad" style="font-weight:700">✗ Tu respuesta</span>';
          } else if (isUserPicked && isRightOpt) {
            tagBadge += ' <span class="ok" style="font-size:.8rem;font-weight:700">(Tuya)</span>';
          }

          return `
          <div class="${optCls}">
            <span style="font-weight:700;color:var(--muted);min-width:1.2em">${LETTERS[oi]})</span>
            <span style="flex:1">${esc(optText)}</span>
            ${tagBadge}
          </div>`;
        })
        .join('');

      return `
      <div class="test-review-item ${isCorrect ? 'is-correct' : 'is-wrong'}">
        <div class="row spread small" style="margin-bottom:6px">
          <div class="row" style="gap:8px">
            <span class="${isCorrect ? 'ok' : 'bad'}" style="font-weight:800;font-size:.95rem">
              ${isCorrect ? '✓ Acierto' : '✗ Fallo'}
            </span>
            <span class="muted">Pregunta #${idx + 1} · Tema ${q.topic}</span>
          </div>
        </div>
        
        <div style="font-weight:600;margin-bottom:8px">${questionHtml(q.q)}</div>

        <div class="test-review-options">${optionsReview}</div>

        ${q.explain ? `<div class="small muted" style="margin-top:10px;padding:8px 10px;background:var(--card);border:1px solid var(--line);border-radius:8px">💡 <b>Explicación:</b> ${rich(q.explain)}</div>` : ''}
      </div>`;
    })
    .join('');

  const tFn = window.t || ((k, p) => k);
  $app.innerHTML = `
    <div class="header row spread" style="flex-wrap:wrap;gap:10px">
      <div>
        <h1>🏁 ${tFn('test_results_title')}</h1>
        <div class="muted small">${esc(scopeName(tm.scope))} · ${tFn('questions_evaluated', { total })}</div>
      </div>
      <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
        ${window.renderTopControls ? window.renderTopControls() : ''}
        <button class="link" id="btn-results-back">${tFn('back_to_panel')}</button>
      </div>
    </div>

    <!-- Hero Card con la Nota Final -->
    <div class="card test-hero-card" style="border-top-color:${grade.color}">
      <div style="font-size:2.6rem;line-height:1;margin-bottom:6px">
        ${score >= 9 ? '👑 🥇' : score >= 7 ? '👏 🎯' : score >= 5 ? '👍 📚' : '⚠️ 📖'}
      </div>
      <div class="muted small" style="text-transform:uppercase;font-weight:700;letter-spacing:.04em">
        ${tm.scope === 'final-mock' ? tFn('final_mock_name') : tFn('your_final_grade')}
      </div>
      <div class="test-hero-score" style="color:${grade.color}">
        ${score}<span style="font-size:1.5rem;font-weight:600;color:var(--muted)"> / 10</span>
        ${
          tm.scope === 'final-mock' || (tm.total === 40 && tm.questions.every((q) => q.exam === 'final-mock'))
            ? `<div style="font-size:1.15rem;font-weight:700;color:var(--muted);margin-top:4px">
                 ${tFn('points')}: <b style="color:${grade.color}">${correctCount}</b> / ${total} ${tFn('points')} (${tFn('points_each')})
               </div>`
            : ''
        }
      </div>
      <div><span class="badge-grade ${grade.cls}" style="font-size:.9rem;padding:4px 14px">${grade.text}</span></div>
      
      <p style="margin:14px auto 0;max-width:540px;font-size:1.02rem;color:var(--text);line-height:1.5">
        ${
          score >= 9
            ? tFn('grade_msg_sobresaliente')
            : score >= 7
            ? tFn('grade_msg_notable')
            : score >= 5
            ? tFn('grade_msg_aprobado')
            : tFn('grade_msg_suspenso')
        }
      </p>

      <div class="row" style="justify-content:center;gap:10px;margin-top:20px;flex-wrap:wrap">
        <button class="primary btn-test" id="btn-repeat-test">${tFn('repeat_test_btn')}</button>
        <button id="btn-new-test">${tFn('another_test_btn')}</button>
        <button id="btn-finish-dashboard">${tFn('go_to_panel_btn')}</button>
      </div>
    </div>

    <!-- Estadísticas del Test -->
    <div class="stats" style="margin-bottom:18px">
      <div class="card stat">
        <b class="ok">${correctCount} <small style="font-size:.9rem;color:var(--muted)">/ ${total}</small></b>
        <span class="muted small">${tFn('accuracy')} (${accuracyPct}%)</span>
      </div>
      <div class="card stat">
        <b class="${wrongCount > 0 ? 'bad' : 'ok'}">${wrongCount}</b>
        <span class="muted small">${tFn('incorrect_label')}</span>
      </div>
      <div class="card stat">
        <b>${durationText}</b>
        <span class="muted small">${tFn('study_time_label')} (${avgPerQuestion}s/preg)</span>
      </div>
    </div>

    <!-- Desglose por temas (si hubo más de 1 tema) -->
    ${
      topicsList.length > 1
        ? `
      <div class="card" style="margin-bottom:18px">
        <div style="font-weight:700;font-size:1rem;margin-bottom:10px">📊 Rendimiento por temas</div>
        <div class="topic-breakdown-grid">
          ${topicsList
            .map((t) => {
              const tPct = Math.round((t.correct / t.total) * 100);
              const tGrade = getGradeInfo((t.correct / t.total) * 10);
              return `
              <div class="topic-mini-card">
                <div class="title" title="${esc(t.name)}">${esc(t.name)}</div>
                <div class="row spread" style="align-items:baseline">
                  <span style="font-weight:700;font-size:1.05rem;color:${tGrade.color}">${t.correct}/${t.total} aciertos</span>
                  <span class="badge-grade ${tGrade.cls}" style="font-size:.7rem">${tPct}%</span>
                </div>
                <div class="score-meter" style="margin-top:6px;height:5px">
                  <div class="score-meter-fill" style="width:${tPct}%;background:${tGrade.color}"></div>
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </div>`
        : ''
    }

    <!-- Revisión Detallada de Preguntas -->
    <div class="row spread" style="margin:20px 0 10px;align-items:baseline">
      <h2 style="margin:0">Revisión de respuestas</h2>
      <div class="row" style="gap:6px">
        <button class="chip-btn ${filter === 'all' ? 'active' : ''}" data-filter-btn="all">Todas (${total})</button>
        <button class="chip-btn ${filter === 'wrong' ? 'active' : ''}" data-filter-btn="wrong">Falladas (${wrongCount})</button>
        <button class="chip-btn ${filter === 'correct' ? 'active' : ''}" data-filter-btn="correct">Acertadas (${correctCount})</button>
      </div>
    </div>

    <div class="stack">${reviewQuestionsHtml || '<div class="card muted" style="text-align:center;padding:24px">No hay preguntas que coincidan con este filtro.</div>'}</div>

    <div class="row" style="justify-content:center;margin-top:24px;gap:12px">
      <button class="primary" id="btn-bottom-home">← Volver al panel principal</button>
    </div>`;

  // Listeners de la pantalla de resultados
  const goHome = () => {
    state.testMode = null;
    showDashboard();
  };

  $app.querySelector('#btn-results-back').onclick = goHome;
  $app.querySelector('#btn-finish-dashboard').onclick = goHome;
  $app.querySelector('#btn-bottom-home').onclick = goHome;

  $app.querySelector('#btn-repeat-test').onclick = () => {
    // Repetir exactamente las mismas preguntas
    startTest(tm.scope, tm.questions.length, tm.immediateFeedback, false);
  };

  $app.querySelector('#btn-new-test').onclick = () => {
    openTestModal(tm.scope);
  };

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
  $app.innerHTML = `
    <div class="header row spread">
      <button class="link" id="rank-back">← Volver</button>
      <span class="tag">🏆 Clasificación</span>
    </div>
    <div class="card" style="text-align:center;padding:40px"><p class="muted">Cargando métricas de todos los alumnos…</p></div>`;
  $app.querySelector('#rank-back').onclick = () => (state.user ? showDashboard() : showUsers());

  let allUsersData = [];
  try {
    allUsersData = await call('GET', '/api/ranking');
    state.cachedRanking = allUsersData;
  } catch (e) {
    toast('Error al cargar ranking: ' + e.message);
    allUsersData = state.cachedRanking || (state.user ? [state.user] : []);
  }

  // Si el usuario actual tiene datos actualizados en memoria más recientes, incorporarlos
  if (state.user) {
    const idx = allUsersData.findIndex((u) => u.id === state.user.id);
    if (idx >= 0) allUsersData[idx] = state.user;
    else allUsersData.push(state.user);
  }

  renderRankingView(allUsersData);
}

function renderRankingView(allUsersData) {
  const currentScope = state.rankingScope; // 'all' o subjectId
  const selectedSubject = currentScope === 'all' ? 'all' : SUBJECTS.find((s) => s.id === currentScope) || 'all';
  const scopeLabel = currentScope === 'all' ? 'Todas las asignaturas' : selectedSubject.name;

  // Calcular métricas para todos los usuarios en el ámbito actual
  const usersWithMetrics = allUsersData.map((u) => {
    const m = calcUserMetrics(u, selectedSubject);
    return {
      id: u.id,
      name: u.name,
      createdAt: u.createdAt,
      metrics: m,
      isMe: state.user && state.user.id === u.id,
    };
  });

  // Ordenación
  const sortKey = state.rankingSort;
  usersWithMetrics.sort((a, b) => {
    if (sortKey === 'score') {
      return (
        b.metrics.expectedScore - a.metrics.expectedScore ||
        (b.metrics.accuracyPct || 0) - (a.metrics.accuracyPct || 0) ||
        b.metrics.mature - a.metrics.mature ||
        b.metrics.totalReviews - a.metrics.totalReviews
      );
    }
    if (sortKey === 'accuracy') {
      return (b.metrics.accuracyPct || 0) - (a.metrics.accuracyPct || 0) || b.metrics.expectedScore - a.metrics.expectedScore;
    }
    if (sortKey === 'coverage') {
      return b.metrics.coverage - a.metrics.coverage || b.metrics.expectedScore - a.metrics.expectedScore;
    }
    if (sortKey === 'mature') {
      return b.metrics.mature - a.metrics.mature || b.metrics.expectedScore - a.metrics.expectedScore;
    }
    if (sortKey === 'reviews') {
      return b.metrics.totalReviews - a.metrics.totalReviews || b.metrics.expectedScore - a.metrics.expectedScore;
    }
    return 0;
  });

  // Asignar puestos
  usersWithMetrics.forEach((u, i) => {
    u.rank = i + 1;
  });

  const myEntry = usersWithMetrics.find((u) => u.isMe);

  // Podio Top 3
  const top1 = usersWithMetrics[0];
  const top2 = usersWithMetrics[1];
  const top3 = usersWithMetrics[2];

  let podiumHtml = '';
  if (usersWithMetrics.length >= 2) {
    podiumHtml = `
      <div class="podium">
        ${
          top2
            ? `
          <div class="podium-slot second ${top2.isMe ? 'is-me' : ''}" data-expand="${top2.id}">
            <div class="podium-crown">🥈</div>
            <div class="podium-rank">2º Puesto</div>
            <div class="podium-name">${esc(top2.name)} ${top2.isMe ? '<span class="badge-you">Tú</span>' : ''}</div>
            <div class="podium-score" style="color:${top2.metrics.grade.color}">${top2.metrics.expectedScore}<span style="font-size:.85rem;color:var(--muted)">/10</span></div>
            <div style="margin-top:4px"><span class="badge-grade ${top2.metrics.grade.cls}">${top2.metrics.grade.text}</span></div>
            <div class="small muted" style="margin-top:6px">${top2.metrics.coverage}% visto · ${top2.metrics.totalReviews} reps</div>
            ${state.user && !top2.isMe ? `<button class="btn-compare" style="margin-top:8px" data-compare-peer="${esc(top2.id)}">Comparar</button>` : ''}
          </div>`
            : ''
        }
        ${
          top1
            ? `
          <div class="podium-slot first ${top1.isMe ? 'is-me' : ''}" data-expand="${top1.id}">
            <div class="podium-crown">👑 🥇</div>
            <div class="podium-rank" style="color:#b45309">1º Puesto</div>
            <div class="podium-name" style="font-size:1.15rem">${esc(top1.name)} ${top1.isMe ? '<span class="badge-you">Tú</span>' : ''}</div>
            <div class="podium-score" style="color:${top1.metrics.grade.color};font-size:1.8rem">${top1.metrics.expectedScore}<span style="font-size:1rem;color:var(--muted)">/10</span></div>
            <div style="margin-top:4px"><span class="badge-grade ${top1.metrics.grade.cls}">${top1.metrics.grade.text}</span></div>
            <div class="small muted" style="margin-top:6px">${top1.metrics.coverage}% visto · ${top1.metrics.totalReviews} reps</div>
            ${state.user && !top1.isMe ? `<button class="btn-compare" style="margin-top:8px" data-compare-peer="${esc(top1.id)}">Comparar</button>` : ''}
          </div>`
            : ''
        }
        ${
          top3
            ? `
          <div class="podium-slot third ${top3.isMe ? 'is-me' : ''}" data-expand="${top3.id}">
            <div class="podium-crown">🥉</div>
            <div class="podium-rank">3º Puesto</div>
            <div class="podium-name">${esc(top3.name)} ${top3.isMe ? '<span class="badge-you">Tú</span>' : ''}</div>
            <div class="podium-score" style="color:${top3.metrics.grade.color}">${top3.metrics.expectedScore}<span style="font-size:.85rem;color:var(--muted)">/10</span></div>
            <div style="margin-top:4px"><span class="badge-grade ${top3.metrics.grade.cls}">${top3.metrics.grade.text}</span></div>
            <div class="small muted" style="margin-top:6px">${top3.metrics.coverage}% visto · ${top3.metrics.totalReviews} reps</div>
            ${state.user && !top3.isMe ? `<button class="btn-compare" style="margin-top:8px" data-compare-peer="${esc(top3.id)}">Comparar</button>` : ''}
          </div>`
            : ''
        }
      </div>`;
  }

  // Lista de usuarios
  const listRows = usersWithMetrics
    .map((u) => {
      const isExpanded = state.expandedUserId === u.id;
      const m = u.metrics;
      const medalCls = u.rank === 1 ? 'medal-1' : u.rank === 2 ? 'medal-2' : u.rank === 3 ? 'medal-3' : '';
      const medalIcon = u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`;

      let breakdownHtml = '';
      if (isExpanded) {
        const topicGrid =
          m.topicsBreakdown && m.topicsBreakdown.length
            ? `
        <div style="margin-top:12px">
          <div class="small muted" style="font-weight:700;text-transform:uppercase">Nota y dominio por temas</div>
          <div class="topic-breakdown-grid">
            ${m.topicsBreakdown
              .map(
                (t) => `
              <div class="topic-mini-card">
                <div class="title" title="${esc(t.name)}">${esc(t.name)}</div>
                <div class="row spread" style="align-items:baseline">
                  <span style="font-weight:700;font-size:1.1rem;color:${t.grade.color}">${t.score} <small style="font-size:.75rem;color:var(--muted)">/10</small></span>
                  <span class="badge-grade ${t.grade.cls}" style="font-size:.7rem">${t.grade.text}</span>
                </div>
                <div class="small muted" style="margin-top:4px">
                  ${t.studied}/${t.total} vistas (${Math.round((t.studied / t.total) * 100)}%)
                </div>
                <div class="score-meter" style="margin-top:4px;height:4px">
                  <div class="score-meter-fill" style="width:${Math.min(100, t.score * 10)}%;background:${t.grade.color}"></div>
                </div>
              </div>`
              )
              .join('')}
          </div>
        </div>`
            : '';

        breakdownHtml = `
        <div class="user-detail-card">
          <div class="row spread" style="align-items:flex-start">
            <div>
              <b style="font-size:1rem">${esc(u.name)}</b>
              <div class="small muted" style="margin-top:2px">
                ${m.lastActive ? `Último repaso: ${timeAgo(m.lastActive)}` : 'Sin actividad registrada'}
                ${m.todayReviews > 0 ? ` · 🔥 <b>${m.todayReviews}</b> respuestas hoy` : ''}
              </div>
            </div>
            <span class="badge-grade ${m.grade.cls}">${m.grade.text}</span>
          </div>

          <div class="stats" style="margin-top:12px">
            <div class="card stat" style="padding:10px 4px">
              <b style="color:${m.grade.color}">${m.expectedScore}<small style="font-size:.8rem;color:var(--muted)">/10</small></b>
              <span class="muted small">nota esperada</span>
            </div>
            <div class="card stat" style="padding:10px 4px">
              <b>${m.coverage}%</b>
              <span class="muted small">${m.studied}/${m.total} vistas</span>
            </div>
            <div class="card stat" style="padding:10px 4px">
              <b>${m.accuracyPct !== null ? m.accuracyPct + '%' : '–'}</b>
              <span class="muted small">acierto global</span>
            </div>
          </div>

          <div class="banner" style="margin-top:12px;margin-bottom:0">
            💡 <b>Diagnóstico para el examen:</b> ${esc(m.advice)}
          </div>

          ${topicGrid}
        </div>`;
      }

      return `
      <div>
        <div class="ranking-item ${u.isMe ? 'is-me' : ''}" data-expand="${u.id}">
          <div class="rank-num ${medalCls}">${medalIcon}</div>
          <div class="ranking-main-info">
            <div class="ranking-user-name">
              <span>${esc(u.name)}</span>
              ${u.isMe ? '<span class="badge-you">Tú</span>' : ''}
            </div>
            <div class="ranking-meta">
              <span>📚 Cobertura: <b>${m.coverage}%</b> (${m.studied}/${m.total})</span>
              <span>🧠 <b>${m.mature}</b> dominadas</span>
              <span>📈 <b>${m.accuracyPct !== null ? m.accuracyPct + '%' : '–'}</b> acierto</span>
              <span>⚡ <b>${m.totalReviews}</b> reps</span>
              ${m.todayReviews > 0 ? `<span style="color:var(--review)">🔥 ${m.todayReviews} hoy</span>` : ''}
            </div>
            <div class="bar" style="margin-top:6px;max-width:320px" title="Verde: dominadas · verde claro: en repaso · rojo: aprendiendo · gris: nuevas">
              <span style="width:${(100 * m.mature) / m.total}%;background:var(--review)"></span>
              <span style="width:${(100 * m.young) / m.total}%;background:color-mix(in srgb, var(--review) 45%, transparent)"></span>
              <span style="width:${(100 * m.learning) / m.total}%;background:var(--learn)"></span>
            </div>
          </div>
          <div class="ranking-score-box">
            <div class="ranking-score-value" style="color:${m.grade.color}">
              ${m.expectedScore}<span class="ranking-score-denom">/10</span>
            </div>
            <span class="badge-grade ${m.grade.cls}">${m.grade.text}</span>
            <div class="row" style="gap:6px;margin-top:4px;justify-content:flex-end">
              ${state.user && !u.isMe ? `<button class="btn-compare" data-compare-peer="${esc(u.id)}" title="Comparar tus estadísticas con ${esc(u.name)}">Comparar</button>` : ''}
              <span style="font-size:.75rem;color:var(--muted)">${isExpanded ? '▲ Ocultar' : '▼ Detalle'}</span>
            </div>
          </div>
        </div>
        ${breakdownHtml}
      </div>`;
    })
    .join('');

  const tFn = window.t || ((k, p) => k);
  $app.innerHTML = `
    <div class="header row spread" style="flex-wrap:wrap;gap:10px">
      <div>
        <h1>🏆 ${tFn('ranking_title')}</h1>
        <div class="muted small">${esc(scopeLabel)} · ${tFn('ranking_sub')}</div>
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">
        ${window.renderTopControls ? window.renderTopControls() : ''}
        ${state.user ? `<button class="btn-ranking" id="btn-ranking-stats">📊 ${tFn('nav_stats')}</button>` : ''}
        <button class="link" id="rank-back-btn">${tFn('back_to_study')}</button>
      </div>
    </div>

    <div class="tabs">
      <button data-rank-scope="all" class="${currentScope === 'all' ? 'active' : ''}">🌍 General (Todas)</button>
      ${SUBJECTS.map((s) => `<button data-rank-scope="${s.id}" class="${currentScope === s.id ? 'active' : ''}">${esc(s.name)}</button>`).join('')}
    </div>

    ${
      myEntry
        ? `
      <div class="user-rank-banner" style="cursor:default">
        <div class="left">
          <div class="rank-badge">${myEntry.rank === 1 ? '🥇' : myEntry.rank === 2 ? '🥈' : myEntry.rank === 3 ? '🥉' : '#' + myEntry.rank}</div>
          <div>
            <div style="font-weight:700">Tu posición: <b>#${myEntry.rank}</b> de ${usersWithMetrics.length} alumnos</div>
            <div class="small muted">
              Nota esperada: <b style="color:${myEntry.metrics.grade.color};font-size:1.05rem">${myEntry.metrics.expectedScore}/10</b>
              <span class="badge-grade ${myEntry.metrics.grade.cls}">${myEntry.metrics.grade.text}</span> ·
              Cobertura: <b>${myEntry.metrics.coverage}%</b> · Acierto: <b>${myEntry.metrics.accuracyPct !== null ? myEntry.metrics.accuracyPct + '%' : '–'}</b>
            </div>
          </div>
        </div>
        <button id="my-study-btn" class="primary" style="padding:6px 14px">Estudiar ahora</button>
      </div>`
        : ''
    }

    ${podiumHtml}

    <div class="filter-bar">
      <div class="small muted"><b>${usersWithMetrics.length}</b> alumnos registrados</div>
      <div class="row" style="gap:6px">
        <span class="small muted">Ordenar por:</span>
        <select id="rank-sort-select" class="sort-select">
          <option value="score" ${sortKey === 'score' ? 'selected' : ''}>🎯 Nota esperada</option>
          <option value="accuracy" ${sortKey === 'accuracy' ? 'selected' : ''}>📈 Tasa de acierto</option>
          <option value="coverage" ${sortKey === 'coverage' ? 'selected' : ''}>📚 Cobertura del temario</option>
          <option value="mature" ${sortKey === 'mature' ? 'selected' : ''}>🧠 Tarjetas dominadas</option>
          <option value="reviews" ${sortKey === 'reviews' ? 'selected' : ''}>⚡ Repasos totales</option>
        </select>
      </div>
    </div>

    <div class="ranking-list">${listRows}</div>

    <details class="small muted" style="margin-top:28px">
      <summary><b>¿Cómo se calcula la nota esperada en el examen?</b></summary>
      <div style="margin-top:8px;line-height:1.6">
        <p>La nota esperada se calcula mediante un <b>modelo probabilístico de retención</b> que evalúa cada pregunta del temario:</p>
        <ul>
          <li><b>Preguntas no vistas (0 puntos):</b> Si un tema no ha sido estudiado, su aportación a la nota del examen es nula. No es posible aprobar sin cobertura mínima.</li>
          <li><b>Tarjetas maduras (≥21 días, ~94% retención):</b> Preguntas consolidadas en memoria a largo plazo gracias a repasos espaciados continuados.</li>
          <li><b>Tarjetas jóvenes (1 a 20 días, ~72%–90% retención):</b> Preguntas en fase de afianzamiento. Su probabilidad sube conforme el intervalo crece.</li>
          <li><b>Tarjetas en aprendizaje / reaprendizaje (~50% retención):</b> Pasos cortos iniciales o tras haber fallado recientemente.</li>
          <li><b>Factor de precisión personal:</b> Se modula en función de tu tasa histórica de acierto en la materia (premia la constancia sin fallos).</li>
        </ul>
        <p><b>Escala académica:</b> Suspenso (&lt; 5,0) · Aprobado (5,0–6,9) · Notable (7,0–8,9) · Sobresaliente (9,0–10,0).</p>
      </div>
    </details>`;

  $app.querySelector('#rank-back-btn').onclick = () => (state.user ? showDashboard() : showUsers());
  const myStudy = $app.querySelector('#my-study-btn');
  if (myStudy) myStudy.onclick = showDashboard;

  $app.querySelectorAll('[data-rank-scope]').forEach((b) => {
    b.onclick = () => {
      state.rankingScope = b.dataset.rankScope;
      renderRankingView(allUsersData);
    };
  });

  const btnRankStats = $app.querySelector('#btn-ranking-stats');
  if (btnRankStats) btnRankStats.onclick = () => showStats({ subjectId: currentScope });
  $app.querySelectorAll('[data-compare-peer]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      showStats({ subjectId: currentScope, peerId: btn.dataset.comparePeer });
    };
  });

  const sortSelect = $app.querySelector('#rank-sort-select');
  if (sortSelect) {
    sortSelect.onchange = (e) => {
      state.rankingSort = e.target.value;
      renderRankingView(allUsersData);
    };
  }

  $app.querySelectorAll('[data-expand]').forEach((el) => {
    el.onclick = () => {
      const uid = el.dataset.expand;
      state.expandedUserId = state.expandedUserId === uid ? null : uid;
      renderRankingView(allUsersData);
    };
  });
}

// ---------------- Modo Estudio Espaciado (SRS) ----------------

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

function startStudy(scope) {
  state.scope = scope;
  state.practice = false;
  state.forceStudy = null;
  state.lastId = null;
  state.testMode = null;
  nextCard();
}

function nextCard() {
  stopTimer();
  const ids = scopeIds(state.scope);
  let id;
  if (state.forceStudy && state.forceStudy.active) {
    const fs = state.forceStudy;
    if (fs.currentIndex >= fs.cardIds.length) {
      return showForceStudyDone();
    }
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

function topBar() {
  const tFn = window.t || ((k, p) => k);
  const c = SRS.counts(scopeIds(state.scope), state.user.cards);
  const isForced = !!(state.forceStudy && state.forceStudy.active);
  const scopeLabel = state.scope === 'all'
    ? tFn('global_title')
    : (state.scope === 'final-mock' ? tFn('final_mock_name') : (window.currentLang === 'es' ? 'Tema ' : 'Topic ') + state.scope);

  return `<div class="row spread header" style="flex-wrap:wrap;gap:10px">
    <div class="row" style="gap:8px;align-items:center">
      <button class="link" id="back">${tFn('back')}</button>
      <span class="tag">${esc(scopeLabel)}</span>
      ${isForced ? `<span class="tag tag-forced">${tFn('tag_forced_session')}</span>` : ''}
    </div>
    <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
      ${window.renderTopControls ? window.renderTopControls() : ''}
      ${
        isForced
          ? `<div class="small muted" style="font-weight:600">
              ${tFn('question')} <b style="color:var(--text)">${state.forceStudy.currentIndex + 1}</b> ${tFn('of_total', { total: state.forceStudy.total })}
             </div>`
          : state.practice
          ? `<span class="muted small">${tFn('practice_label')}</span>`
          : `<div class="counts" title="${tFn('bar_legend')}">
        <span class="n-new">${c.new}</span><span class="n-learn">${c.dueLearn}</span><span class="n-review">${c.dueReview}</span></div>`
      }
    </div>
  </div>`;
}

function renderCard() {
  const { id, order, sel, picked, correct } = state.current;
  const q = Q[id];
  const multi = isMulti(q);
  const card = state.user.cards[id] || SRS.newCard();
  const answered = picked !== null;

  const options = order
    .map((oi, pos) => {
      let cls = 'option';
      if (answered) {
        if (isRight(q, oi)) cls += multi && !picked.includes(oi) ? ' correct missed' : ' correct';
        else if ([].concat(picked).includes(oi)) cls += ' wrong';
        else cls += ' dim';
      } else if (sel.includes(oi)) cls += ' selected';
      return `<button class="${cls}" data-opt="${oi}" ${answered ? 'disabled' : ''}>
      <span class="letter">${LETTERS[pos]}</span><span>${esc(q.options[oi])}</span></button>`;
    })
    .join('');

  const isForced = !!(state.forceStudy && state.forceStudy.active);
  const isForcedNoReschedule = isForced && !state.forceStudy.reschedule;

  const tFn = window.t || ((k, p) => k);
  let after = '';
  if (answered) {
    const fb = `<div class="feedback ${correct ? 'ok' : 'bad'}">
      <b class="${correct ? 'ok' : 'bad'}">${correct ? '✓ ' + tFn('feedback_correct') : `✗ ${tFn('feedback_incorrect')} ${[].concat(q.answer).length > 1 ? tFn('feedback_were') : tFn('feedback_was')}: ${[].concat(q.answer).map((i) => esc(q.options[i])).join(' · ')}`}</b>
      ${q.explain ? `<p>${rich(q.explain)}</p>` : ''}</div>`;
    if (state.practice || isForcedNoReschedule) {
      after = fb + `<div class="grades one"><button class="primary" data-next>${tFn('next_btn')}</button></div>`;
    } else {
      const pv = SRS.preview(card);
      const ratings = correct ? ['again', 'hard', 'good', 'easy'] : ['again'];
      after =
        fb +
        `<div class="grades ${correct ? '' : 'one'}">${ratings
          .map((r) => `<button class="grade ${r}" data-rate="${r}"><span>${RATING_LABEL[r]}</span><small>${pv[r]}</small></button>`)
          .join('')}</div>`;
    }
  }

  const isNew = card.state === 'new';
  const forcedProgressPct = isForced ? (((state.forceStudy.currentIndex + (answered ? 1 : 0)) / state.forceStudy.total) * 100) : 0;

  $app.innerHTML = `${topBar()}
    ${
      isForced
        ? `<div class="test-progress-bar" style="margin-bottom:12px">
            <div class="test-progress-fill" style="width:${forcedProgressPct}%;background:linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)"></div>
          </div>
          <div class="banner" style="background:color-mix(in srgb, #7c3aed 10%, var(--card));border:1px solid color-mix(in srgb, #7c3aed 30%, transparent);color:var(--text)">
            ${
              state.forceStudy.reschedule
                ? tFn('forced_banner_resched')
                : tFn('forced_banner_no_resched')
            }
          </div>`
        : state.practice
        ? `<div class="banner">${tFn('practice_banner')}</div>`
        : ''
    }
    <div class="card">
      <div class="row spread small muted"><span>${esc(topicName(q.topic))}</span>
        <span>${isNew ? `<span class="n-new">${tFn('new_label')}</span>` : SRS.isLearning(card) ? `<span class="n-learn">${tFn('learning_label')}</span>` : `<span class="n-review">${tFn('review_label')}</span>`}</span></div>
      <div class="question">${questionHtml(q.q)}</div>
      ${multi ? `<div class="muted small multi-hint">${tFn('multi_hint')}</div>` : ''}
      <div class="options">${options}</div>
      ${multi && !answered ? `<div class="grades one"><button class="primary" data-check ${sel.length ? '' : 'disabled'}>${tFn('check_btn')}</button></div>` : ''}
      ${after}
    </div>
    <div class="kbd">${
      answered
        ? correct && !state.practice
          ? tFn('kbd_rating')
          : tFn('kbd_continue')
        : `${tFn('kbd_single', { max: order.length, letters: LETTERS.slice(0, order.length).split('').join('/') })}${multi ? ' · Enter: ' + tFn('check_btn') : ''}`
    }</div>`;

  $app.querySelector('#back').onclick = () => {
    if (state.forceStudy && state.forceStudy.active) {
      if (!confirm('¿Quieres salir de la sesión forzada de estudio?')) return;
      state.forceStudy = null;
    }
    showDashboard();
  };
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

async function rate(rating) {
  const { id, correct } = state.current;
  const { user } = state;
  const isForced = !!(state.forceStudy && state.forceStudy.active);
  const shouldReschedule = isForced ? state.forceStudy.reschedule : !state.practice;

  const oldCard = user.cards[id] || SRS.newCard();
  let next = null;

  if (shouldReschedule) {
    next = SRS.schedule(oldCard, rating);
    user.cards[id] = next;
  }

  const isPracticeLog = isForced ? !state.forceStudy.reschedule : state.practice;

  const body = {
    qid: id,
    rating,
    correct,
    practice: isPracticeLog,
  };
  if (shouldReschedule && next) {
    body.card = next;
  }

  user.log.push({
    t: Date.now(),
    qid: id,
    rating,
    correct,
    practice: isPracticeLog,
    forced: isForced,
  });

  if (isForced) {
    state.forceStudy.results.push({
      qid: id,
      rating,
      correct,
      oldIvl: oldCard.ivl || 0,
      newIvl: next ? next.ivl : (oldCard.ivl || 0),
      rescheduled: shouldReschedule,
    });
    state.forceStudy.currentIndex++;
  }

  state.lastId = id;
  call('POST', `/api/users/${user.id}/review`, body).catch((e) => toast('No se pudo guardar: ' + e.message));
  nextCard();
}

function showDone() {
  const tFn = window.t || ((k, p) => k);
  const c = SRS.counts(scopeIds(state.scope), state.user.cards);
  const wait = c.nextDue ? SRS.formatDelay(c.nextDue - Date.now()) : null;
  $app.innerHTML = `${topBar()}
    <div class="card" style="text-align:center">
      <div style="font-size:2.5rem">🎉</div>
      <h2 style="margin-top:6px">${tFn('all_caught_up', { scope: esc(scopeName(state.scope)) })}</h2>
      <p class="muted">${tFn('no_cards_due')}${wait ? ` ${tFn('next_card_due', { time: wait })}` : ''}</p>
      <div class="row" style="justify-content:center;flex-wrap:wrap;gap:10px">
        <button class="primary btn-force-study" id="force-study-btn">${tFn('force_session')}</button>
        <button id="practice">${tFn('practice_random')}</button>
        <button id="home">${tFn('back_to_panel')}</button>
      </div>
      <p class="muted small" style="margin-top:14px;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.5">
        ${tFn('force_modal_sub')}
      </p>
    </div>`;
  $app.querySelector('#back').onclick = showDashboard;
  $app.querySelector('#home').onclick = showDashboard;
  const forceBtn = $app.querySelector('#force-study-btn');
  if (forceBtn) forceBtn.onclick = () => openForceStudyModal(state.scope);
  $app.querySelector('#practice').onclick = () => {
    state.practice = true;
    nextCard();
  };
  // Si una tarjeta de aprendizaje vence mientras esperas, se reanuda sola.
  state.timer = setInterval(() => {
    if (SRS.pickNext(scopeIds(state.scope), state.user.cards, Date.now())) nextCard();
  }, 15000);
}

function showForceStudyDone() {
  const fs = state.forceStudy;
  if (!fs) return showDashboard();

  const results = fs.results || [];
  const total = results.length || fs.total;
  const correctCount = results.filter((r) => r.correct).length;
  const pct = total ? Math.round((correctCount / total) * 100) : 0;
  const improvedCount = results.filter((r) => r.newIvl > r.oldIvl).length;

  $app.innerHTML = `
    <div class="row spread header">
      <button class="link" id="fs-back">← Volver al panel</button>
      <span class="tag tag-forced">⚡ Sesión Forzada Completada</span>
      <div style="width:40px"></div>
    </div>

    <div class="card" style="text-align:center;padding:32px 20px">
      <div style="font-size:3rem">⚡🎉</div>
      <h2 style="margin-top:10px;font-size:1.5rem">¡Sesión de estudio forzada completada!</h2>
      <p class="muted" style="max-width:500px;margin:8px auto 20px">
        Has repasado con éxito <b>${total} tarjetas</b> en <b>${esc(scopeName(fs.scope))}</b>.
      </p>

      <div class="stats" style="max-width:480px;margin:0 auto 24px">
        <div class="card stat">
          <b style="color:${pct >= 80 ? 'var(--ok)' : pct >= 60 ? 'var(--accent)' : 'var(--bad)'}">${correctCount}/${total}</b>
          <span class="muted small">aciertos (${pct}%)</span>
        </div>
        <div class="card stat">
          <b style="color:var(--review)">+${improvedCount}</b>
          <span class="muted small">intervalos ampliados</span>
        </div>
        <div class="card stat">
          <b style="color:#7c3aed">${fs.reschedule ? 'SRS Activo' : 'Repaso'}</b>
          <span class="muted small">${fs.reschedule ? 'Tarjetas reprogramadas' : 'Sin alterar fechas'}</span>
        </div>
      </div>

      <div class="row" style="justify-content:center;flex-wrap:wrap;gap:10px">
        <button class="btn-force-study" id="fs-again" style="padding:10px 20px;font-size:1rem">
          ⚡ Otra tanda forzada
        </button>
        <button class="primary" id="fs-home" style="padding:10px 20px">
          Volver al panel
        </button>
      </div>
    </div>`;

  $app.querySelector('#fs-back').onclick = () => {
    state.forceStudy = null;
    showDashboard();
  };
  $app.querySelector('#fs-home').onclick = () => {
    state.forceStudy = null;
    showDashboard();
  };
  $app.querySelector('#fs-again').onclick = () => {
    const scope = fs.scope;
    state.forceStudy = null;
    openForceStudyModal(scope);
  };
}

// ---------------- Atajos de Teclado ----------------

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  // 1. Teclas en Modo Test
  if (state.testMode && state.testMode.active) {
    const tm = state.testMode;
    const q = tm.questions[tm.currentIndex];
    const k = e.key.toLowerCase();
    const answered = tm.currentPicked !== null;

    if (!answered) {
      if (k === 'enter' && isMulti(q)) {
        e.preventDefault();
        checkTestMulti();
        return;
      }
      let pos = '123456'.indexOf(k);
      if (pos < 0) pos = 'abcdef'.indexOf(k);
      if (pos >= 0 && pos < tm.currentOrder.length) {
        const oi = tm.currentOrder[pos];
        if (isMulti(q)) {
          tm.currentSel = tm.currentSel.includes(oi) ? tm.currentSel.filter((i) => i !== oi) : [...tm.currentSel, oi];
          renderTestCard();
        } else {
          answerTest(oi);
        }
      }
      return;
    }

    // Pregunta de test ya respondida
    if (k === ' ' || k === 'enter') {
      e.preventDefault();
      nextTestQuestion();
      return;
    }
    return;
  }

  // 2. Teclas en Modo Estudio Normal
  if (!state.current || !document.querySelector('.options')) return;
  const cur = state.current;
  const k = e.key.toLowerCase();
  if (cur.picked === null) {
    if (k === 'enter') {
      e.preventDefault();
      checkMulti();
      return;
    }
    let pos = '123456'.indexOf(k);
    if (pos < 0) pos = 'abcdef'.indexOf(k);
    if (pos >= 0 && pos < cur.order.length) answer(cur.order[pos]);
    return;
  }
  if (state.practice || (state.forceStudy && !state.forceStudy.reschedule) || !cur.correct) {
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

// ---------------- Inicio ----------------

const saved = localStorage.getItem('lewis-quiz-user');
saved ? openUser(saved) : showUsers();

window.startStudy = startStudy;
window.startForceStudy = startForceStudy;
window.openForceStudyModal = openForceStudyModal;

// ---------------- Dynamic UI Re-render on Lang / Theme Change ----------------
function refreshCurrentView() {
  if (state.testMode && state.testMode.active) {
    if (state.testMode.showResults) {
      showTestResults();
    } else {
      renderTestCard();
    }
  } else if (state.forceStudy && state.forceStudy.active) {
    renderCard();
  } else if (state.current) {
    renderCard();
  } else if (document.querySelector('.ranking-list') || document.querySelector('.podium')) {
    showRanking();
  } else if (document.querySelector('.stats-toggles') || document.querySelector('.kpis')) {
    if (window.renderStats) window.renderStats();
    else showDashboard();
  } else if (state.user) {
    showDashboard();
  } else {
    showUsers();
  }
}
window.refreshCurrentView = refreshCurrentView;
