// Estadísticas: "Mi progreso" (nota, acierto, actividad diaria y desglose por tema) y "Comparar" (frente a la media de la clase o a otro usuario).
// Usa las funciones globales de main.js (state, call, esc, calcUserMetrics, startStudy…) y Chart.js.

const statsState = {
  view: 'progress', // 'progress' | 'compare'
  subjectId: 'all', // 'all' o el id de una asignatura
  peerId: 'class', // 'class' (media de la clase) o el id de un usuario
  range: 'all', // '7d' | '30d' | 'all'
  users: [],
  charts: [],
};

const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayLabel = (k) => `${k.slice(8)}/${k.slice(5, 7)}`;
const round1 = (x) => (x === null ? null : Math.round(x * 10) / 10);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

async function showStats({ view = 'progress', subjectId = state.subject.id, peerId = null } = {}) {
  stopTimer();
  if (!state.user) return showUsers();
  statsState.view = peerId ? 'compare' : view;
  statsState.subjectId = subjectId;
  if (peerId) statsState.peerId = peerId;

  $app.innerHTML = `
    <div class="header row spread"><h1>📊 Estadísticas</h1><button class="link" id="stats-back">← Volver</button></div>
    <div class="card" style="text-align:center;padding:40px"><p class="muted">Cargando…</p></div>`;
  $app.querySelector('#stats-back').onclick = () => showDashboard();

  let users;
  try {
    users = await call('GET', '/api/ranking');
    state.cachedRanking = users;
  } catch (e) {
    toast('Error al cargar los datos de la clase: ' + e.message);
    users = state.cachedRanking || [];
  }
  // El usuario actual va con sus datos en memoria, que pueden ser más recientes que los del servidor.
  statsState.users = [state.user, ...users.filter((u) => u.id !== state.user.id)];
  renderStats();
}

function statsSubject() {
  return statsState.subjectId === 'all' ? 'all' : SUBJECTS.find((s) => s.id === statsState.subjectId) || 'all';
}

function statsLogs(user, subj) {
  const log = user.log || [];
  if (subj === 'all') return log;
  const ids = new Set(subj.questions.map((q) => q.id));
  return log.filter((l) => ids.has(l.qid));
}

// Días seguidos con alguna respuesta, contando hasta hoy (o hasta ayer si hoy aún no ha estudiado).
function statsStreak(user) {
  const days = new Set((user.log || []).map((l) => dayKey(l.t)));
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// Filas del desglose: temas de la asignatura o, en "Todas", una fila por asignatura.
function statsRows(user, subj, m) {
  if (subj === 'all') {
    return SUBJECTS.map((s) => {
      const sm = calcUserMetrics(user, s);
      return { name: s.name, score: sm.expectedScore, coverage: sm.coverage, subjectId: s.id };
    });
  }
  return m.topicsBreakdown.map((t) => ({
    name: t.name,
    score: t.score,
    coverage: t.total ? Math.round((t.studied / t.total) * 100) : 0,
    subjectId: subj.id,
    topicId: t.id,
  }));
}

function statsProfile(user, subj) {
  const m = calcUserMetrics(user, subj);
  return {
    user,
    name: user.name,
    score: m.expectedScore,
    grade: m.grade,
    accuracy: m.accuracyPct,
    coverage: m.coverage,
    studied: m.studied,
    total: m.total,
    mature: m.mature,
    reviews: m.totalReviews,
    streak: statsStreak(user),
    rows: statsRows(user, subj, m),
  };
}

function statsClassProfile(profiles) {
  const avg = (f) => mean(profiles.map(f));
  const accs = profiles.map((p) => p.accuracy).filter((a) => a !== null);
  return {
    name: 'Media de la clase',
    score: round1(avg((p) => p.score)),
    accuracy: accs.length ? Math.round(mean(accs)) : null,
    coverage: Math.round(avg((p) => p.coverage)),
    mature: round1(avg((p) => p.mature)),
    reviews: Math.round(avg((p) => p.reviews)),
    streak: round1(avg((p) => p.streak)),
    rows: profiles[0].rows.map((r, i) => ({
      ...r,
      score: round1(avg((p) => p.rows[i].score)),
      coverage: Math.round(avg((p) => p.rows[i].coverage)),
    })),
  };
}

// Días consecutivos del periodo: los últimos 7/30 o, en "Todo", desde la primera respuesta.
function statsDays(range, logs) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  if (range === 'all') {
    const first = logs.reduce((min, l) => Math.min(min, l.t), today.getTime());
    start.setTime(first);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(today.getDate() - (range === '7d' ? 6 : 29));
  }
  const days = [];
  for (const d = start; d <= today; d.setDate(d.getDate() + 1)) days.push(dayKey(d));
  return days;
}

