// Lewis Quiz: Entorno de Estudio Colaborativo con Jev AI y SRS (Spaced Repetition)
// Soporta: Proyectos Compartidos entre cuentas, Conversión de Documentos a Preguntas,
// Ranking de Preguntas por dificultad y votos, Selección de Tipos de Preguntas y
// Corrector Inteligente Jev para preguntas abiertas.

const $app = document.getElementById('app');

// Diccionario reactivo de preguntas
const Q = Object.fromEntries(SUBJECTS.flatMap((s) => s.questions.map((q) => [q.id, q])));
const LETTERS = 'ABCDEF';
const RATING_LABEL = { again: 'Otra vez', hard: 'Difícil', good: 'Bien', easy: 'Fácil' };

const state = {
  users: [],
  user: null, // { id, name, cards, log }
  projects: [], // Proyectos colaborativos remotos + asignaturas
  currentProjectId: localStorage.getItem('lewis-quiz-project') || 'statistical-programming',
  subject: SUBJECTS[0], // Proyecto/asignatura activa
  scope: 'all', // 'all' o id del tema
  typeFilter: 'all', // 'all', 'single', 'tf', 'open', 'multi'
  practice: false,
  current: null, // { id, order, sel, picked, correct, studentText, jevResult, jevLoading }
  lastId: null,
  timer: null,
  rankingScope: 'all',
  rankingSort: 'score',
  expandedUserId: null,
  cachedRanking: null,
  questionRanking: [], // Ranking de preguntas del proyecto
  questionRankingFilter: 'all', // 'all', 'single', 'tf', 'open', 'multi'
  questionRankingSort: 'errorRate', // 'errorRate', 'popularity', 'attempts'
  activeModal: null, // 'new-project', 'share-project', 'convert-doc', 'question-ranking'
  docPreviewQuestions: [], // Preguntas generadas pendientes de confirmar
};

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
const questionHtml = (s) => esc(s).replace(/(?:^.*\S {2,}\S.*(?:\n|$))+/gm, (m) => `<pre>${m.replace(/\n$/, '')}</pre>`);

