// Almacenamientos intercambiables con la misma interfaz:
//   listUsers, createUser, getUser, hasUser, deleteUser, saveReview, reset, getRanking
// · fileStore: un JSON en disco (servidor local).
// · redisStore: Upstash Redis por su API REST (Vercel). Sin dependencias.

const fs = require('fs');
const path = require('path');

const MAX_LOG = 20000;
const publicUser = (u) => ({ id: u.id, name: u.name, createdAt: u.createdAt });

function fileStore(dir) {
  const file = path.join(dir, 'db.json');
  fs.mkdirSync(dir, { recursive: true });
  const db = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { users: {} };
  const save = () => {
    fs.writeFileSync(file + '.tmp', JSON.stringify(db));
    fs.renameSync(file + '.tmp', file);
  };

  return {
    async listUsers() { return Object.values(db.users).map(publicUser); },
    async createUser(u) { db.users[u.id] = { ...u, cards: {}, log: [] }; save(); },
    async getUser(id) { return db.users[id] || null; },
    async hasUser(id) { return !!db.users[id]; },
    async deleteUser(id) { delete db.users[id]; save(); },
    async saveReview(id, qid, card, entry) {
      const u = db.users[id];
      if (card) u.cards[qid] = card;
      u.log.push(entry);
      if (u.log.length > MAX_LOG) u.log.splice(0, u.log.length - MAX_LOG);
      save();
    },
    async reset(id) { db.users[id].cards = {}; db.users[id].log = []; save(); },
    async getRanking() {
      return Object.values(db.users).map((u) => ({
        id: u.id,
        name: u.name,
        createdAt: u.createdAt,
        cards: u.cards || {},
        log: u.log || [],
      }));
    },
  };
}

// Claves: quiz:users (hash id → usuario) · quiz:cards:<id> (hash qid → tarjeta) · quiz:log:<id> (lista)
function redisStore(url, token) {
  async function pipeline(cmds) {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
    const out = await res.json();
    const err = out.find((r) => r.error);
    if (err) throw new Error(`Redis: ${err.error}`);
    return out.map((r) => r.result);
  }
  const USERS = 'quiz:users';
  const cardsKey = (id) => `quiz:cards:${id}`;
  const logKey = (id) => `quiz:log:${id}`;
  // HGETALL devuelve [k1, v1, k2, v2, …]
  const pairs = (arr) => {
    const o = {};
    for (let i = 0; i < arr.length; i += 2) o[arr[i]] = JSON.parse(arr[i + 1]);
    return o;
  };

  return {
    async listUsers() {
      const [vals] = await pipeline([['HVALS', USERS]]);
      return vals.map((v) => publicUser(JSON.parse(v)));
    },
    async createUser(u) { await pipeline([['HSET', USERS, u.id, JSON.stringify(u)]]); },
    async getUser(id) {
      const [u, cards, log] = await pipeline([['HGET', USERS, id], ['HGETALL', cardsKey(id)], ['LRANGE', logKey(id), 0, -1]]);
      if (!u) return null;
      return { ...JSON.parse(u), cards: pairs(cards), log: log.map((e) => JSON.parse(e)) };
    },
    async hasUser(id) { return (await pipeline([['HEXISTS', USERS, id]]))[0] === 1; },
    async deleteUser(id) { await pipeline([['HDEL', USERS, id], ['DEL', cardsKey(id), logKey(id)]]); },
    async saveReview(id, qid, card, entry) {
      const cmds = [['RPUSH', logKey(id), JSON.stringify(entry)], ['LTRIM', logKey(id), -MAX_LOG, -1]];
      if (card) cmds.unshift(['HSET', cardsKey(id), qid, JSON.stringify(card)]);
      await pipeline(cmds);
    },
    async reset(id) { await pipeline([['DEL', cardsKey(id), logKey(id)]]); },
    async getRanking() {
      const [vals] = await pipeline([['HVALS', USERS]]);
      if (!vals || !vals.length) return [];
      const users = vals.map((v) => JSON.parse(v));
      const cmds = [];
      for (const u of users) {
        cmds.push(['HGETALL', cardsKey(u.id)]);
        cmds.push(['LRANGE', logKey(u.id), 0, -1]);
      }
      const results = await pipeline(cmds);
      return users.map((u, i) => {
        const cardsRaw = results[i * 2] || [];
        const logRaw = results[i * 2 + 1] || [];
        return {
          id: u.id,
          name: u.name,
          createdAt: u.createdAt,
          cards: pairs(cardsRaw),
          log: logRaw.map((e) => JSON.parse(e)),
        };
      });
    },
  };
}

module.exports = { fileStore, redisStore };