function renderStats() {
  statsDestroyCharts();
  const subj = statsSubject();
  const profiles = statsState.users.map((u) => statsProfile(u, subj));
  const me = profiles[0];
  const { view } = statsState;

  $app.innerHTML = `
    <div class="header row spread">
      <div><h1>📊 Estadísticas</h1><div class="muted small">${esc(state.user.name)}</div></div>
      <button class="link" id="stats-back">← Volver</button>
    </div>
    <div class="stats-toggles">
      <div class="seg">
        <button data-stats-view="progress" class="${view === 'progress' ? 'active' : ''}">Mi progreso</button>
        <button data-stats-view="compare" class="${view === 'compare' ? 'active' : ''}">Comparar</button>
      </div>
      <div class="tabs">
        <button data-stats-subject="all" class="${subj === 'all' ? 'active' : ''}">Todas</button>
        ${SUBJECTS.map((s) => `<button data-stats-subject="${s.id}" class="${s === subj ? 'active' : ''}">${esc(s.name)}</button>`).join('')}
      </div>
    </div>
    ${view === 'progress' ? statsProgressHtml(me, profiles, subj) : statsCompareHtml(me, profiles, subj)}`;

  $app.querySelector('#stats-back').onclick = () => {
    statsDestroyCharts();
    showDashboard();
  };
  $app.querySelectorAll('[data-stats-view]').forEach((b) => {
    b.onclick = () => {
      statsState.view = b.dataset.statsView;
      renderStats();
    };
  });
  $app.querySelectorAll('[data-stats-subject]').forEach((b) => {
    b.onclick = () => {
      statsState.subjectId = b.dataset.statsSubject;
      renderStats();
    };
  });
  $app.querySelectorAll('[data-stats-range]').forEach((b) => {
    b.onclick = () => {
      statsState.range = b.dataset.statsRange;
      renderStats();
    };
  });
  const peerSelect = $app.querySelector('#stats-peer');
  if (peerSelect) {
    peerSelect.onchange = () => {
      statsState.peerId = peerSelect.value;
      renderStats();
    };
  }
  $app.querySelectorAll('[data-study-topic]').forEach((b) => {
    b.onclick = () => {
      statsDestroyCharts();
      state.subject = subj;
      localStorage.setItem('lewis-quiz-subject', subj.id);
      startStudy(Number(b.dataset.studyTopic));
    };
  });

  if (view === 'progress') statsActivityChart(me, subj);
  else statsCumulativeChart(me, statsPeer(profiles), profiles, subj);
}

// ---------------- Mi progreso ----------------

function statsProgressHtml(me, profiles, subj) {
  const rank = 1 + profiles.filter((p) => p.score > me.score).length;
  const ranges = [['7d', '7 días'], ['30d', '30 días'], ['all', 'Todo']];
  const hasActivity = statsLogs(me.user, subj).length > 0;

  return `
    <div class="kpis">
      <div class="card stat"><b style="color:${me.grade.color}">${me.score}<small>/10</small></b><span class="muted small">nota esperada · ${rank}º de ${profiles.length}</span></div>
      <div class="card stat"><b>${me.accuracy === null ? '–' : me.accuracy + '%'}</b><span class="muted small">acierto · ${me.reviews} resp.</span></div>
      <div class="card stat"><b>${me.coverage}%</b><span class="muted small">visto · ${me.studied}/${me.total}</span></div>
      <div class="card stat"><b>${me.streak}</b><span class="muted small">${me.streak === 1 ? 'día seguido' : 'días seguidos'}</span></div>
    </div>

    <div class="card stats-card">
      <div class="row spread stats-card-head">
        <b>Actividad</b>
        <div class="seg small">
          ${ranges.map(([k, label]) => `<button data-stats-range="${k}" class="${statsState.range === k ? 'active' : ''}">${label}</button>`).join('')}
        </div>
      </div>
      ${hasActivity ? '<div class="stats-chart"><canvas id="stats-chart"></canvas></div>' : '<p class="muted small">Aún no has respondido preguntas de esta asignatura.</p>'}
    </div>

    <div class="card stats-card">
      <div class="stats-card-head"><b>${subj === 'all' ? 'Por asignatura' : 'Por tema'}</b></div>
      <div class="stack">
        ${me.rows
          .map(
            (r) => `
          <div class="stats-row">
            <div class="name" title="${esc(r.name)}">${esc(r.name)} <span class="muted small">· ${r.coverage}% visto</span></div>
            <div class="bar"><span style="width:${r.score * 10}%;background:${getGradeInfo(r.score).color}"></span></div>
            <span class="val">${r.score}</span>
            ${
              r.topicId
                ? `<button class="link small" data-study-topic="${r.topicId}">Estudiar</button>`
                : `<button class="link small" data-stats-subject="${r.subjectId}">Ver</button>`
            }
          </div>`
          )
          .join('')}
      </div>
    </div>`;
}