async function call(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
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
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

// ---------------- Helpers de Preguntas y Filtros ----------------

function getActiveQuestions() {
  return state.subject ? state.subject.questions || [] : [];
}

function registerQuestions(questions) {
  for (const q of questions) {
    Q[q.id] = q;
  }
}

function getQuestionType(q) {
  if (q.type) return q.type;
  if (Array.isArray(q.answer)) return 'multi';
  if (q.options && q.options.length === 2 && /^(true|verdadero)$/i.test(q.options[0])) return 'tf';
  if (q.idealAnswer && (!q.options || !q.options.length)) return 'open';
  return 'single';
}

function typeBadge(type) {
  switch (type) {
    case 'open':
      return `<span class="tag qtype qtype-open">🤖 Abierta · Jev</span>`;
    case 'tf':
      return `<span class="tag qtype qtype-tf">✓/✗ V/F</span>`;
    case 'multi':
      return `<span class="tag qtype qtype-multi">☑ Multi-selección</span>`;
    default:
      return `<span class="tag qtype qtype-single">🎯 Test</span>`;
  }
}

const scopeIds = (scope, typeFilter = state.typeFilter) => {
  return getActiveQuestions()
    .filter((q) => {
      const matchTopic = scope === 'all' || q.topic === scope;
      const qType = getQuestionType(q);
      const matchType = typeFilter === 'all' || qType === typeFilter;
      return matchTopic && matchType;
    })
    .map((q) => q.id);
};

const scopeName = (scope) => (scope === 'all' ? `${state.subject.name} · todos los temas` : topicName(scope));
const topicName = (id) => {
  const t = (state.subject.topics || []).find((t) => t.id === id);
  return t ? t.name : `Tema ${id}`;
};

const isMulti = (q) => getQuestionType(q) === 'multi';
const isOpen = (q) => getQuestionType(q) === 'open';
const isRight = (q, oi) => (isMulti(q) ? (q.answer || []).includes(oi) : q.answer === oi);

function timeAgo(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

// ---------------- Métricas Académicas y Nota Esperada ----------------

function getGradeInfo(score) {
  if (score >= 9.0) return { text: 'Sobresaliente', cls: 'badge-sobresaliente', color: '#f59e0b' };
  if (score >= 7.0) return { text: 'Notable', cls: 'badge-notable', color: '#15803d' };
  if (score >= 5.0) return { text: 'Aprobado', cls: 'badge-aprobado', color: '#2563eb' };
  return { text: 'Suspenso', cls: 'badge-suspenso', color: '#b91c1c' };
}

function calcUserMetrics(user, subjectOrAll) {
  const isAll = subjectOrAll === 'all';
  const questions = isAll ? getAllAvailableQuestions() : subjectOrAll.questions || [];
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
      const tQuestions = (subjectOrAll.questions || []).filter((q) => q.topic === t.id);
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

  let advice = '';
  if (coverage < 50) {
    advice = `Has visto el ${coverage}% del temario. Desbloquea las ${total - studied} preguntas restantes para aspirar a aprobar el examen.`;
  } else if (coverage < 100) {
    advice = `Llevas un ${coverage}% de cobertura. Te faltan ${total - studied} preguntas nuevas por estudiar para consolidar la materia.`;
  } else if (mature < total * 0.5) {
    advice = `¡Has cubierto el 100% de las preguntas! Ahora consolida las ${young + learning} tarjetas en repaso para convertir tu ${expectedScore}/10 en Sobresaliente.`;
  } else {
    advice = `¡Gran preparación! Tienes ${mature} tarjetas completamente dominadas con un acierto del ${accuracyPct}%. Mantén los repasos periódicos.`;
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

function getAllAvailableQuestions() {
  const set = new Map();
  for (const s of SUBJECTS) {
    for (const q of s.questions) set.set(q.id, q);
  }
  for (const p of state.projects) {
    for (const q of p.questions || []) set.set(q.id, q);
  }
  return Array.from(set.values());
}

// ---------------- Gestión de Proyectos Colaborativos ----------------

async function loadProjects() {
  try {
    const list = await call('GET', '/api/projects');
    // Combinar con los SUBJECTS integrados si no están en la lista remota
    const builtInProjects = SUBJECTS.map((s) => ({
      id: s.id,
      name: s.name,
      description: `Asignatura oficial con ${s.questions.length} preguntas estructuradas.`,
      ownerId: null,
      isPublic: true,
      members: state.users.map((u) => u.id),
      topics: s.topics,
      questions: s.questions,
      documents: [],
    }));

    const merged = [...builtInProjects];
    for (const remoteProj of list) {
      const existingIdx = merged.findIndex((p) => p.id === remoteProj.id);
      if (existingIdx >= 0) {
        // Enriquecer con preguntas remotas
        merged[existingIdx] = { ...merged[existingIdx], ...remoteProj };
      } else {
        merged.push(remoteProj);
      }
    }

    state.projects = merged;

    // Registrar todas las preguntas en el índice Q
    for (const p of state.projects) {
      if (p.questions) registerQuestions(p.questions);
    }

    // Seleccionar proyecto activo
    const curr = state.projects.find((p) => p.id === state.currentProjectId) || state.projects[0];
    if (curr) {
      state.currentProjectId = curr.id;
      state.subject = curr;
    }
  } catch (e) {
    console.warn('No se pudieron cargar proyectos remotos:', e);
    state.projects = SUBJECTS;
  }
}

function switchProject(projId) {
  const p = state.projects.find((x) => x.id === projId);
  if (!p) return;
  state.currentProjectId = p.id;
  state.subject = p;
  state.scope = 'all';
  state.typeFilter = 'all';
  localStorage.setItem('lewis-quiz-project', p.id);
  showDashboard();
}

// ---------------- Vistas Principales ----------------

async function showUsers() {
  stopTimer();
  state.user = null;
  try {
    state.users = await call('GET', '/api/users');
  } catch (e) {
    toast(e.message);
  }
  await loadProjects();

  $app.innerHTML = `
    <div class="header row spread">
      <div>
        <h1>🧠 Lewis Quiz · Estudio Colaborativo</h1>
        <div class="muted">Proyectos compartidos · Documentos a preguntas · Corrector Jev AI · SRS</div>
      </div>
      <button class="btn-ranking" id="public-ranking-btn">🏆 Ranking de la clase</button>
    </div>
    <div class="card stack">
      <h2 style="margin-top:0">¿Quién eres?</h2>
      ${
        state.users.length
          ? `<div class="users">${state.users.map((u) => `<button data-user="${u.id}">👤 ${esc(u.name)}</button>`).join('')}</div>`
          : '<p class="muted">Aún no hay usuarios creados. Crea tu perfil para comenzar:</p>'
      }
      <form id="new-user" class="row" style="margin-top:16px">
        <input name="name" placeholder="Tu nombre o alias" maxlength="40" required style="flex:1">
        <button class="primary">Entrar / Crear</button>
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
    await loadProjects();
    showDashboard();
  } catch (e) {
    localStorage.removeItem('lewis-quiz-user');
    showUsers();
  }
}

// ---------------- Dashboard ----------------

function showDashboard() {
  stopTimer();
  state.practice = false;
  state.current = null;
  const { user, subject, typeFilter } = state;
  if (!user) return showUsers();

  const questions = getActiveQuestions();
  registerQuestions(questions);

  // Filtro de tipos de preguntas disponibles
  const typeCounts = {
    all: questions.length,
    single: questions.filter((q) => getQuestionType(q) === 'single').length,
    tf: questions.filter((q) => getQuestionType(q) === 'tf').length,
    open: questions.filter((q) => getQuestionType(q) === 'open').length,
    multi: questions.filter((q) => getQuestionType(q) === 'multi').length,
  };

  const filteredScopeIds = scopeIds(state.scope, typeFilter);
  const cAll = SRS.counts(filteredScopeIds, user.cards);
  const now = Date.now();
  const today = (user.log || []).filter((e) => e.t >= new Date().setHours(0, 0, 0, 0));
  const metrics = calcUserMetrics(user, subject);

  // Historial de fallos
  const fails = {};
  for (const e of user.log || []) {
    if (!e.correct && Q[e.qid]) fails[e.qid] = (fails[e.qid] || 0) + 1;
  }
  const worst = Object.entries(fails)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const recent = (user.log || []).slice(-5).reverse();

  // Miembros del proyecto colaborativo
  const members = subject.members || [];
  const memberUsers = state.users.filter((u) => members.includes(u.id));

  $app.innerHTML = `
    <!-- Barra Superior -->
    <div class="header row spread">
      <div>
        <div class="row" style="gap:8px">
          <h1>🧠 Lewis Quiz</h1>
          <span class="project-pill">Colaborativo</span>
        </div>
        <div class="muted small">Conectado como <b>${esc(user.name)}</b> · <button class="link small" id="switch" style="padding:0">cambiar usuario</button></div>
      </div>
      <div class="row" style="gap:8px">
        <button class="secondary btn-ranking" id="btn-q-ranking">📊 Ranking Preguntas</button>
        <button class="btn-ranking" id="btn-ranking">🏆 Ranking Alumnos</button>
      </div>
    </div>

    <!-- Selector de Proyecto Compartido -->
    <div class="project-hero">
      <div class="project-header-top">
        <div class="project-title-area">
          <span style="font-size:1.5rem">📁</span>
          <div>
            <div class="row" style="gap:8px">
              <select id="project-select" style="font-weight:700;font-size:1.05rem;border-color:var(--accent);background:var(--accent-soft);color:var(--text);padding:5px 10px">
                ${state.projects.map((p) => `<option value="${p.id}" ${p.id === subject.id ? 'selected' : ''}>${esc(p.name)} (${(p.questions || []).length} pregs)</option>`).join('')}
              </select>
              ${subject.isPublic ? '<span class="tag">Oficial</span>' : '<span class="tag" style="background:#dcfce7;color:#166534">Compartido</span>'}
            </div>
            <div class="muted small" style="margin-top:3px">${esc(subject.description || 'Proyecto compartido para estudio colaborativo.')}</div>
          </div>
        </div>
        
        <div class="project-actions">
          <button id="btn-share-project" title="Gestionar colaboradores" style="display:inline-flex;align-items:center;gap:6px">
            <span class="avatar-stack">
              ${memberUsers.slice(0, 3).map((m) => `<span class="avatar-circle" title="${esc(m.name)}">${esc(m.name.charAt(0).toUpperCase())}</span>`).join('')}
            </span>
            <span class="small"><b>${members.length}</b> colaboradores</span>
          </button>
          <button class="primary" id="btn-convert-doc" style="display:inline-flex;align-items:center;gap:6px">
            <span>📄</span> <b>Convertir Documento</b>
          </button>
          <button id="btn-new-project" title="Crear nuevo proyecto">➕</button>
        </div>
      </div>
    </div>

    <!-- Banner de Nota Esperada -->
    ${
      metrics
        ? `
      <div class="user-rank-banner" id="banner-ranking" title="Ver posición en el ranking de la clase">
        <div class="left">
          <div class="rank-badge">${metrics.expectedScore >= 9 ? '🌟' : metrics.expectedScore >= 7 ? '🎯' : metrics.expectedScore >= 5 ? '📘' : '📖'}</div>
          <div>
            <div style="font-weight:700">Nota esperada en examen: <b style="color:${metrics.grade.color};font-size:1.15rem">${metrics.expectedScore}/10</b> <span class="badge-grade ${metrics.grade.cls}">${metrics.grade.text}</span></div>
            <div class="small muted">
              Cobertura: <b>${metrics.coverage}%</b> · Repasos hoy: <b>${metrics.todayReviews}</b> · Tarjetas dominadas: <b>${metrics.mature}</b>
            </div>
          </div>
        </div>
        <button class="link small" style="pointer-events:none">Ver clasificación →</button>
      </div>`
        : ''
    }

    <!-- Selector de Tipos de Preguntas -->
    <div style="margin: 18px 0 10px">
      <div class="row spread">
        <span class="small muted"><b>Tipo de pregunta para estudiar:</b></span>
        <span class="small muted"><b>${filteredScopeIds.length}</b> disponibles</span>
      </div>
      <div class="type-filter-pills">
        <button class="type-filter-pill ${typeFilter === 'all' ? 'active' : ''}" data-type-filter="all">
          <span>🌟 Todos los tipos</span> <b>(${typeCounts.all})</b>
        </button>
        <button class="type-filter-pill ${typeFilter === 'single' ? 'active' : ''}" data-type-filter="single">
          <span>🎯 Solo Test</span> <b>(${typeCounts.single})</b>
        </button>
        <button class="type-filter-pill ${typeFilter === 'tf' ? 'active' : ''}" data-type-filter="tf">
          <span>✓/✗ Verdadero/Falso</span> <b>(${typeCounts.tf})</b>
        </button>
        <button class="type-filter-pill ${typeFilter === 'open' ? 'active' : ''}" data-type-filter="open">
          <span>🤖 Abiertas (Jev AI)</span> <b>(${typeCounts.open})</b>
        </button>
        <button class="type-filter-pill ${typeFilter === 'multi' ? 'active' : ''}" data-type-filter="multi">
          <span>☑ Multi-selección</span> <b>(${typeCounts.multi})</b>
        </button>
      </div>
    </div>

    <!-- Tarjeta Global de Estudio -->
    <div class="card stack" style="margin-top:14px">
      <div class="row spread">
        <div>
          <b>Estudio Global (${typeFilter === 'all' ? 'Todos los temas' : `Filtro: ${typeFilter}`})</b>
          <div class="counts" style="margin-top:4px">
            <span class="n-new">${cAll.new} nuevas</span> ·
            <span class="n-learn">${cAll.dueLearn} aprendiendo</span> ·
            <span class="n-review">${cAll.dueReview} repaso</span>
          </div>
        </div>
        <button class="primary" data-scope="all" ${filteredScopeIds.length ? '' : 'disabled'}>
          ${cAll.dueLearn || cAll.dueReview || cAll.new ? 'Estudiar ahora' : 'Practicar libre'}
        </button>
      </div>
      <div class="bar">
        <span style="width:${cAll.total ? (100 * cAll.new) / cAll.total : 0}%;background:var(--new)"></span>
        <span style="width:${cAll.total ? (100 * cAll.dueLearn) / cAll.total : 0}%;background:var(--learn)"></span>
        <span style="width:${cAll.total ? (100 * cAll.dueReview) / cAll.total : 0}%;background:var(--review)"></span>
      </div>
    </div>

    <!-- Temas del Proyecto -->
    <h2>Temas del Proyecto</h2>
    <div class="stack">
      ${(subject.topics || []).map((t) => {
        const tQuestions = scopeIds(t.id, typeFilter);
        const c = SRS.counts(tQuestions, user.cards);
        const hasDue = c.dueLearn || c.dueReview || c.new;
        return `
          <div class="card topic">
            <div class="info">
              <div class="name">${esc(t.name)}</div>
              <div class="counts" style="margin-top:2px">
                <span class="n-new">${c.new}</span> ·
                <span class="n-learn">${c.dueLearn}</span> ·
                <span class="n-review">${c.dueReview}</span> ·
                <span class="muted small">${tQuestions.length} pregs</span>
              </div>
              <div class="bar">
                <span style="width:${c.total ? (100 * c.new) / c.total : 0}%;background:var(--new)"></span>
                <span style="width:${c.total ? (100 * c.dueLearn) / c.total : 0}%;background:var(--learn)"></span>
                <span style="width:${c.total ? (100 * c.dueReview) / c.total : 0}%;background:var(--review)"></span>
              </div>
            </div>
            <button data-scope="${t.id}" ${tQuestions.length ? '' : 'disabled'}>${hasDue ? 'Estudiar' : 'Repasar'}</button>
          </div>`;
      }).join('')}
    </div>

    <!-- Historial y Estadísticas -->
    <h2>Tu Rendimiento en ${esc(subject.name)}</h2>
    <div class="stats">
      <div class="card stat"><b>${(user.log || []).length}</b><span class="muted small">respuestas</span></div>
      <div class="card stat"><b>${metrics && metrics.accuracyPct !== null ? metrics.accuracyPct + '%' : '–'}</b><span class="muted small">acierto</span></div>
      <div class="card stat"><b>${today.length}</b><span class="muted small">hoy</span></div>
    </div>

    ${
      worst.length
        ? `
      <div class="card" style="margin-top:10px">
        <b>Preguntas donde más fallas</b>
        <ul class="list small" style="margin-top:6px">
          ${worst.map(([id, n]) => `
            <li>
              <span class="bad">✗${n}</span>
              <span class="q" title="${esc(Q[id]?.q)}">${typeBadge(getQuestionType(Q[id]))} ${esc(Q[id]?.q)}</span>
              <span class="muted">T${Q[id]?.topic}</span>
            </li>`).join('')}
        </ul>
      </div>`
        : ''
    }

    ${
      recent.length
        ? `
      <div class="card" style="margin-top:10px">
        <b>Últimas respuestas</b>
        <ul class="list small" style="margin-top:6px">
          ${recent.map((e) => `
            <li>
              <span class="${e.correct ? 'ok' : 'bad'}">${e.correct ? '✓' : '✗'}</span>
              <span class="q" title="${esc(Q[e.qid]?.q)}">${typeBadge(getQuestionType(Q[e.qid]))} ${esc(Q[e.qid]?.q)}</span>
              <span class="muted">${e.practice ? 'práctica' : RATING_LABEL[e.rating]} · ${timeAgo(e.t)}</span>
            </li>`).join('')}
        </ul>
      </div>`
        : '<p class="muted small" style="margin-top:10px">Todavía no has respondido ninguna tarjeta en este proyecto.</p>'
    }

    <div class="row" style="margin-top:20px">
      <button class="link small" id="reset">Reiniciar mi progreso</button>
      <button class="link small" id="delete">Borrar usuario</button>
    </div>`;

  // Listeners
  $app.querySelector('#project-select').onchange = (e) => switchProject(e.target.value);
  $app.querySelectorAll('[data-type-filter]').forEach((btn) => {
    btn.onclick = () => {
      state.typeFilter = btn.dataset.typeFilter;
      showDashboard();
    };
  });
  $app.querySelectorAll('[data-scope]').forEach((b) => {
    b.onclick = () => startStudy(b.dataset.scope === 'all' ? 'all' : Number(b.dataset.scope));
  });

  $app.querySelector('#btn-share-project').onclick = () => openShareModal();
  $app.querySelector('#btn-new-project').onclick = () => openNewProjectModal();
  $app.querySelector('#btn-convert-doc').onclick = () => openConvertDocModal();
  $app.querySelector('#btn-q-ranking').onclick = () => showQuestionRanking();
  $app.querySelector('#btn-ranking').onclick = () => showRanking();
  const bannerRank = $app.querySelector('#banner-ranking');
  if (bannerRank) bannerRank.onclick = () => showRanking();
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

// ---------------- Modales: Proyectos y Documentos ----------------

function openNewProjectModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h2>➕ Crear Proyecto Compartido</h2>
        <button class="link" id="close-modal" style="font-size:1.2rem">✕</button>
      </div>
      <form id="form-new-proj" class="stack">
        <div>
          <label class="small muted">Nombre del proyecto / grupo de estudio</label>
          <input name="name" placeholder="Ej: Preparación Examen Machine Learning" required style="width:100%;margin-top:4px">
        </div>
        <div>
          <label class="small muted">Descripción u objetivo</label>
          <input name="description" placeholder="Ej: Apuntes colaborativos y preguntas clave del temario" style="width:100%;margin-top:4px">
        </div>
        <div>
          <label class="small muted">Temas iniciales (uno por línea)</label>
          <textarea name="topics" rows="3" style="margin-top:4px">Tema 1: Fundamentos y Conceptos Clave
Tema 2: Casos Prácticos y Algoritmos</textarea>
        </div>
        <div class="row spread" style="margin-top:14px">
          <button type="button" id="cancel-proj">Cancelar</button>
          <button type="submit" class="primary">Crear Proyecto</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('#close-modal').onclick = close;
  modal.querySelector('#cancel-proj').onclick = close;

  modal.querySelector('#form-new-proj').onsubmit = async (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    const description = e.target.description.value.trim();
    const topicsRaw = e.target.topics.value.trim().split('\n').filter(Boolean);
    const topics = topicsRaw.map((t, idx) => ({ id: idx + 1, name: t.trim() }));

    try {
      const newProj = await call('POST', '/api/projects', {
        name,
        description,
        ownerId: state.user.id,
        members: [state.user.id],
        topics: topics.length ? topics : [{ id: 1, name: 'General' }],
        questions: [],
      });
      close();
      toast('¡Proyecto colaborativo creado!');
      await loadProjects();
      switchProject(newProj.id);
    } catch (err) {
      toast('Error al crear proyecto: ' + err.message);
    }
  };
}

function openShareModal() {
  const { subject, users, user } = state;
  const members = subject.members || [];
  const nonMembers = users.filter((u) => !members.includes(u.id));

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h2>👥 Colaboradores del Proyecto</h2>
        <button class="link" id="close-modal" style="font-size:1.2rem">✕</button>
      </div>
      <p class="muted small">Los miembros pueden añadir documentos, generar preguntas y compartir sus estadísticas y votos en este proyecto.</p>

      <div style="margin:16px 0">
        <label class="small muted"><b>Miembros actuales (${members.length})</b></label>
        <div class="stack" style="margin-top:8px">
          ${members.map((mid) => {
            const u = users.find((x) => x.id === mid) || { name: 'Usuario ' + mid.slice(0, 6) };
            const isMe = user.id === mid;
            const isOwner = subject.ownerId === mid;
            return `
              <div class="row spread card" style="padding:10px 14px">
                <div class="row" style="gap:10px">
                  <span class="avatar-circle">${esc(u.name.charAt(0).toUpperCase())}</span>
                  <div>
                    <b>${esc(u.name)}</b> ${isMe ? '<span class="badge-you">TÚ</span>' : ''}
                    <div class="small muted">${isOwner ? '👑 Creador del proyecto' : 'Colaborador'}</div>
                  </div>
                </div>
                ${!isOwner && !isMe ? `<button class="link small bad" data-remove-member="${mid}">Quitar</button>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>

      ${
        nonMembers.length
          ? `
        <div style="margin-top:20px;border-top:1px solid var(--line);padding-top:16px">
          <label class="small muted"><b>Invitar a otra cuenta de alumno:</b></label>
          <div class="row" style="margin-top:8px">
            <select id="invite-user-select" style="flex:1">
              ${nonMembers.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}
            </select>
            <button class="primary" id="btn-invite">Añadir al Proyecto</button>
          </div>
        </div>`
          : '<p class="small muted" style="margin-top:16px">Todos los usuarios registrados ya forman parte de este proyecto.</p>'
      }
    </div>`;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('#close-modal').onclick = close;

  const inviteBtn = modal.querySelector('#btn-invite');
  if (inviteBtn) {
    inviteBtn.onclick = async () => {
      const uid = modal.querySelector('#invite-user-select').value;
      try {
        await call('POST', `/api/projects/${subject.id}/members`, { userId: uid });
        toast('Colaborador añadido');
        close();
        await loadProjects();
        showDashboard();
      } catch (err) {
        toast('Error al invitar: ' + err.message);
      }
    };
  }

  modal.querySelectorAll('[data-remove-member]').forEach((b) => {
    b.onclick = async () => {
      const uid = b.dataset.removeMember;
      try {
        await call('DELETE', `/api/projects/${subject.id}/members/${uid}`);
        toast('Colaborador eliminado');
        close();
        await loadProjects();
        showDashboard();
      } catch (err) {
        toast('Error al quitar: ' + err.message);
      }
    };
  });
}

function openConvertDocModal() {
  const { subject } = state;
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:720px">
      <div class="modal-header">
        <div>
          <h2>📄 Convertir Documento en Preguntas</h2>
          <div class="muted small">Genera automáticamente preguntas tipo test, V/F, multi-selección y abiertas (corregidas por Jev)</div>
        </div>
        <button class="link" id="close-modal" style="font-size:1.2rem">✕</button>
      </div>

      <div id="step-input" class="stack">
        <div class="row spread">
          <label class="small muted"><b>Pega aquí tus apuntes, notas o examen en Markdown/Texto</b></label>
          <div class="row" style="gap:6px">
            <button type="button" class="link small" id="load-sample-btn">Cargar apuntes de ejemplo</button>
            <label class="link small" style="cursor:pointer;margin:0">
              📂 Subir archivo .txt / .md
              <input type="file" id="file-upload" accept=".md,.txt" style="display:none">
            </label>
          </div>
        </div>
        <textarea id="doc-text" rows="7" placeholder="Pega aquí el texto de tus clases, apuntes o cuestionarios..." style="font-size:.9rem"></textarea>

        <div class="row spread" style="gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <label class="small muted">Tema de destino:</label>
            <select id="doc-topic-select" style="width:100%;margin-top:4px">
              ${(subject.topics || []).map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
            </select>
          </div>
          <div style="width:140px">
            <label class="small muted">Máximo a generar:</label>
            <input type="number" id="doc-max-q" value="20" min="2" max="60" style="width:100%;margin-top:4px">
          </div>
        </div>

        <div>
          <label class="small muted"><b>Tipos de preguntas a generar:</b></label>
          <div class="row" style="gap:14px;flex-wrap:wrap;margin-top:6px;font-size:.9rem">
            <label><input type="checkbox" id="gen-single" checked> 🎯 Opción múltiple</label>
            <label><input type="checkbox" id="gen-tf" checked> ✓/✗ Verdadero/Falso</label>
            <label><input type="checkbox" id="gen-open" checked> 🤖 Abiertas (Jev AI)</label>
            <label><input type="checkbox" id="gen-multi" checked> ☑ Multi-selección</label>
          </div>
        </div>

        <div class="row spread" style="margin-top:16px">
          <button type="button" id="cancel-convert">Cancelar</button>
          <button type="button" class="primary" id="btn-analyze-doc">⚡ Analizar y Previsualizar Preguntas</button>
        </div>
      </div>

      <div id="step-preview" style="display:none" class="stack">
        <div class="row spread">
          <b id="preview-count-label">Preguntas generadas</b>
          <button class="link small" id="back-to-input">← Cambiar texto / opciones</button>
        </div>
        <div id="preview-container" style="max-height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:4px"></div>
        <div class="row spread" style="margin-top:16px;border-top:1px solid var(--line);padding-top:12px">
          <button type="button" id="cancel-preview">Cancelar</button>
          <button type="button" class="primary" id="btn-confirm-import">📥 Incorporar al Proyecto Compartido</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('#close-modal').onclick = close;
  modal.querySelector('#cancel-convert').onclick = close;
  modal.querySelector('#cancel-preview').onclick = close;

  const docTextEl = modal.querySelector('#doc-text');
  const fileUploadEl = modal.querySelector('#file-upload');
  fileUploadEl.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        docTextEl.value = ev.target.result;
      };
      reader.readAsText(file);
    }
  };

  modal.querySelector('#load-sample-btn').onclick = () => {
    docTextEl.value = `# Apuntes de Repaso: Estructuras y Algoritmos
- Un compilador traduce el código fuente a código máquina antes de la ejecución, detectando errores de sintaxis en tiempo de compilación.
- Los arrays de NumPy son colecciones homogéneas en tipo de datos y optimizadas para operaciones vectoriales rápidas.
- Un diccionario en Python almacena parejas clave-valor donde cada clave debe ser inmutable y única.
- La búsqueda binaria requiere que la lista esté previamente ordenada y tiene complejidad temporal O(log n).
- La semántica en un lenguaje de programación define el significado y comportamiento real de las sentencias del código.`;
  };

  modal.querySelector('#btn-analyze-doc').onclick = async () => {
    const text = docTextEl.value.trim();
    if (!text) return toast('Pega o escribe texto antes de continuar');

    const types = [];
    if (modal.querySelector('#gen-single').checked) types.push('single');
    if (modal.querySelector('#gen-tf').checked) types.push('tf');
    if (modal.querySelector('#gen-open').checked) types.push('open');
    if (modal.querySelector('#gen-multi').checked) types.push('multi');
    if (!types.length) return toast('Selecciona al menos un tipo de pregunta');

    const targetTopic = Number(modal.querySelector('#doc-topic-select').value) || 1;
    const maxQ = Number(modal.querySelector('#doc-max-q').value) || 20;

    const btn = modal.querySelector('#btn-analyze-doc');
    btn.disabled = true;
    btn.textContent = 'Analizando con modelo...';

    try {
      const res = await call('POST', `/api/projects/${subject.id}/convert-doc`, {
        text,
        title: 'Documento importado',
        targetTopic,
        types,
        maxQuestions: maxQ,
        autoImport: false, // Previsualizar primero
      });

      state.docPreviewQuestions = res.questions || [];
      renderDocPreview(modal);
    } catch (err) {
      toast('Error al analizar: ' + err.message);
      btn.disabled = false;
      btn.textContent = '⚡ Analizar y Previsualizar Preguntas';
    }
  };

  modal.querySelector('#back-to-input').onclick = () => {
    modal.querySelector('#step-preview').style.display = 'none';
    modal.querySelector('#step-input').style.display = 'block';
  };
}

function renderDocPreview(modal) {
  modal.querySelector('#step-input').style.display = 'none';
  const previewStep = modal.querySelector('#step-preview');
  previewStep.style.display = 'block';

  const questions = state.docPreviewQuestions;
  modal.querySelector('#preview-count-label').textContent = `${questions.length} preguntas extraídas listas para incorporar:`;

  const container = modal.querySelector('#preview-container');
  container.innerHTML = questions
    .map(
      (q, idx) => `
    <div class="doc-preview-item" data-q-idx="${idx}">
      <div class="row spread" style="margin-bottom:6px">
        <div class="row" style="gap:8px">
          <input type="checkbox" checked data-toggle-q="${idx}" title="Incluir en el proyecto">
          ${typeBadge(q.type)}
          <span class="small muted">Pregunta #${idx + 1}</span>
        </div>
      </div>
      <div style="font-weight:600;margin-bottom:6px">${esc(q.q)}</div>
      ${
        q.type === 'open'
          ? `<div class="small muted"><b>Solución esperada (Jev):</b> ${esc(q.idealAnswer)}</div>`
          : q.type === 'tf'
          ? `<div class="small muted"><b>Respuesta correcta:</b> ${q.answer === 0 ? 'Verdadero' : 'Falso'} · <i>${esc(q.explain)}</i></div>`
          : `<div class="small muted"><b>Opciones:</b> ${(q.options || []).map((o, oi) => `${isRight(q, oi) ? '<b>' : ''}${LETTERS[oi]}) ${esc(o)}${isRight(q, oi) ? ' ✓</b>' : ''}`).join(' · ')}</div>`
      }
    </div>`
    )
    .join('');

  modal.querySelector('#btn-confirm-import').onclick = async () => {
    const includedIndices = Array.from(modal.querySelectorAll('[data-toggle-q]:checked')).map((el) => Number(el.dataset.toggleQ));
    const selectedQuestions = includedIndices.map((i) => state.docPreviewQuestions[i]);

    if (!selectedQuestions.length) return toast('Selecciona al menos una pregunta para importar.');

    try {
      await call('POST', `/api/projects/${state.subject.id}/questions`, { questions: selectedQuestions });
      toast(`¡${selectedQuestions.length} preguntas añadidas al proyecto compartido!`);
      modal.remove();
      await loadProjects();
      showDashboard();
    } catch (err) {
      toast('Error al importar: ' + err.message);
    }
  };
}

// ---------------- Ranking de Preguntas y Votaciones ----------------

async function showQuestionRanking() {
  stopTimer();
  $app.innerHTML = `
    <div class="header row spread">
      <div>
        <h1>📊 Ranking de Preguntas</h1>
        <div class="muted small">${esc(state.subject.name)} · tasa de fallos de la comunidad y valoración colaborativa</div>
      </div>
      <button class="link" id="q-rank-back">← Volver al panel</button>
    </div>
    <div class="card" style="text-align:center;padding:40px"><p class="muted">Analizando métricas colaborativas de las tarjetas…</p></div>`;

  $app.querySelector('#q-rank-back').onclick = showDashboard;

  try {
    const ranking = await call('GET', `/api/projects/${state.subject.id}/questions/ranking`);
    state.questionRanking = ranking;
    renderQuestionRankingView();
  } catch (err) {
    toast('Error al cargar ranking de preguntas: ' + err.message);
    showDashboard();
  }
}

function renderQuestionRankingView() {
  const { questionRanking, questionRankingFilter, questionRankingSort, user } = state;

  // Filtrar
  let list = questionRanking.filter((item) => {
    if (questionRankingFilter === 'all') return true;
    return item.type === questionRankingFilter;
  });

  // Ordenar
  list.sort((a, b) => {
    if (questionRankingSort === 'errorRate') {
      const rateA = a.errorRate !== null ? a.errorRate : -1;
      const rateB = b.errorRate !== null ? b.errorRate : -1;
      return rateB - rateA || b.totalAttempts - a.totalAttempts;
    }
    if (questionRankingSort === 'popularity') {
      return b.popularityScore - a.popularityScore || b.upvotes - a.upvotes;
    }
    if (questionRankingSort === 'attempts') {
      return b.totalAttempts - a.totalAttempts;
    }
    return 0;
  });

  $app.innerHTML = `
    <div class="header row spread">
      <div>
        <h1>📊 Ranking de Preguntas Colaborativo</h1>
        <div class="muted small">${esc(state.subject.name)} · <b>${questionRanking.length}</b> preguntas evaluadas</div>
      </div>
      <button class="link" id="q-rank-back">← Volver al panel</button>
    </div>

    <!-- Barra de Filtros y Ordenación -->
    <div class="filter-bar">
      <div class="type-filter-pills" style="margin:0">
        <button class="type-filter-pill ${questionRankingFilter === 'all' ? 'active' : ''}" data-q-filter="all">Todas (${questionRanking.length})</button>
        <button class="type-filter-pill ${questionRankingFilter === 'single' ? 'active' : ''}" data-q-filter="single">Test</button>
        <button class="type-filter-pill ${questionRankingFilter === 'tf' ? 'active' : ''}" data-q-filter="tf">V/F</button>
        <button class="type-filter-pill ${questionRankingFilter === 'open' ? 'active' : ''}" data-q-filter="open">Abiertas (Jev)</button>
        <button class="type-filter-pill ${questionRankingFilter === 'multi' ? 'active' : ''}" data-q-filter="multi">Multi</button>
      </div>

      <div class="row" style="gap:6px">
        <span class="small muted">Ordenar por:</span>
        <select id="q-sort-select" class="sort-select">
          <option value="errorRate" ${questionRankingSort === 'errorRate' ? 'selected' : ''}>⚠️ Tasa de error (% fallos)</option>
          <option value="popularity" ${questionRankingSort === 'popularity' ? 'selected' : ''}>⭐ Más votadas</option>
          <option value="attempts" ${questionRankingSort === 'attempts' ? 'selected' : ''}>⚡ Más practicadas</option>
        </select>
      </div>
    </div>

    <!-- Lista de Preguntas -->
    <div class="stack">
      ${list.map((item, index) => {
        const errorBadge =
          item.errorRate === null
            ? '<span class="q-difficulty-badge diff-unseen">Sin datos</span>'
            : item.errorRate >= 50
            ? `<span class="q-difficulty-badge diff-hard">${item.errorRate}% fallos · Trampa / Muy difícil</span>`
            : item.errorRate >= 25
            ? `<span class="q-difficulty-badge diff-med">${item.errorRate}% fallos · Dificultad media</span>`
            : `<span class="q-difficulty-badge diff-easy">${item.errorRate}% fallos · Fácil</span>`;

        return `
          <div class="q-ranking-card">
            <div class="row spread" style="margin-bottom:8px">
              <div class="row" style="gap:8px">
                <span style="font-weight:800;color:var(--muted)">#${index + 1}</span>
                ${typeBadge(item.type)}
                ${errorBadge}
                <span class="small muted">Tema ${item.topic}</span>
              </div>
              <div class="row" style="gap:6px">
                <button class="q-vote-btn" data-vote="up" data-qid="${item.id}" title="Votar positivo">👍 ${item.upvotes}</button>
                <button class="q-vote-btn" data-vote="star" data-qid="${item.id}" title="Destacar pregunta">⭐ ${item.stars}</button>
              </div>
            </div>

            <div style="font-weight:600;font-size:1.02rem;margin-bottom:10px">${esc(item.q)}</div>

            <div class="row spread" style="border-top:1px solid var(--line);padding-top:8px">
              <div class="small muted">
                Intentos totales en la clase: <b>${item.totalAttempts}</b> · Aciertos: <b class="ok">${item.successfulAttempts}</b> · Fallos: <b class="bad">${item.failedAttempts}</b>
              </div>
              <button class="primary small" data-practice-single="${item.id}" style="padding:4px 12px">🎯 Practicar esta tarjeta</button>
            </div>
          </div>`;
      }).join('')}
    </div>`;

  $app.querySelector('#q-rank-back').onclick = showDashboard;

  $app.querySelectorAll('[data-q-filter]').forEach((btn) => {
    btn.onclick = () => {
      state.questionRankingFilter = btn.dataset.qFilter;
      renderQuestionRankingView();
    };
  });

  const sortSel = $app.querySelector('#q-sort-select');
  if (sortSel) {
    sortSel.onchange = (e) => {
      state.questionRankingSort = e.target.value;
      renderQuestionRankingView();
    };
  }

  $app.querySelectorAll('[data-vote]').forEach((btn) => {
    btn.onclick = async () => {
      const qid = btn.dataset.qid;
      const voteType = btn.dataset.vote;
      try {
        await call('POST', `/api/questions/${qid}/vote`, {
          userId: user.id,
          vote: voteType,
          tag: voteType === 'star' ? 'imprescindible' : 'buena',
        });
        toast('¡Voto registrado!');
        showQuestionRanking();
      } catch (err) {
        toast('Error al votar: ' + err.message);
      }
    };
  });

  $app.querySelectorAll('[data-practice-single]').forEach((btn) => {
    btn.onclick = () => {
      const qid = btn.dataset.practiceSingle;
      state.practice = true;
      state.current = {
        id: qid,
        order: shuffledOrder(Q[qid]),
        sel: [],
        picked: null,
        correct: null,
        studentText: '',
        jevResult: null,
        jevLoading: false,
      };
      renderCard();
    };
  });
}

// ---------------- Ranking de Alumnos / Clase ----------------

async function showRanking() {
  stopTimer();
  $app.innerHTML = `
    <div class="header row spread">
      <button class="link" id="rank-back">← Volver</button>
      <span class="tag">🏆 Clasificación de Alumnos</span>
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

  if (state.user) {
    const idx = allUsersData.findIndex((u) => u.id === state.user.id);
    if (idx >= 0) allUsersData[idx] = state.user;
    else allUsersData.push(state.user);
  }

  renderRankingView(allUsersData);
}

function renderRankingView(allUsersData) {
  const currentScope = state.rankingScope;
  const selectedSubject = currentScope === 'all' ? 'all' : state.projects.find((s) => s.id === currentScope) || 'all';
  const scopeLabel = currentScope === 'all' ? 'Todas las asignaturas' : selectedSubject.name;

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

  usersWithMetrics.forEach((u, i) => {
    u.rank = i + 1;
  });

  const myEntry = usersWithMetrics.find((u) => u.isMe);
  const top1 = usersWithMetrics[0];
  const top2 = usersWithMetrics[1];
  const top3 = usersWithMetrics[2];

  const podiumHtml =
    usersWithMetrics.length >= 2
      ? `
    <div class="podium">
      ${
        top2
          ? `<div class="podium-slot second ${top2.isMe ? 'is-me' : ''}" data-expand="${top2.id}">
              <div class="podium-crown">🥈</div>
              <div class="podium-rank">2º Puesto</div>
              <div class="podium-name" title="${esc(top2.name)}">${esc(top2.name)} ${top2.isMe ? '<span class="badge-you">TÚ</span>' : ''}</div>
              <div class="podium-score" style="color:${top2.metrics.grade.color}">${top2.metrics.expectedScore}</div>
              <span class="badge-grade ${top2.metrics.grade.cls}">${top2.metrics.grade.text}</span>
            </div>`
          : ''
      }
      ${
        top1
          ? `<div class="podium-slot first ${top1.isMe ? 'is-me' : ''}" data-expand="${top1.id}">
              <div class="podium-crown">👑</div>
              <div class="podium-rank">1º Puesto</div>
              <div class="podium-name" title="${esc(top1.name)}">${esc(top1.name)} ${top1.isMe ? '<span class="badge-you">TÚ</span>' : ''}</div>
              <div class="podium-score" style="color:${top1.metrics.grade.color}">${top1.metrics.expectedScore}</div>
              <span class="badge-grade ${top1.metrics.grade.cls}">${top1.metrics.grade.text}</span>
            </div>`
          : ''
      }
      ${
        top3
          ? `<div class="podium-slot third ${top3.isMe ? 'is-me' : ''}" data-expand="${top3.id}">
              <div class="podium-crown">🥉</div>
              <div class="podium-rank">3º Puesto</div>
              <div class="podium-name" title="${esc(top3.name)}">${esc(top3.name)} ${top3.isMe ? '<span class="badge-you">TÚ</span>' : ''}</div>
              <div class="podium-score" style="color:${top3.metrics.grade.color}">${top3.metrics.expectedScore}</div>
              <span class="badge-grade ${top3.metrics.grade.cls}">${top3.metrics.grade.text}</span>
            </div>`
          : ''
      }
    </div>`
      : '';

  const listRows = usersWithMetrics
    .map((item) => {
      const m = item.metrics;
      const isExpanded = state.expandedUserId === item.id;
      const medalClass = item.rank === 1 ? 'medal-1' : item.rank === 2 ? 'medal-2' : item.rank === 3 ? 'medal-3' : '';
      const medalIcon = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank;

      return `
      <div>
        <div class="ranking-item ${item.isMe ? 'is-me' : ''}" data-expand="${item.id}">
          <div class="rank-num ${medalClass}">${medalIcon}</div>
          <div class="ranking-main-info">
            <div class="ranking-user-name">
              ${esc(item.name)}
              ${item.isMe ? '<span class="badge-you">TÚ</span>' : ''}
            </div>
            <div class="ranking-meta">
              <span>Cobertura: <b>${m.coverage}%</b></span> ·
              <span>Acierto: <b>${m.accuracyPct !== null ? m.accuracyPct + '%' : '–'}</b></span> ·
              <span>Repasos: <b>${m.totalReviews}</b></span>
            </div>
            <div class="score-meter" title="Progreso temario">
              <div class="score-meter-fill" style="width:${m.coverage}%;background:var(--accent)"></div>
            </div>
          </div>
          <div class="ranking-score-box">
            <div class="ranking-score-value" style="color:${m.grade.color}">
              ${m.expectedScore}<span class="ranking-score-denom">/10</span>
            </div>
            <span class="badge-grade ${m.grade.cls}">${m.grade.text}</span>
          </div>
        </div>
      </div>`;
    })
    .join('');

  $app.innerHTML = `
    <div class="header row spread">
      <div>
        <h1>🏆 Ranking de la Clase</h1>
        <div class="muted small">${esc(scopeLabel)} · predicción de nota en el examen</div>
      </div>
      <button class="link" id="rank-back-btn">← Volver al estudio</button>
    </div>

    <div class="tabs">
      <button data-rank-scope="all" class="${currentScope === 'all' ? 'active' : ''}">🌍 Todas</button>
      ${state.projects.map((s) => `<button data-rank-scope="${s.id}" class="${currentScope === s.id ? 'active' : ''}">${esc(s.name)}</button>`).join('')}
    </div>

    ${podiumHtml}

    <div class="filter-bar">
      <div class="small muted"><b>${usersWithMetrics.length}</b> alumnos registrados</div>
      <div class="row" style="gap:6px">
        <span class="small muted">Ordenar por:</span>
        <select id="rank-sort-select" class="sort-select">
          <option value="score" ${sortKey === 'score' ? 'selected' : ''}>🎯 Nota esperada</option>
          <option value="accuracy" ${sortKey === 'accuracy' ? 'selected' : ''}>📈 Tasa de acierto</option>
          <option value="coverage" ${sortKey === 'coverage' ? 'selected' : ''}>📚 Cobertura</option>
          <option value="mature" ${sortKey === 'mature' ? 'selected' : ''}>🧠 Tarjetas dominadas</option>
          <option value="reviews" ${sortKey === 'reviews' ? 'selected' : ''}>⚡ Repasos totales</option>
        </select>
      </div>
    </div>

    <div class="ranking-list">${listRows}</div>`;

  $app.querySelector('#rank-back-btn').onclick = () => (state.user ? showDashboard() : showUsers());

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

// ---------------- Sesión de Estudio y Evaluador Jev ----------------

function shuffledOrder(q) {
  if (!q.options || !q.options.length) return [];
  const idx = q.options.map((_, i) => i);
  if (getQuestionType(q) === 'tf') return idx;
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
  state.lastId = null;
  nextCard();
}

function nextCard() {
  stopTimer();
  const ids = scopeIds(state.scope, state.typeFilter);
  let id;
  if (state.practice) {
    const pool = ids.length > 1 ? ids.filter((x) => x !== state.lastId) : ids;
    id = pool[Math.floor(Math.random() * pool.length)];
  } else {
    id = SRS.pickNext(ids, state.user.cards, Date.now(), state.lastId);
  }
  if (!id) return showDone();

  const q = Q[id];
  state.current = {
    id,
    order: shuffledOrder(q),
    sel: [],
    picked: null,
    correct: null,
    studentText: '',
    jevResult: null,
    jevLoading: false,
  };
  renderCard();
}

function topBar() {
  const c = SRS.counts(scopeIds(state.scope, state.typeFilter), state.user.cards);
  return `<div class="row spread header">
    <button class="link" id="back">← Volver</button>
    <div class="row" style="gap:6px">
      <span class="tag">${esc(state.scope === 'all' ? 'Global' : 'Tema ' + state.scope)}</span>
      ${state.typeFilter !== 'all' ? `<span class="tag">${esc(state.typeFilter)}</span>` : ''}
    </div>
    ${
      state.practice
        ? '<span class="muted small">práctica libre</span>'
        : `<div class="counts" title="Nuevas · Aprendiendo · Repaso">
            <span class="n-new">${c.new}</span><span class="n-learn">${c.dueLearn}</span><span class="n-review">${c.dueReview}</span>
          </div>`
    }
  </div>`;
}

function renderCard() {
  const cur = state.current;
  const q = Q[cur.id];
  const qType = getQuestionType(q);
  const card = state.user.cards[cur.id] || SRS.newCard();
  const answered = cur.picked !== null;

  let bodyContent = '';

  // 1. PREGUNTA ABIERTA (Evaluador Jev)
  if (qType === 'open') {
    const jev = cur.jevResult;
    bodyContent = `
      <div class="open-response-area stack">
        <label class="small muted"><b>Escribe tu respuesta con tus propias palabras:</b></label>
        <textarea id="student-answer-input" class="open-textarea" placeholder="Escribe aquí tu definición o explicación para que Jev la evalúe..." ${answered ? 'disabled' : ''}>${esc(cur.studentText)}</textarea>
        ${
          !answered
            ? `
          <div class="row spread" style="margin-top:8px">
            <span class="small muted" id="word-count-badge">0 palabras</span>
            <button class="primary" id="btn-eval-jev" ${cur.jevLoading ? 'disabled' : ''}>
              ${cur.jevLoading ? '⏳ Evaluando con Jev...' : '🤖 Evaluar con Jev'}
            </button>
          </div>`
            : ''
        }

        ${
          jev
            ? `
          <div class="jev-card ${jev.status}">
            <div class="jev-header">
              <div class="row" style="gap:8px">
                <span class="jev-badge" style="background:var(--card)">🤖 Jev Evaluador: <b>${jev.score}/100</b></span>
                <span class="tag">${esc(jev.gradeLabel)}</span>
              </div>
              <span class="small muted">Recomendación SRS: <b>${RATING_LABEL[jev.suggestedRating]}</b></span>
            </div>
            <p style="margin:4px 0 10px;font-size:.95rem"><b>Dictamen pedagógico:</b> ${esc(jev.feedback)}</p>

            ${
              jev.detectedConcepts && jev.detectedConcepts.length
                ? `
              <div>
                <span class="small muted">✓ Conceptos clave acertados:</span>
                <div class="concept-tag-list">
                  ${jev.detectedConcepts.map((c) => `<span class="concept-pill hit">✓ ${esc(c)}</span>`).join('')}
                </div>
              </div>`
                : ''
            }

            ${
              jev.missingConcepts && jev.missingConcepts.length
                ? `
              <div style="margin-top:8px">
                <span class="small muted">⚠️ Conceptos importantes que faltaron:</span>
                <div class="concept-tag-list">
                  ${jev.missingConcepts.map((c) => `<span class="concept-pill miss">! ${esc(c)}</span>`).join('')}
                </div>
              </div>`
                : ''
            }

            <details style="margin-top:12px;font-size:.9rem">
              <summary>Ver respuesta modelo esperada</summary>
              <div style="margin-top:6px;padding:8px 12px;background:var(--card);border-radius:8px;border:1px solid var(--line)">
                ${esc(jev.idealAnswer || q.idealAnswer || q.explain)}
              </div>
            </details>
          </div>`
            : ''
        }
      </div>`;
  } else {
    // 2. PREGUNTAS TIPO TEST / VERDADERO-FALSO / MULTI-SELECCIÓN
    const multi = isMulti(q);
    const optionsHtml = cur.order
      .map((oi, pos) => {
        let cls = 'option';
        if (answered) {
          if (isRight(q, oi)) cls += multi && !cur.picked.includes(oi) ? ' correct missed' : ' correct';
          else if ([].concat(cur.picked).includes(oi)) cls += ' wrong';
          else cls += ' dim';
        } else if (cur.sel.includes(oi)) cls += ' selected';

        return `
          <button class="${cls}" data-opt="${oi}" ${answered ? 'disabled' : ''}>
            <span class="letter">${qType === 'tf' ? (oi === 0 ? '✓' : '✗') : LETTERS[pos]}</span>
            <span>${esc(q.options[oi])}</span>
          </button>`;
      })
      .join('');

    bodyContent = `
      ${multi ? '<div class="muted small multi-hint">Marca todas las opciones correctas y pulsa Comprobar</div>' : ''}
      <div class="options">${optionsHtml}</div>
      ${multi && !answered ? `<div class="grades one" style="margin-top:12px"><button class="primary" data-check ${cur.sel.length ? '' : 'disabled'}>Comprobar selección</button></div>` : ''}`;
  }

  // Feedback y Calificación SRS
  let after = '';
  if (answered) {
    const isJev = qType === 'open' && cur.jevResult;
    const fb = `
      <div class="feedback ${cur.correct ? 'ok' : 'bad'}" style="margin-top:14px">
        <b class="${cur.correct ? 'ok' : 'bad'}">${cur.correct ? '✓ ¡Respuesta aceptada!' : '✗ Respuesta incorrecta / insuficiente'}</b>
        ${q.explain && qType !== 'open' ? `<p>${rich(q.explain)}</p>` : ''}
      </div>`;

    if (state.practice) {
      after = fb + `<div class="grades one"><button class="primary" data-next>Siguiente pregunta →</button></div>`;
    } else {
      const pv = SRS.preview(card);
      const ratings = cur.correct ? ['again', 'hard', 'good', 'easy'] : ['again'];
      const suggested = isJev ? cur.jevResult.suggestedRating : null;

      after =
        fb +
        `<div class="grades ${cur.correct ? '' : 'one'}">
          ${ratings
            .map(
              (r) => `
            <button class="grade ${r} ${suggested === r ? 'suggested' : ''}" data-rate="${r}">
              <span>${RATING_LABEL[r]}${suggested === r ? ' ⭐' : ''}</span>
              <small>${pv[r]}</small>
            </button>`
            )
            .join('')}
        </div>`;
    }
  }

  const isNew = card.state === 'new';

  $app.innerHTML = `
    ${topBar()}
    ${state.practice ? '<div class="banner">Modo práctica libre: tus respuestas cuentan en las estadísticas pero no alteran los repasos espaciados.</div>' : ''}
    <div class="card">
      <div class="row spread small muted">
        <div class="row" style="gap:6px">
          <span>${esc(topicName(q.topic))}</span>
          ${typeBadge(qType)}
        </div>
        <span>${isNew ? '<span class="n-new">nueva</span>' : SRS.isLearning(card) ? '<span class="n-learn">aprendiendo</span>' : '<span class="n-review">repaso</span>'}</span>
      </div>

      <div class="question" style="margin-top:8px">${questionHtml(q.q)}</div>
      ${bodyContent}
      ${after}
    </div>

    <div class="kbd">
      ${
        answered
          ? cur.correct && !state.practice
            ? 'Teclas: 1 Otra vez · 2 Difícil · 3 Bien · 4 Fácil'
            : 'Pulsa Espacio para continuar'
          : qType === 'open'
          ? 'Escribe tu respuesta y haz clic en "Evaluar con Jev"'
          : `Teclas: 1–${cur.order.length} o ${LETTERS.slice(0, cur.order.length).split('').join('/')}`
      }
    </div>`;

  $app.querySelector('#back').onclick = showDashboard;
  $app.querySelectorAll('[data-opt]').forEach((b) => (b.onclick = () => answer(Number(b.dataset.opt))));
  $app.querySelectorAll('[data-rate]').forEach((b) => (b.onclick = () => rate(b.dataset.rate)));

  const check = $app.querySelector('[data-check]');
  if (check) check.onclick = checkMulti;
  const next = $app.querySelector('[data-next]');
  if (next) next.onclick = () => rate(cur.correct ? 'good' : 'again');

  // Listeners para preguntas abiertas y Jev
  if (qType === 'open' && !answered) {
    const inputEl = $app.querySelector('#student-answer-input');
    const wordCountBadge = $app.querySelector('#word-count-badge');
    const evalBtn = $app.querySelector('#btn-eval-jev');

    inputEl.oninput = () => {
      cur.studentText = inputEl.value;
      const count = inputEl.value.trim().split(/\s+/).filter(Boolean).length;
      wordCountBadge.textContent = `${count} ${count === 1 ? 'palabra' : 'palabras'}`;
    };

    evalBtn.onclick = () => evaluateWithJev(inputEl.value);
  }
}

async function evaluateWithJev(studentAnswer) {
  const cur = state.current;
  const q = Q[cur.id];
  if (!studentAnswer.trim()) return toast('Por favor escribe tu respuesta antes de evaluar.');

  cur.jevLoading = true;
  renderCard();

  try {
    const evalResult = await call('POST', '/api/jev/evaluate', {
      studentAnswer,
      idealAnswer: q.idealAnswer || q.explain,
      rubrics: q.rubrics || [],
      questionPrompt: q.q,
    });

    cur.jevResult = evalResult;
    cur.picked = studentAnswer;
    cur.correct = evalResult.score >= 55; // Aprobado si la nota Jev >= 55%
    cur.jevLoading = false;
    renderCard();
  } catch (err) {
    toast('Error al evaluar con Jev: ' + err.message);
    cur.jevLoading = false;
    renderCard();
  }
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
  const c = SRS.counts(scopeIds(state.scope, state.typeFilter), state.user.cards);
  const wait = c.nextDue ? SRS.formatDelay(c.nextDue - Date.now()) : null;
  $app.innerHTML = `
    ${topBar()}
    <div class="card" style="text-align:center;padding:36px 18px">
      <div style="font-size:2.5rem">🎉</div>
      <h2 style="margin-top:6px">¡Al día con ${esc(scopeName(state.scope))}!</h2>
      <p class="muted">No tienes tarjetas pendientes de repaso en este bloque.${wait ? ` La próxima vuelve en <b>${wait}</b>.` : ''}</p>
      <div class="row" style="justify-content:center;flex-wrap:wrap;margin-top:18px;gap:10px">
        <button class="primary" id="practice">Practicar libremente</button>
        <button id="home">Volver al panel</button>
      </div>
      <p class="muted small" style="margin-top:14px">«Practicar libremente» selecciona tarjetas al azar sin alterar los intervalos de repaso espaciado.</p>
    </div>`;
  $app.querySelector('#back').onclick = showDashboard;
  $app.querySelector('#home').onclick = showDashboard;
  $app.querySelector('#practice').onclick = () => {
    state.practice = true;
    nextCard();
  };

  state.timer = setInterval(() => {
    if (SRS.pickNext(scopeIds(state.scope, state.typeFilter), state.user.cards, Date.now())) nextCard();
  }, 15000);
}

// ---------------- Atajos de Teclado ----------------

document.addEventListener('keydown', (e) => {
  if (!state.current || !document.querySelector('.card') || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const cur = state.current;
  const k = e.key.toLowerCase();
  const qType = getQuestionType(Q[cur.id]);

  if (cur.picked === null) {
    if (qType === 'open') return;
    if (k === 'enter' && isMulti(Q[cur.id])) {
      e.preventDefault();
      checkMulti();
      return;
    }
    let pos = '123456'.indexOf(k);
    if (pos < 0) pos = 'abcdef'.indexOf(k);
    if (pos >= 0 && pos < cur.order.length) answer(cur.order[pos]);
    return;
  }

  if (state.practice || !cur.correct) {
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

// ---------------- Inicialización ----------------

const savedUser = localStorage.getItem('lewis-quiz-user');
savedUser ? openUser(savedUser) : showUsers();
