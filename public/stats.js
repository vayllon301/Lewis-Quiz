// Estadísticas: "Mi progreso" (nota, acierto, actividad diaria y desglose por tema) y "Comparar" (frente a la media de la clase o a otro usuario).
// Usa las funciones globales de main.js (state, call, mount, calcUserMetrics, startStudy…), ui.js y Chart.js.

const statsState = {
  view: 'progress', // 'progress' | 'compare'
  subjectId: 'all', // 'all' o el id de una asignatura
  peerId: 'class', // 'class' (media de la clase) o el id de un usuario
  range: 'all', // '7d' | '30d' | 'all'
  users: [],
  charts: [],
};

const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayLabel = (k) => (currentLang === 'en' ? `${k.slice(5, 7)}/${k.slice(8)}` : `${k.slice(8)}/${k.slice(5, 7)}`);
const round1 = (x) => (x === null ? null : Math.round(x * 10) / 10);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

async function showStats({ view = 'progress', subjectId = state.subject.id, peerId = null } = {}) {
  stopTimer();
  if (!state.user) return showUsers();
  state.view = 'stats';
  statsState.view = peerId ? 'compare' : view;
  statsState.subjectId = subjectId;
  if (peerId) statsState.peerId = peerId;

  mount(`${pageHead(t('stats_title'))}<div class="card empty"><p>${t('loading')}</p></div>`, { nav: 'stats', width: 'mid' });

  let users;
  try {
    users = await call('GET', '/api/ranking');
    state.cachedRanking = users;
  } catch (e) {
    toast(t('class_load_error', { msg: e.message }));
    users = state.cachedRanking || [];
  }
  // El usuario actual va con sus datos en memoria, que pueden ser más recientes que los del servidor.
  statsState.users = [state.user, ...users.filter((u) => u.id !== state.user.id)];
  if (state.view === 'stats') renderStats();
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
  return m.topicsBreakdown.map((tp) => ({
    name: tp.name,
    score: tp.score,
    coverage: tp.total ? Math.round((tp.studied / tp.total) * 100) : 0,
    subjectId: subj.id,
    topicId: tp.id,
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
    name: t('class_average'),
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
  state.view = 'stats';
  const subj = statsSubject();
  const profiles = statsState.users.map((u) => statsProfile(u, subj));
  const me = profiles[0];
  const { view } = statsState;

  const toolbar = `<div class="stats-toolbar">
    <div class="seg lg">
      <button data-stats-view="progress" class="${view === 'progress' ? 'active' : ''}">${icon('chart')}${t('stats_progress_tab')}</button>
      <button data-stats-view="compare" class="${view === 'compare' ? 'active' : ''}">${icon('users')}${t('stats_compare_tab')}</button>
    </div>
    <div class="seg">
      <button data-stats-subject="all" class="${subj === 'all' ? 'active' : ''}">${t('all_subjects')}</button>
      ${SUBJECTS.map((s) => `<button data-stats-subject="${s.id}" class="${s === subj ? 'active' : ''}">${esc(s.name)}</button>`).join('')}
    </div>
  </div>`;

  mount(
    `${pageHead(t('stats_title'), t('stats_sub', { name: esc(state.user.name) }))}
    ${toolbar}
    ${view === 'progress' ? statsProgressHtml(me, profiles, subj) : statsCompareHtml(me, profiles, subj)}`,
    { nav: 'stats', width: 'mid' }
  );

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
      state.subject = subj;
      localStorage.setItem('lewis-quiz-subject', subj.id);
      startStudy(Number(b.dataset.studyTopic));
    };
  });

  if (view === 'progress') statsActivityChart(me, subj);
  else statsCompareChart(me, statsPeer(profiles), profiles, subj);
}

// ---------------- Mi progreso ----------------