// Barras de aciertos/fallos por día y línea de acierto acumulado (contando también lo anterior al periodo).
function statsActivityChart(me, subj) {
  const canvas = $app.querySelector('#stats-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const logs = statsLogs(me.user, subj);
  const days = statsDays(statsState.range, logs);
  const byDay = {};
  let cumTotal = 0;
  let cumCorrect = 0;
  for (const l of logs) {
    const k = dayKey(l.t);
    if (k < days[0]) {
      cumTotal++;
      if (l.correct) cumCorrect++;
      continue;
    }
    byDay[k] = byDay[k] || { ok: 0, bad: 0 };
    byDay[k][l.correct ? 'ok' : 'bad']++;
  }
  const accLine = days.map((k) => {
    const d = byDay[k] || { ok: 0, bad: 0 };
    cumTotal += d.ok + d.bad;
    cumCorrect += d.ok;
    return cumTotal ? Math.round((cumCorrect / cumTotal) * 100) : null;
  });

  const c = statsColors();
  statsState.charts.push(
    new Chart(canvas, {
      data: {
        labels: days.map(dayLabel),
        datasets: [
          { type: 'line', label: 'Acierto acumulado', data: accLine, yAxisID: 'acc', borderColor: c.accent, backgroundColor: c.accent, borderWidth: 2, pointRadius: 0, tension: 0.25, spanGaps: true },
          { type: 'bar', label: 'Aciertos', data: days.map((k) => byDay[k]?.ok || 0), backgroundColor: c.ok, stack: 'r', borderRadius: 3, maxBarThickness: 28 },
          { type: 'bar', label: 'Fallos', data: days.map((k) => byDay[k]?.bad || 0), backgroundColor: c.bad, stack: 'r', borderRadius: 3, maxBarThickness: 28 },
        ],
      },
      options: statsChartOptions({
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'respuestas' } },
        acc: { position: 'right', min: 0, max: 100, grid: { display: false }, ticks: { callback: (v) => v + '%' } },
      }),
    })
  );
}

// ---------------- Comparar ----------------

function statsPeer(profiles) {
  const peer = statsState.peerId !== 'class' && profiles.find((p, i) => i > 0 && p.user.id === statsState.peerId);
  return peer || statsClassProfile(profiles);
}

