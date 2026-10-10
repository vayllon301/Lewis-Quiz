// Interfaz: elegir usuario → panel de una asignatura (global + temas + historial) → sesión de estudio tipo Anki → ranking con nota esperada.

const $app = document.getElementById('app');
const Q = Object.fromEntries(SUBJECTS.flatMap((s) => s.questions.map((q) => [q.id, q])));
const LETTERS = 'ABCDEF';
const RATING_LABEL = { again: 'Otra vez', hard: 'Difícil', good: 'Bien', easy: 'Fácil' };

const state = {
  users: [],
  user: null,        // { id, name, cards, log }
  subject: SUBJECTS.find((s) => s.id === localStorage.getItem('lewis-quiz-subject')) || SUBJECTS[0],
  scope: 'all',      // 'all' o el id de un tema
  practice: false,   // modo práctica: no cambia la programación
  current: null,     // { id, order: [índices de opciones], sel: [marcadas antes de comprobar], picked, correct }
  lastId: null,
  timer: null,
  rankingScope: 'all', // 'all' o id de una asignatura
  rankingSort: 'score', // 'score', 'accuracy', 'coverage', 'mature', 'reviews'
  expandedUserId: null,
  cachedRanking: null,
};

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

function stopTimer() { clearInterval(state.timer); state.timer = null; }