function statsProgressHtml(me, profiles, subj) {
  const rank = 1 + profiles.filter((p) => p.score > me.score).length;
  const ranges = [
    ['7d', t('range_7d')],
    ['30d', t('range_30d')],
    ['all', t('range_all')],
  ];
  const hasActivity = statsLogs(me.user, subj).length > 0;

  return `
    <div class="kpi-grid">
      <div class="card kpi">
        <div class="kpi-label">${icon('target')}${t('kpi_expected')}</div>
        <div class="kpi-value" style="color:${me.grade.color}">${fmt1(me.score)}<span class="kpi-unit">/10</span></div>
        <div class="kpi-sub">${t('rank_of', { rank, total: profiles.length })}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-label">${icon('checkCircle')}${t('accuracy')}</div>
        <div class="kpi-value">${me.accuracy === null ? '–' : `${me.accuracy}<span class="kpi-unit">%</span>`}</div>
        <div class="kpi-sub">${t('n_answers', { n: me.reviews })}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-label">${icon('book')}${t('coverage')}</div>
        <div class="kpi-value">${me.coverage}<span class="kpi-unit">%</span></div>
        <div class="kpi-sub">${t('kpi_coverage_sub', { seen: me.studied, total: me.total })}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-label">${icon('flame')}${t('streak')}</div>
        <div class="kpi-value">${me.streak}</div>
        <div class="kpi-sub">${me.streak === 1 ? t('day_in_row') : t('days_in_row')}</div>
      </div>
    </div>

    <section class="section">
      <div class="card">
        <div class="card-head">
          <div><h3>${t('activity_title')}</h3><p class="card-sub">${t('activity_sub')}</p></div>
          <div class="seg compact">
            ${ranges.map(([k, label]) => `<button data-stats-range="${k}" class="${statsState.range === k ? 'active' : ''}">${label}</button>`).join('')}
          </div>
        </div>
        ${hasActivity ? '<div class="stats-chart"><canvas id="stats-chart"></canvas></div>' : `<p class="empty-inline">${t('no_activity_subject')}</p>`}
      </div>
    </section>

    <section class="section">
      <div class="card">
        <div class="card-head"><h3>${subj === 'all' ? t('by_subject') : t('by_topic')}</h3></div>
        <div>
          ${me.rows
            .map(
              (r) => `
            <div class="stats-row">
              <div class="name" title="${esc(r.name)}">${esc(r.name)} <span class="muted small">· ${t('pct_seen', { n: r.coverage })}</span></div>
              <div class="meter"><span style="width:${r.score * 10}%;background:${getGradeInfo(r.score).color}"></span></div>
              <span class="val">${fmt1(r.score)}</span>
              ${
                r.topicId
                  ? `<button class="btn btn-secondary btn-sm" data-study-topic="${r.topicId}">${icon('play')}${t('study')}</button>`
                  : `<button class="btn btn-ghost btn-sm" data-stats-subject="${r.subjectId}">${t('view')}${icon('chevronRight')}</button>`
              }
            </div>`
            )
            .join('')}
        </div>
      </div>
    </section>`;
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
          { type: 'line', label: t('chart_cum_accuracy'), data: accLine, yAxisID: 'acc', borderColor: c.accent, backgroundColor: c.accent, borderWidth: 2, pointRadius: 0, tension: 0.3, spanGaps: true },
          { type: 'bar', label: t('chart_correct'), data: days.map((k) => byDay[k]?.ok || 0), backgroundColor: c.ok, stack: 'r', borderRadius: 4, maxBarThickness: 26 },
          { type: 'bar', label: t('chart_wrong'), data: days.map((k) => byDay[k]?.bad || 0), backgroundColor: c.bad, stack: 'r', borderRadius: 4, maxBarThickness: 26 },
        ],
      },
      options: statsChartOptions({
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: t('chart_answers_axis') } },
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
  const peerName = isClass ? t('average') : peer.name;
  const fmt = (v, unit = '') => (v === null ? '–' : fmt1(v) + unit);
  const diff = (a, b, unit = '') => {
    if (a === null || b === null) return '<td class="muted">–</td>';
    const d = round1(a - b);
    return `<td class="${d > 0 ? 'ok' : d < 0 ? 'bad' : 'muted'}">${d > 0 ? '+' : ''}${fmt1(d)}${unit}</td>`;
  };
  const metrics = [
    [t('kpi_expected'), 'score', ''],
    [t('accuracy'), 'accuracy', '%'],
    [t('coverage'), 'coverage', '%'],
    [t('mastered_long'), 'mature', ''],
    [t('answers_cap'), 'reviews', ''],
    [t('streak'), 'streak', ''],
  ];

  return `
    <div class="card">
      <div class="card-head">
        <h3>${t('compare_with_label')}</h3>
        <select id="stats-peer" class="input input-sm" style="max-width:260px">
          <option value="class" ${isClass ? 'selected' : ''}>${t('class_average')} (${profiles.length})</option>
          ${profiles
            .slice(1)
            .map((p) => `<option value="${esc(p.user.id)}" ${peer === p ? 'selected' : ''}>${esc(p.name)}</option>`)
            .join('')}
        </select>
      </div>
      <table class="table">
        <thead><tr><th></th><th>${t('you')}</th><th>${esc(peerName)}</th><th>${t('diff')}</th></tr></thead>
        <tbody>
          ${metrics.map(([label, k, unit]) => `<tr><td>${label}</td><td><b>${fmt(me[k], unit)}</b></td><td>${fmt(peer[k], unit)}</td>${diff(me[k], peer[k], unit)}</tr>`).join('')}
        </tbody>
      </table>
    </div>

    <section class="section">
      <div class="card">
        <div class="card-head">
          <h3>${subj === 'all' ? t('score_by_subject') : t('score_by_topic')}</h3>
          <span class="legend"><span><span class="dot" style="background:var(--accent)"></span>${t('you')}</span><span><span class="dot" style="background:var(--peer)"></span>${esc(peerName)}</span></span>
        </div>
        <div>
          ${me.rows
            .map((r, i) => {
              const p = peer.rows[i];
              return `
            <div class="stats-row compare">
              <div class="name" title="${esc(r.name)}">${esc(r.name)}</div>
              <div class="pair">
                <div class="meter"><span style="width:${r.score * 10}%;background:var(--accent)"></span></div><span class="val">${fmt1(r.score)}</span>
                <div class="meter"><span style="width:${p.score * 10}%;background:var(--peer)"></span></div><span class="val">${fmt1(p.score)}</span>
              </div>
            </div>`;
            })
            .join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="card">
        <div class="card-head"><h3>${t('cumulative_title')}</h3></div>
        <div class="stats-chart"><canvas id="stats-chart"></canvas></div>
      </div>
    </section>`;
}

function statsCompareChart(me, peer, profiles, subj) {
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
          { label: t('you'), data: cumulative(me.user), borderColor: c.accent, backgroundColor: c.accent, borderWidth: 2, pointRadius: 0, tension: 0.3 },
          { label: peer.user ? peer.name : t('class_average'), data: peerLine, borderColor: c.peer, backgroundColor: c.peer, borderWidth: 2, borderDash: [5, 4], pointRadius: 0, tension: 0.3 },
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
  Chart.defaults.font.family = "'Inter', ui-sans-serif, system-ui, sans-serif";
  Chart.defaults.font.size = 11;
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, padding: 16 } },
      tooltip: { padding: 10, cornerRadius: 8, boxPadding: 4 },
    },
    scales,
  };
}

function statsDestroyCharts() {
  statsState.charts.forEach((ch) => ch.destroy());
  statsState.charts = [];
}

window.renderStats = renderStats;
window.statsDestroyCharts = statsDestroyCharts;
