// Lógica de la API, compartida entre el servidor local (dev-server.js) y la función de Vercel (api/index.js).
// `store` abstrae el almacenamiento: archivo JSON en local y Upstash Redis en Vercel (ver lib/stores.js).

const crypto = require('crypto');

const RATINGS = ['again', 'hard', 'good', 'easy'];

// parts: ruta tras /api/ partida por '/', p. ej. ['users', '<id>', 'review']
async function handle(method, parts, body, store) {
  const ok = (b, status = 200) => ({ status, body: b });
  const fail = (status, error) => ({ status, body: { error } });

  if (parts.length === 1 && parts[0] === 'users') {
    if (method === 'GET') {
      const list = await store.listUsers();
      return ok(list.sort((a, b) => a.name.localeCompare(b.name)));
    }
    if (method === 'POST') {
      const name = String(body.name || '').trim().slice(0, 40);
      if (!name) return fail(400, 'Escribe un nombre.');
      const list = await store.listUsers();
      if (list.some((u) => u.name.toLowerCase() === name.toLowerCase())) return fail(409, 'Ya existe un usuario con ese nombre.');
      const user = { id: crypto.randomUUID(), name, createdAt: Date.now() };
      await store.createUser(user);
      return ok(user, 201);
    }
  }

  if (parts[0] !== 'users' || !parts[1]) return fail(404, 'Ruta no encontrada.');
  const id = parts[1];

  if (parts.length === 2 && method === 'GET') {
    const user = await store.getUser(id);
    return user ? ok(user) : fail(404, 'Usuario no encontrado.');
  }
  if (!(await store.hasUser(id))) return fail(404, 'Usuario no encontrado.');

  if (parts.length === 2 && method === 'DELETE') {
    await store.deleteUser(id);
    return ok({ ok: true });
  }

  // { qid, rating, correct, practice, card }
  if (parts.length === 3 && parts[2] === 'review' && method === 'POST') {
    const { qid, rating, correct, practice, card } = body;
    if (typeof qid !== 'string' || qid.length > 20 || !RATINGS.includes(rating)) return fail(400, 'Datos no válidos.');
    if (!practice && (!card || typeof card !== 'object' || typeof card.due !== 'number')) return fail(400, 'Falta la tarjeta.');
    const entry = { t: Date.now(), qid, rating, correct: !!correct, practice: !!practice };
    await store.saveReview(id, qid, practice ? null : card, entry);
    return ok({ ok: true });
  }

  // Borra el progreso pero conserva el usuario
  if (parts.length === 3 && parts[2] === 'reset' && method === 'POST') {
    await store.reset(id);
    return ok({ ok: true });
  }

  return fail(404, 'Ruta no encontrada.');
}

module.exports = { handle };