const scopeIds = (scope) => state.subject.questions.filter((q) => scope === 'all' || q.topic === scope).map((q) => q.id);
const scopeName = (scope) => (scope === 'all' ? `${state.subject.name} · todos los temas` : topicName(scope));
const topicName = (id) => state.subject.topics.find((t) => t.id === id).name;

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
  if (score >= 9.0) return { text: 'Sobresaliente', cls: 'badge-sobresaliente', color: '#f59e0b' };
  if (score >= 7.0) return { text: 'Notable', cls: 'badge-notable', color: '#15803d' };
  if (score >= 5.0) return { text: 'Aprobado', cls: 'badge-aprobado', color: '#2563eb' };
  return { text: 'Suspenso', cls: 'badge-suspenso', color: '#b91c1c' };
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
  const acc = totalReviews > 0 ? (correctReviews / totalReviews) : null;
  const accFactor = acc !== null ? Math.max(0.75, Math.min(1.10, acc / 0.80)) : 0.85;

  const midnight = new Date().setHours(0, 0, 0, 0);
  const todayReviews = logs.filter((l) => l.t >= midnight).length;
  const lastActive = logs.length ? Math.max(...logs.map((l) => l.t)) : null;

  let studied = 0, mature = 0, young = 0, learning = 0, unseen = 0, sumP = 0;

  for (const q of questions) {
    const c = cards[q.id];
    let p = 0;
    if (c && c.state !== 'new') {
      studied++;
      if (c.state === 'learning' || c.state === 'relearning') {
        learning++;
        p = 0.50 * accFactor;
      } else if (c.state === 'review') {
        const lapseMod = Math.max(0.70, 1 - 0.04 * (c.lapses || 0));
        if (c.ivl >= 21) {
          mature++;
          p = 0.94 * lapseMod * accFactor;
        } else {
          young++;
          const ivlProg = Math.min(1, Math.max(0, c.ivl / 21));
          p = (0.72 + 0.20 * ivlProg) * lapseMod * accFactor;
        }
      }
    } else {
      const qLogs = logs.filter((l) => l.qid === q.id);
      if (qLogs.length > 0) {
        studied++;
        const last = qLogs[qLogs.length - 1];
        p = (last.correct ? 0.60 : 0.25) * accFactor;
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
      let tSumP = 0, tStudied = 0, tMature = 0, tYoung = 0, tLearning = 0;
      for (const tq of tQuestions) {
        const c = cards[tq.id];
        let p = 0;
        if (c && c.state !== 'new') {
          tStudied++;
          if (c.state === 'learning' || c.state === 'relearning') {
            tLearning++;
            p = 0.50 * accFactor;
          } else if (c.state === 'review') {
            const lapseMod = Math.max(0.70, 1 - 0.04 * (c.lapses || 0));
            const ivlProg = Math.min(1, Math.max(0, c.ivl / 21));
            if (c.ivl >= 21) {
              tMature++;
              p = 0.94 * lapseMod * accFactor;
            } else {
              tYoung++;
              p = (0.72 + 0.20 * ivlProg) * lapseMod * accFactor;
            }
          }
        }
        tSumP += Math.max(0, Math.min(0.98, p));
      }
      const tScore = tQuestions.length ? Math.round(((tSumP / tQuestions.length) * 10) * 10) / 10 : 0;
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
  try { state.users = await call('GET', '/api/users'); } catch (e) { toast(e.message); }
  $app.innerHTML = `
    <div class="header row spread">
      <div>
        <h1>🧠 Lewis Quiz</h1>
        <div class="muted">${SUBJECTS.map((s) => esc(s.name)).join(' · ')} · repaso espaciado tipo Anki</div>
      </div>
      <button class="btn-ranking" id="public-ranking-btn">🏆 Ranking de la clase</button>
    </div>
    <div class="card stack">
      <h2 style="margin-top:0">¿Quién eres?</h2>
      ${state.users.length ? `<div class="users">${state.users.map((u) => `<button data-user="${u.id}">👤 ${esc(u.name)}</button>`).join('')}</div>` : '<p class="muted">Aún no hay usuarios. Crea el tuyo:</p>'}
      <form id="new-user" class="row" style="margin-top:16px">
        <input name="name" placeholder="Nombre del nuevo usuario" maxlength="40" required style="flex:1">
        <button class="primary">Crear</button>
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
    } catch (err) { toast(err.message); }
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

// ---------------- Panel ----------------

function countsHtml(c) {
  return `<div class="counts">
    <span class="n-new" title="Nunca vistas">${c.new} nuevas</span>
    <span class="n-learn" title="En aprendizaje que tocan ya">${c.dueLearn} aprendiendo</span>
    <span class="n-review" title="Repasos que tocan hoy">${c.dueReview} para repasar</span>
  </div>`;
}

function barHtml(c) {
  const pct = (n) => (100 * n) / c.total;
  return `<div class="bar" title="Verde oscuro: dominadas (≥21 d) · verde: en repaso · rojo: aprendiendo · gris: nuevas">
    <span style="width:${pct(c.mature)}%;background:var(--review)"></span>
    <span style="width:${pct(c.young)}%;background:color-mix(in srgb, var(--review) 45%, transparent)"></span>
    <span style="width:${pct(c.learning)}%;background:var(--learn)"></span>
  </div>`;
}

function showDashboard() {
  stopTimer();
  const { user, subject } = state;
  const now = Date.now();
  const all = SRS.counts(scopeIds('all'), user.cards, now);
  const log = user.log.filter((e) => Q[e.qid] && subject.questions.includes(Q[e.qid]));
  const midnight = new Date().setHours(0, 0, 0, 0);
  const today = log.filter((e) => e.t >= midnight);
  const acc = accuracy(log);

  // Métricas del usuario actual para la asignatura activa
  const metrics = calcUserMetrics(user, subject);

  const topicRows = subject.topics.map((t) => {
    const c = SRS.counts(scopeIds(t.id), user.cards, now);
    const a = accuracy(log.filter((e) => Q[e.qid]?.topic === t.id));
    return `<div class="card topic">
      <div class="info">
        <div class="name">${esc(t.name)}</div>
        <div class="row spread small"><span class="muted">${c.total} preguntas${a !== null ? ` · ${a}% acierto` : ''}</span></div>
        ${countsHtml(c)}
        ${barHtml(c)}
      </div>
      <button data-scope="${t.id}">Estudiar</button>
    </div>`;
  }).join('');

  // Preguntas más falladas
  const fails = {};
  for (const e of log) if (!e.correct) fails[e.qid] = (fails[e.qid] || 0) + 1;
  const worst = Object.entries(fails).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const recent = log.slice(-15).reverse();

  $app.innerHTML = `
    <div class="header row spread">
      <div><h1>🧠 Lewis Quiz</h1><div class="muted small">${esc(subject.name)}</div></div>
      <div class="row">
        <button class="btn-ranking" id="btn-ranking">🏆 Ranking</button>
        <span>👤 <b>${esc(user.name)}</b></span>
        <button class="link" id="switch">Cambiar</button>
      </div>
    </div>
    ${SUBJECTS.length > 1 ? `<div class="tabs">${SUBJECTS.map((s) =>
      `<button data-subject="${s.id}" class="${s === subject ? 'active' : ''}">${esc(s.name)}</button>`).join('')}</div>` : ''}

    <div class="user-rank-banner" id="banner-ranking" title="Ver ranking y comparativa de notas">
      <div class="left">
        <div class="rank-badge">🏆</div>
        <div>
          <div style="font-weight:700">Nota esperada en el examen: <span style="font-size:1.15rem;color:${metrics.grade.color}">${metrics.expectedScore} / 10</span>
            <span class="badge-grade ${metrics.grade.cls}">${metrics.grade.text}</span>
          </div>
          <div class="small muted" style="margin-top:2px">
            Cobertura: <b>${metrics.coverage}%</b> (${metrics.studied}/${metrics.total} preguntas) · Acierto: <b>${metrics.accuracyPct !== null ? metrics.accuracyPct + '%' : '–'}</b>
          </div>
          <div class="score-meter" style="max-width:260px;margin-top:6px">
            <div class="score-meter-fill" style="width:${Math.min(100, metrics.expectedScore * 10)}%;background:${metrics.grade.color}"></div>
          </div>
        </div>
      </div>
      <button class="primary" style="padding:6px 12px;font-size:.88rem">Ver Ranking →</button>
    </div>

    <div class="card">
      <div class="row spread" style="align-items:flex-start">
        <div style="flex:1">
          <div class="name"><b>Global</b> <span class="muted small">· ${all.total} preguntas de todos los temas de ${esc(subject.name)} mezcladas</span></div>
          ${countsHtml(all)}
          ${barHtml(all)}
        </div>
        <button class="primary" data-scope="all">Estudiar</button>
      </div>
    </div>

    <h2>Por temas</h2>
    <div class="stack">${topicRows}</div>

    <h2>Historial</h2>
    <div class="stats">
      <div class="card stat"><b>${log.length}</b><span class="muted small">respuestas</span></div>
      <div class="card stat"><b>${acc === null ? '–' : acc + '%'}</b><span class="muted small">acierto global</span></div>
      <div class="card stat"><b>${today.length}</b><span class="muted small">hoy</span></div>
    </div>
    ${worst.length ? `<div class="card" style="margin-top:10px"><b>Las que más fallas</b><ul class="list small" style="margin-top:6px">
      ${worst.map(([id, n]) => `<li><span class="bad">✗${n}</span><span class="q" title="${esc(Q[id].q)}">${esc(Q[id].q)}</span><span class="muted">T${Q[id].topic}</span></li>`).join('')}
    </ul></div>` : ''}
    ${recent.length ? `<div class="card" style="margin-top:10px"><b>Últimas respuestas</b><ul class="list small" style="margin-top:6px">
      ${recent.map((e) => `<li><span class="${e.correct ? 'ok' : 'bad'}">${e.correct ? '✓' : '✗'}</span><span class="q" title="${esc(Q[e.qid].q)}">${esc(Q[e.qid].q)}</span><span class="muted">${e.practice ? 'práctica' : RATING_LABEL[e.rating]} · ${timeAgo(e.t)}</span></li>`).join('')}
    </ul></div>` : '<p class="muted small">Todavía no has respondido ninguna pregunta.</p>'}

    <details class="small muted" style="margin-top:24px">
      <summary>¿Cómo funciona el repaso espaciado?</summary>
      <p>Funciona como Anki (algoritmo SM-2). Cada pregunta es una tarjeta. Las nuevas pasan por unos pasos cortos (1 min y 10 min). Cuando las aciertas, pasan a repaso con intervalos en días que crecen: 1 d → ~2–3 d → ~6 d → ~2 semanas…</p>
      <p>Al acertar eliges lo fácil que te ha resultado. <b>Difícil</b> alarga poco el intervalo y baja la «facilidad» de la tarjeta. <b>Bien</b> lo multiplica por la facilidad (~2,5×). <b>Fácil</b> lo alarga aún más y sube la facilidad. Si fallas, la tarjeta vuelve a aprendizaje (Otra vez) y su facilidad baja. Si aciertas de chiripa, pulsa también Otra vez.</p>
      <p>Las opciones se barajan cada vez para que no memorices la posición.</p>
    </details>
    <div class="row" style="margin-top:10px">
      <button class="link small" id="reset">Reiniciar mi progreso</button>
      <button class="link small" id="delete">Borrar usuario</button>
    </div>`;

  $app.querySelectorAll('[data-subject]').forEach((b) => (b.onclick = () => {
    state.subject = SUBJECTS.find((s) => s.id === b.dataset.subject);
    localStorage.setItem('lewis-quiz-subject', state.subject.id);
    showDashboard();
  }));
  $app.querySelectorAll('[data-scope]').forEach((b) => (b.onclick = () => startStudy(b.dataset.scope === 'all' ? 'all' : Number(b.dataset.scope))));
  $app.querySelector('#btn-ranking').onclick = () => showRanking();
  $app.querySelector('#banner-ranking').onclick = () => showRanking();
  $app.querySelector('#switch').onclick = () => { localStorage.removeItem('lewis-quiz-user'); showUsers(); };
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

// ---------------- Ranking ----------------

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
  const selectedSubject = currentScope === 'all' ? 'all' : (SUBJECTS.find((s) => s.id === currentScope) || 'all');
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
      return b.metrics.expectedScore - a.metrics.expectedScore ||
        (b.metrics.accuracyPct || 0) - (a.metrics.accuracyPct || 0) ||
        b.metrics.mature - a.metrics.mature ||
        b.metrics.totalReviews - a.metrics.totalReviews;
    }
    if (sortKey === 'accuracy') {
      return (b.metrics.accuracyPct || 0) - (a.metrics.accuracyPct || 0) ||
        b.metrics.expectedScore - a.metrics.expectedScore;
    }
    if (sortKey === 'coverage') {
      return b.metrics.coverage - a.metrics.coverage ||
        b.metrics.expectedScore - a.metrics.expectedScore;
    }
    if (sortKey === 'mature') {
      return b.metrics.mature - a.metrics.mature ||
        b.metrics.expectedScore - a.metrics.expectedScore;
    }
    if (sortKey === 'reviews') {
      return b.metrics.totalReviews - a.metrics.totalReviews ||
        b.metrics.expectedScore - a.metrics.expectedScore;
    }
    return 0;
  });

  // Asignar puestos
  usersWithMetrics.forEach((u, i) => { u.rank = i + 1; });

  const myEntry = usersWithMetrics.find((u) => u.isMe);

  // Podio Top 3
  const top1 = usersWithMetrics[0];
  const top2 = usersWithMetrics[1];
  const top3 = usersWithMetrics[2];

  let podiumHtml = '';
  if (usersWithMetrics.length >= 2) {
    podiumHtml = `
      <div class="podium">
        ${top2 ? `
          <div class="podium-slot second ${top2.isMe ? 'is-me' : ''}" data-expand="${top2.id}">
            <div class="podium-crown">🥈</div>
            <div class="podium-rank">2º Puesto</div>
            <div class="podium-name">${esc(top2.name)} ${top2.isMe ? '<span class="badge-you">Tú</span>' : ''}</div>
            <div class="podium-score" style="color:${top2.metrics.grade.color}">${top2.metrics.expectedScore}<span style="font-size:.85rem;color:var(--muted)">/10</span></div>
            <div style="margin-top:4px"><span class="badge-grade ${top2.metrics.grade.cls}">${top2.metrics.grade.text}</span></div>
            <div class="small muted" style="margin-top:6px">${top2.metrics.coverage}% visto · ${top2.metrics.totalReviews} reps</div>
          </div>` : ''}
        ${top1 ? `
          <div class="podium-slot first ${top1.isMe ? 'is-me' : ''}" data-expand="${top1.id}">
            <div class="podium-crown">👑 🥇</div>
            <div class="podium-rank" style="color:#b45309">1º Puesto</div>
            <div class="podium-name" style="font-size:1.15rem">${esc(top1.name)} ${top1.isMe ? '<span class="badge-you">Tú</span>' : ''}</div>
            <div class="podium-score" style="color:${top1.metrics.grade.color};font-size:1.8rem">${top1.metrics.expectedScore}<span style="font-size:1rem;color:var(--muted)">/10</span></div>
            <div style="margin-top:4px"><span class="badge-grade ${top1.metrics.grade.cls}">${top1.metrics.grade.text}</span></div>
            <div class="small muted" style="margin-top:6px">${top1.metrics.coverage}% visto · ${top1.metrics.totalReviews} reps</div>
          </div>` : ''}
        ${top3 ? `
          <div class="podium-slot third ${top3.isMe ? 'is-me' : ''}" data-expand="${top3.id}">
            <div class="podium-crown">🥉</div>
            <div class="podium-rank">3º Puesto</div>
            <div class="podium-name">${esc(top3.name)} ${top3.isMe ? '<span class="badge-you">Tú</span>' : ''}</div>
            <div class="podium-score" style="color:${top3.metrics.grade.color}">${top3.metrics.expectedScore}<span style="font-size:.85rem;color:var(--muted)">/10</span></div>
            <div style="margin-top:4px"><span class="badge-grade ${top3.metrics.grade.cls}">${top3.metrics.grade.text}</span></div>
            <div class="small muted" style="margin-top:6px">${top3.metrics.coverage}% visto · ${top3.metrics.totalReviews} reps</div>
          </div>` : ''}
      </div>`;
  }

  // Lista de usuarios
  const listRows = usersWithMetrics.map((u) => {
    const isExpanded = state.expandedUserId === u.id;
    const m = u.metrics;
    const medalCls = u.rank === 1 ? 'medal-1' : u.rank === 2 ? 'medal-2' : u.rank === 3 ? 'medal-3' : '';
    const medalIcon = u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`;

    let breakdownHtml = '';
    if (isExpanded) {
      const topicGrid = m.topicsBreakdown && m.topicsBreakdown.length ? `
        <div style="margin-top:12px">
          <div class="small muted" style="font-weight:700;text-transform:uppercase">Nota y dominio por temas</div>
          <div class="topic-breakdown-grid">
            ${m.topicsBreakdown.map((t) => `
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
              </div>`).join('')}
          </div>
        </div>` : '';

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
            <div style="font-size:.75rem;color:var(--muted);margin-top:4px">
              ${isExpanded ? '▲ Ocultar' : '▼ Detalle'}
            </div>
          </div>
        </div>
        ${breakdownHtml}
      </div>`;
  }).join('');

  $app.innerHTML = `
    <div class="header row spread">
      <div>
        <h1>🏆 Ranking de la Clase</h1>
        <div class="muted small">${esc(scopeLabel)} · predicción de nota en el examen</div>
      </div>
      <button class="link" id="rank-back-btn">← Volver al estudio</button>
    </div>

    <div class="tabs">
      <button data-rank-scope="all" class="${currentScope === 'all' ? 'active' : ''}">🌍 General (Todas)</button>
      ${SUBJECTS.map((s) => `
        <button data-rank-scope="${s.id}" class="${currentScope === s.id ? 'active' : ''}">${esc(s.name)}</button>
      `).join('')}
    </div>

    ${myEntry ? `
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
      </div>` : ''}

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

// ---------------- Estudio ----------------

function shuffledOrder(q) {
  const idx = q.options.map((_, i) => i);
  if (q.options === TF) return idx; // True/False siempre en el mismo orden
  const pinned = idx.filter((i) => /^(none of the above|any \()/i.test(q.options[i]));
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
  state.lastId = null;
  nextCard();
}

function nextCard() {
  stopTimer();
  const ids = scopeIds(state.scope);
  let id;
  if (state.practice) {
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
  const c = SRS.counts(scopeIds(state.scope), state.user.cards);
  return `<div class="row spread header">
    <button class="link" id="back">← Volver</button>
    <span class="tag">${esc(state.scope === 'all' ? 'Global' : 'Tema ' + state.scope)}</span>
    ${state.practice ? '<span class="muted small">práctica</span>' : `<div class="counts" title="Nuevas · Aprendiendo · Repaso">
      <span class="n-new">${c.new}</span><span class="n-learn">${c.dueLearn}</span><span class="n-review">${c.dueReview}</span></div>`}
  </div>`;
}

function renderCard() {
  const { id, order, sel, picked, correct } = state.current;
  const q = Q[id];
  const multi = isMulti(q);
  const card = state.user.cards[id] || SRS.newCard();
  const answered = picked !== null;

  const options = order.map((oi, pos) => {
    let cls = 'option';
    if (answered) {
      if (isRight(q, oi)) cls += multi && !picked.includes(oi) ? ' correct missed' : ' correct';
      else if ([].concat(picked).includes(oi)) cls += ' wrong';
      else cls += ' dim';
    } else if (sel.includes(oi)) cls += ' selected';
    return `<button class="${cls}" data-opt="${oi}" ${answered ? 'disabled' : ''}>
      <span class="letter">${LETTERS[pos]}</span><span>${esc(q.options[oi])}</span></button>`;
  }).join('');

  let after = '';
  if (answered) {
    const fb = `<div class="feedback ${correct ? 'ok' : 'bad'}">
      <b class="${correct ? 'ok' : 'bad'}">${correct ? '✓ ¡Correcto!' : `✗ Incorrecto. ${[].concat(q.answer).length > 1 ? 'Eran' : 'Era'}: ${[].concat(q.answer).map((i) => esc(q.options[i])).join(' · ')}`}</b>
      ${q.explain ? `<p>${rich(q.explain)}</p>` : ''}</div>`;
    if (state.practice) {
      after = fb + `<div class="grades one"><button class="primary" data-next>Siguiente</button></div>`;
    } else {
      const pv = SRS.preview(card);
      const ratings = correct ? ['again', 'hard', 'good', 'easy'] : ['again'];
      after = fb + `<div class="grades ${correct ? '' : 'one'}">${ratings.map((r) =>
        `<button class="grade ${r}" data-rate="${r}"><span>${RATING_LABEL[r]}</span><small>${pv[r]}</small></button>`).join('')}</div>`;
    }
  }

  const isNew = card.state === 'new';
  $app.innerHTML = `${topBar()}
    ${state.practice ? '<div class="banner">Modo práctica: tus respuestas cuentan en el historial, pero no cambian cuándo vuelve cada tarjeta.</div>' : ''}
    <div class="card">
      <div class="row spread small muted"><span>${esc(topicName(q.topic))}</span>
        <span>${isNew ? '<span class="n-new">nueva</span>' : SRS.isLearning(card) ? '<span class="n-learn">aprendiendo</span>' : '<span class="n-review">repaso</span>'}</span></div>
      <div class="question">${questionHtml(q.q)}</div>
      ${multi ? '<div class="muted small multi-hint">Marca todas las correctas</div>' : ''}
      <div class="options">${options}</div>
      ${multi && !answered ? `<div class="grades one"><button class="primary" data-check ${sel.length ? '' : 'disabled'}>Comprobar</button></div>` : ''}
      ${after}
    </div>
    <div class="kbd">${answered ? (correct && !state.practice ? 'Teclas: 1 Otra vez · 2 Difícil · 3/espacio Bien · 4 Fácil' : 'Espacio para continuar')
      : `Teclas: 1–${order.length} o ${LETTERS.slice(0, order.length).split('').join('/')}${multi ? ' para marcar · Enter para comprobar' : ''}`}</div>`;

  $app.querySelector('#back').onclick = showDashboard;
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
  const body = { qid: id, rating, correct, practice: state.practice };
  if (!state.practice) {
    const next = SRS.schedule(user.cards[id] || SRS.newCard(), rating);
    user.cards[id] = next;
    body.card = next;
  }
  user.log.push({ t: Date.now(), qid: id, rating, correct, practice: state.practice });
  state.lastId = id;
  call('POST', `/api/users/${user.id}/review`, body).catch((e) => toast('No se pudo guardar: ' + e.message));
  nextCard();
}

function showDone() {
  const c = SRS.counts(scopeIds(state.scope), state.user.cards);
  const wait = c.nextDue ? SRS.formatDelay(c.nextDue - Date.now()) : null;
  $app.innerHTML = `${topBar()}
    <div class="card" style="text-align:center">
      <div style="font-size:2.5rem">🎉</div>
      <h2 style="margin-top:6px">¡Al día con ${esc(scopeName(state.scope))}!</h2>
      <p class="muted">No te toca ninguna tarjeta ahora.${wait ? ` La próxima vuelve en <b>${wait}</b>.` : ''}</p>
      <div class="row" style="justify-content:center;flex-wrap:wrap">
        <button class="primary" id="practice">Practicar igualmente</button>
        <button id="home">Volver al panel</button>
      </div>
      <p class="muted small">«Practicar igualmente» te pregunta al azar sin cambiar la programación (útil la víspera del examen).</p>
    </div>`;
  $app.querySelector('#back').onclick = showDashboard;
  $app.querySelector('#home').onclick = showDashboard;
  $app.querySelector('#practice').onclick = () => { state.practice = true; nextCard(); };
  // Si una tarjeta de aprendizaje vence mientras esperas, se reanuda sola.
  state.timer = setInterval(() => {
    if (SRS.pickNext(scopeIds(state.scope), state.user.cards, Date.now())) nextCard();
  }, 15000);
}

// ---------------- Teclado ----------------

document.addEventListener('keydown', (e) => {
  if (!state.current || !document.querySelector('.options') || e.target.tagName === 'INPUT') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const cur = state.current;
  const k = e.key.toLowerCase();
  if (cur.picked === null) {
    if (k === 'enter') { e.preventDefault(); checkMulti(); return; }
    let pos = '123456'.indexOf(k);
    if (pos < 0) pos = 'abcdef'.indexOf(k);
    if (pos >= 0 && pos < cur.order.length) answer(cur.order[pos]);
    return;
  }
  if (state.practice || !cur.correct) {
    if (k === ' ' || k === 'enter' || k === '1') { e.preventDefault(); rate(cur.correct ? 'good' : 'again'); }
    return;
  }
  const map = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy', ' ': 'good', enter: 'good' };
  if (map[k]) { e.preventDefault(); rate(map[k]); }
});

// ---------------- Inicio ----------------

const saved = localStorage.getItem('lewis-quiz-user');
saved ? openUser(saved) : showUsers();
