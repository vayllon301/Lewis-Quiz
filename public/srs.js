// Planificador de repaso espaciado basado en el SM-2 de Anki, con sus valores por defecto.
//
// Estados de una tarjeta: new → learning → review ⇄ relearning
//  · learning / relearning: pasos cortos en minutos (1 min, 10 min / 10 min).
//  · review: intervalo en días que crece multiplicándose por la «facilidad» (ease, 250 % al inicio).
// Botones: again (Otra vez), hard (Difícil), good (Bien), easy (Fácil).

const SRS = (() => {
  const MIN = 60 * 1000;
  const DAY = 24 * 60 * MIN;

  const CFG = {
    learnSteps: [1, 10],     // minutos
    relearnSteps: [10],      // minutos
    graduatingIvl: 1,        // días, al pulsar Bien en el último paso
    easyIvl: 4,              // días, al pulsar Fácil en aprendizaje
    startEase: 2.5,
    minEase: 1.3,
    hardMult: 1.2,
    easyBonus: 1.3,
    lapseIvlMult: 0,         // «nuevo intervalo» tras un fallo (0 → mínimo 1 día)
    maxIvl: 36500,
    rolloverHour: 4,         // el «día» de Anki empieza a las 4:00
    learnAheadMin: 20,       // si no queda nada, adelanta tarjetas en aprendizaje que vencen en < 20 min
  };

  const newCard = () => ({ state: 'new', step: 0, ease: CFG.startEase, ivl: 0, due: 0, reps: 0, lapses: 0 });

  // Inicio del «día de estudio» actual (a las 4:00 de la mañana).
  function dayStart(now) {
    const d = new Date(now);
    if (d.getHours() < CFG.rolloverHour) d.setDate(d.getDate() - 1);
    d.setHours(CFG.rolloverHour, 0, 0, 0);
    return d.getTime();
  }

  function addDays(now, days) {
    const d = new Date(dayStart(now));
    d.setDate(d.getDate() + days);
    return d.getTime();
  }

  // Igual que Anki: pequeña variación aleatoria para que las tarjetas no venzan siempre juntas.
  function fuzz(ivl) {
    if (ivl < 3) return ivl;
    const range = Math.max(1, Math.round(ivl * 0.05));
    return ivl + Math.floor(Math.random() * (2 * range + 1)) - range;
  }

  function stepDelay(steps, step, rating) {
    if (rating === 'hard') {
      if (step === 0 && steps.length > 1) return (steps[0] + steps[1]) / 2;
      if (steps.length === 1) return Math.min(steps[0] * 1.5, steps[0] + 24 * 60);
      return steps[step];
    }
    return steps[step];
  }

  // Devuelve una tarjeta nueva (no muta la original). `useFuzz=false` para previsualizar intervalos.
  function schedule(card, rating, now = Date.now(), useFuzz = true) {
    const c = { ...card, reps: card.reps + 1 };
    const fz = useFuzz ? fuzz : (x) => x;

    const graduate = (ivl) => {
      c.state = 'review';
      c.step = 0;
      c.ivl = Math.min(CFG.maxIvl, Math.max(1, ivl));
      c.due = addDays(now, c.ivl);
      return c;
    };
    const toStep = (steps, step, rating) => {
      c.step = step;
      c.due = now + stepDelay(steps, step, rating) * MIN;
      return c;
    };

    if (card.state === 'new' || card.state === 'learning') {
      const steps = CFG.learnSteps;
      const step = card.state === 'new' ? 0 : card.step;
      c.state = 'learning';
      if (rating === 'again') return toStep(steps, 0, rating);
      if (rating === 'hard') return toStep(steps, step, rating);
      if (rating === 'good') return step + 1 < steps.length ? toStep(steps, step + 1, rating) : graduate(CFG.graduatingIvl);
      return graduate(CFG.easyIvl);
    }

    if (card.state === 'relearning') {
      const steps = CFG.relearnSteps;
      if (rating === 'again') return toStep(steps, 0, rating);
      if (rating === 'hard') return toStep(steps, card.step, rating);
      if (rating === 'good') return card.step + 1 < steps.length ? toStep(steps, card.step + 1, rating) : graduate(card.ivl);
      return graduate(card.ivl + 1);
    }

    // review
    const daysLate = Math.max(0, Math.round((dayStart(now) - card.due) / DAY));
    if (rating === 'again') {
      c.lapses = card.lapses + 1;
      c.ease = Math.max(CFG.minEase, card.ease - 0.2);
      c.ivl = Math.max(1, Math.round(card.ivl * CFG.lapseIvlMult));
      c.state = 'relearning';
      return toStep(CFG.relearnSteps, 0, rating);
    }
    // Cada botón da al menos un día más que el anterior (Difícil < Bien < Fácil).
    const hardIvl = Math.max(card.ivl + 1, Math.round(card.ivl * CFG.hardMult));
    const goodIvl = Math.max(hardIvl + 1, Math.round((card.ivl + daysLate / 2) * card.ease));
    const easyIvl = Math.max(goodIvl + 1, Math.round((card.ivl + daysLate) * card.ease * CFG.easyBonus));
    if (rating === 'hard') {
      c.ease = Math.max(CFG.minEase, card.ease - 0.15);
      return graduate(fz(hardIvl));
    }
    if (rating === 'good') return graduate(fz(goodIvl));
    c.ease = card.ease + 0.15;
    return graduate(fz(easyIvl));
  }

  function formatDelay(ms) {
    const m = Math.max(1, Math.round(ms / MIN));
    if (m < 60) return `${m} min`;
    const h = m / 60;
    if (h < 24) return `${Math.round(h)} h`;
    const d = Math.round(ms / DAY);
    if (d < 30) return `${d} d`;
    if (d < 365) return `${+(d / 30).toFixed(1)} mes`;
    return `${+(d / 365).toFixed(1)} a`;
  }

  // Texto para mostrar encima de cada botón (como Anki).
  function preview(card, now = Date.now()) {
    const out = {};
    for (const r of ['again', 'hard', 'good', 'easy']) {
      const next = schedule(card, r, now, false);
      out[r] = formatDelay(next.state === 'review' ? next.ivl * DAY : next.due - now);
    }
    return out;
  }

  const isLearning = (c) => c.state === 'learning' || c.state === 'relearning';

  // Elige la siguiente tarjeta: primero aprendizaje vencido, luego repasos vencidos y luego nuevas.
  // `ids` son las preguntas del ámbito (un tema o todas); `cards` es el mapa id → estado.
  function pickNext(ids, cards, now = Date.now(), lastId = null) {
    const get = (id) => cards[id] || newCard();
    const learn = [], review = [], fresh = [], ahead = [];
    for (const id of ids) {
      const c = get(id);
      if (c.state === 'new') fresh.push(id);
      else if (isLearning(c)) (c.due <= now ? learn : c.due <= now + CFG.learnAheadMin * MIN ? ahead : []).push(id);
      else if (c.due <= now) review.push(id);
    }
    const byDue = (a, b) => get(a).due - get(b).due;
    const choose = (list, sort) => {
      if (!list.length) return null;
      const pool = list.length > 1 ? list.filter((id) => id !== lastId) : list;
      if (sort) return pool.sort(byDue)[0];
      return pool[Math.floor(Math.random() * pool.length)];
    };
    return choose(learn, true) || choose(review, true) || choose(fresh, false) || choose(ahead, true);
  }

  function counts(ids, cards, now = Date.now()) {
    const r = { total: ids.length, new: 0, learning: 0, young: 0, mature: 0, dueLearn: 0, dueReview: 0, nextDue: null };
    for (const id of ids) {
      const c = cards[id];
      if (!c || c.state === 'new') { r.new++; continue; }
      if (isLearning(c)) { r.learning++; if (c.due <= now) r.dueLearn++; }
      else { c.ivl >= 21 ? r.mature++ : r.young++; if (c.due <= now) r.dueReview++; }
      if (c.due > now && (r.nextDue === null || c.due < r.nextDue)) r.nextDue = c.due;
    }
    return r;
  }

  return { CFG, newCard, schedule, preview, pickNext, counts, formatDelay, isLearning };
})();
