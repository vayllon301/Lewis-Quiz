// Interfaz: elegir usuario → panel (global + temas + historial) → sesión de estudio tipo Anki.

const $app = document.getElementById('app');
const Q = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const LETTERS = 'ABCD';
const RATING_LABEL = { again: 'Otra vez', hard: 'Difícil', good: 'Bien', easy: 'Fácil' };

const state = {
  users: [],
  user: null,        // { id, name, cards, log }
  scope: 'all',      // 'all' o el id de un tema
  practice: false,   // modo práctica: no cambia la programación
  current: null,     // { id, order: [índices de opciones], picked, correct }
  lastId: null,
  timer: null,
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

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

const scopeIds = (scope) => QUESTIONS.filter((q) => scope === 'all' || q.topic === scope).map((q) => q.id);
const scopeName = (scope) => (scope === 'all' ? 'Global · todos los temas' : TOPICS.find((t) => t.id === scope).name);

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

// ---------------- Usuarios ----------------

async function showUsers() {
  stopTimer();
  state.user = null;
  try { state.users = await call('GET', '/api/users'); } catch (e) { toast(e.message); }
  $app.innerHTML = `
    <div class="header"><h1>🧠 Lewis Quiz</h1><div class="muted">Statistical Programming · repaso espaciado tipo Anki</div></div>
    <div class="card stack">
      <h2 style="margin-top:0">¿Quién eres?</h2>
      ${state.users.length ? `<div class="users">${state.users.map((u) => `<button data-user="${u.id}">👤 ${esc(u.name)}</button>`).join('')}</div>` : '<p class="muted">Aún no hay usuarios. Crea el tuyo:</p>'}
      <form id="new-user" class="row" style="margin-top:16px">
        <input name="name" placeholder="Nombre del nuevo usuario" maxlength="40" required style="flex:1">
        <button class="primary">Crear</button>
      </form>
    </div>`;
  $app.querySelectorAll('[data-user]').forEach((b) => (b.onclick = () => openUser(b.dataset.user)));
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
  const { user } = state;
  const now = Date.now();
  const all = SRS.counts(scopeIds('all'), user.cards, now);
  const log = user.log;
  const midnight = new Date().setHours(0, 0, 0, 0);
  const today = log.filter((e) => e.t >= midnight);
  const acc = accuracy(log);

  const topicRows = TOPICS.map((t) => {
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
  for (const e of log) if (!e.correct && Q[e.qid]) fails[e.qid] = (fails[e.qid] || 0) + 1;
  const worst = Object.entries(fails).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const recent = log.slice(-15).reverse();

  $app.innerHTML = `
    <div class="header row spread">
      <div><h1>🧠 Lewis Quiz</h1><div class="muted small">Statistical Programming</div></div>
      <div class="row"><span>👤 <b>${esc(user.name)}</b></span><button class="link" id="switch">Cambiar</button></div>
    </div>

    <div class="card">
      <div class="row spread" style="align-items:flex-start">
        <div style="flex:1">
          <div class="name"><b>Global</b> <span class="muted small">· ${all.total} preguntas de todos los temas mezcladas</span></div>
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
      ${recent.filter((e) => Q[e.qid]).map((e) => `<li><span class="${e.correct ? 'ok' : 'bad'}">${e.correct ? '✓' : '✗'}</span><span class="q" title="${esc(Q[e.qid].q)}">${esc(Q[e.qid].q)}</span><span class="muted">${e.practice ? 'práctica' : RATING_LABEL[e.rating]} · ${timeAgo(e.t)}</span></li>`).join('')}
    </ul></div>` : '<p class="muted small">Todavía no has respondido ninguna pregunta.</p>'}

    <details class="small muted" style="margin-top:24px">
      <summary>¿Cómo funciona?</summary>
      <p>Funciona como Anki (algoritmo SM-2). Cada pregunta es una tarjeta. Las nuevas pasan por unos pasos cortos (1 min y 10 min). Cuando las aciertas, pasan a repaso con intervalos en días que crecen: 1 d → ~2–3 d → ~6 d → ~2 semanas…</p>
      <p>Al acertar eliges lo fácil que te ha resultado. <b>Difícil</b> alarga poco el intervalo y baja la «facilidad» de la tarjeta. <b>Bien</b> lo multiplica por la facilidad (~2,5×). <b>Fácil</b> lo alarga aún más y sube la facilidad. Si fallas, la tarjeta vuelve a aprendizaje (Otra vez) y su facilidad baja. Si aciertas de chiripa, pulsa también Otra vez.</p>
      <p>Las opciones se barajan cada vez para que no memorices la posición.</p>
    </details>
    <div class="row" style="margin-top:10px">
      <button class="link small" id="reset">Reiniciar mi progreso</button>
      <button class="link small" id="delete">Borrar usuario</button>
    </div>`;

  $app.querySelectorAll('[data-scope]').forEach((b) => (b.onclick = () => startStudy(b.dataset.scope === 'all' ? 'all' : Number(b.dataset.scope))));
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
  state.current = { id, order: shuffledOrder(Q[id]), picked: null, correct: null };
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
  const { id, order, picked, correct } = state.current;
  const q = Q[id];
  const card = state.user.cards[id] || SRS.newCard();
  const answered = picked !== null;

  const options = order.map((oi, pos) => {
    let cls = 'option';
    if (answered) {
      if (oi === q.answer) cls += ' correct';
      else if (oi === picked) cls += ' wrong';
      else cls += ' dim';
    }
    return `<button class="${cls}" data-opt="${oi}" ${answered ? 'disabled' : ''}>
      <span class="letter">${LETTERS[pos]}</span><span>${esc(q.options[oi])}</span></button>`;
  }).join('');

  let after = '';
  if (answered) {
    const fb = `<div class="feedback ${correct ? 'ok' : 'bad'}">
      <b class="${correct ? 'ok' : 'bad'}">${correct ? '✓ ¡Correcto!' : `✗ Incorrecto. Era: ${esc(q.options[q.answer])}`}</b>
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
      <div class="row spread small muted"><span>${esc(TOPICS.find((t) => t.id === q.topic).name)}</span>
        <span>${isNew ? '<span class="n-new">nueva</span>' : SRS.isLearning(card) ? '<span class="n-learn">aprendiendo</span>' : '<span class="n-review">repaso</span>'}</span></div>
      <div class="question">${esc(q.q)}</div>
      <div class="options">${options}</div>
      ${after}
    </div>
    <div class="kbd">${answered ? (correct && !state.practice ? 'Teclas: 1 Otra vez · 2 Difícil · 3/espacio Bien · 4 Fácil' : 'Espacio para continuar') : `Teclas: 1–${order.length} o ${LETTERS.slice(0, order.length).split('').join('/')}`}</div>`;

  $app.querySelector('#back').onclick = showDashboard;
  $app.querySelectorAll('[data-opt]').forEach((b) => (b.onclick = () => answer(Number(b.dataset.opt))));
  $app.querySelectorAll('[data-rate]').forEach((b) => (b.onclick = () => rate(b.dataset.rate)));
  const next = $app.querySelector('[data-next]');
  if (next) next.onclick = () => rate(state.current.correct ? 'good' : 'again');
}

function answer(optIndex) {
  const cur = state.current;
  if (cur.picked !== null) return;
  cur.picked = optIndex;
  cur.correct = optIndex === Q[cur.id].answer;
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
    let pos = '1234'.indexOf(k);
    if (pos < 0) pos = 'abcd'.indexOf(k);
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