function statsCompareHtml(me, profiles, subj) {
  const peer = statsPeer(profiles);
  const isClass = !peer.user;
  const fmt = (v, unit = '') => (v === null ? '–' : v + unit);
  const diff = (a, b, unit = '') => {
    if (a === null || b === null) return '<td class="muted">–</td>';
    const d = round1(a - b);
    return `<td class="${d > 0 ? 'ok' : d < 0 ? 'bad' : 'muted'}">${d > 0 ? '+' : ''}${d}${unit}</td>`;
  };
  const metrics = [
    ['Nota esperada', 'score', ''],
    ['Acierto', 'accuracy', '%'],
    ['Temario visto', 'coverage', '%'],
    ['Dominadas (≥21 días)', 'mature', ''],
    ['Respuestas', 'reviews', ''],
    ['Días seguidos', 'streak', ''],
  ];

  return `
    <div class="card stats-card">
      <div class="row spread stats-card-head">
        <b style="white-space:nowrap">Comparar con</b>
        <select id="stats-peer">
          <option value="class" ${isClass ? 'selected' : ''}>👥 Media de la clase (${profiles.length})</option>
          ${profiles
            .slice(1)
            .map((p) => `<option value="${esc(p.user.id)}" ${peer === p ? 'selected' : ''}>${esc(p.name)}</option>`)
            .join('')}
        </select>
      </div>
      <table class="stats-table">
        <thead><tr><th></th><th>Tú</th><th>${esc(isClass ? 'Media' : peer.name)}</th><th>Dif.</th></tr></thead>
        <tbody>
          ${metrics.map(([label, k, unit]) => `<tr><td>${label}</td><td><b>${fmt(me[k], unit)}</b></td><td>${fmt(peer[k], unit)}</td>${diff(me[k], peer[k], unit)}</tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="card stats-card">
      <div class="row spread stats-card-head">
        <b>${subj === 'all' ? 'Nota por asignatura' : 'Nota por tema'}</b>
        <span class="small muted"><span class="dot" style="background:var(--accent)"></span>Tú <span class="dot" style="background:var(--peer);margin-left:8px"></span>${esc(isClass ? 'Media' : peer.name)}</span>
      </div>
      <div class="stack">
        ${me.rows
          .map((r, i) => {
            const p = peer.rows[i];
            return `
          <div class="stats-row compare">
            <div class="name" title="${esc(r.name)}">${esc(r.name)}</div>
            <div class="pair">
              <div class="bar"><span style="width:${r.score * 10}%;background:var(--accent)"></span></div><span class="val">${r.score}</span>
              <div class="bar"><span style="width:${p.score * 10}%;background:var(--peer)"></span></div><span class="val">${p.score}</span>
            </div>
          </div>`;
          })
          .join('')}
      </div>
    </div>

    <div class="card stats-card">
      <div class="stats-card-head"><b>Preguntas respondidas (acumulado)</b></div>
      <div class="stats-chart"><canvas id="stats-chart"></canvas></div>
    </div>`;
}

function statsCumulativeChart(me, peer, profiles, subj) {
  const canvas = $app.querySelector('#stats-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const peerUsers = peer.user ? [peer.user] : profiles.map((p) => p.user);
  const logsOf = new Map([me.user, ...peerUsers].map((u) => [u, statsLogs(u, subj)]));
  const days = statsDays('all', [...logsOf.values()].flat());
  const cumulative = (u) => {
    const perDay = {};
    for (const l of logsOf.get(u)) perDay[dayKey(l.t)] = (perDay[dayKey(l.t)] || 0) + 1;
    let n = 0;
    return days.map((k) => (n += perDay[k] || 0));
  };
  const peerSeries = peerUsers.map(cumulative);
  const peerLine = days.map((_, i) => Math.round(mean(peerSeries.map((s) => s[i]))));

  const c = statsColors();
  statsState.charts.push(
    new Chart(canvas, {
      type: 'line',
      data: {
        labels: days.map(dayLabel),
        datasets: [
          { label: 'Tú', data: cumulative(me.user), borderColor: c.accent, backgroundColor: c.accent, borderWidth: 2, pointRadius: 0, tension: 0.25 },
          { label: peer.user ? peer.name : 'Media de la clase', data: peerLine, borderColor: c.peer, backgroundColor: c.peer, borderWidth: 2, borderDash: [5, 4], pointRadius: 0, tension: 0.25 },
        ],
      },
      options: statsChartOptions({
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      }),
    })
  );
}

// ---------------- Chart.js ----------------

function statsColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name) => cs.getPropertyValue(name).trim();
  return { accent: v('--accent'), peer: v('--peer'), ok: v('--ok'), bad: v('--bad'), muted: v('--muted'), line: v('--line') };
}

function statsChartOptions(scales) {
  const c = statsColors();
  Chart.defaults.color = c.muted;
  Chart.defaults.borderColor = c.line;
  Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } },
    scales,
  };
}

function statsDestroyCharts() {
  statsState.charts.forEach((ch) => ch.destroy());
  statsState.charts = [];
}
