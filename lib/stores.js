// Almacenamientos intercambiables:
// Soporta Usuarios, Repasos SRS, Proyectos Colaborativos Compartidos,
// Documentos de Estudio y Ranking / Votaciones de Preguntas.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_LOG = 20000;
const publicUser = (u) => ({ id: u.id, name: u.name, createdAt: u.createdAt });

function fileStore(dir) {
  const file = path.join(dir, 'db.json');
  fs.mkdirSync(dir, { recursive: true });

  const db = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : { users: {}, projects: {}, questionVotes: {} };

  if (!db.users) db.users = {};
  if (!db.projects) db.projects = {};
  if (!db.questionVotes) db.questionVotes = {};

  const save = () => {
    fs.writeFileSync(file + '.tmp', JSON.stringify(db, null, 2));
    fs.renameSync(file + '.tmp', file);
  };

  return {
    // ---------------- Usuarios ----------------
    async listUsers() {
      return Object.values(db.users).map(publicUser);
    },
    async createUser(u) {
      db.users[u.id] = { ...u, cards: {}, log: [] };
      save();
    },
    async getUser(id) {
      return db.users[id] || null;
    },
    async hasUser(id) {
      return !!db.users[id];
    },
    async deleteUser(id) {
      delete db.users[id];
      // Eliminar al usuario de miembros de proyectos
      for (const p of Object.values(db.projects)) {
        if (p.members) p.members = p.members.filter((m) => m !== id);
      }
      save();
    },
    async saveReview(id, qid, card, entry) {
      const u = db.users[id];
      if (!u) return;
      if (card) u.cards[qid] = card;
      u.log.push(entry);
      if (u.log.length > MAX_LOG) u.log.splice(0, u.log.length - MAX_LOG);
      save();
    },
    async reset(id) {
      if (!db.users[id]) return;
      db.users[id].cards = {};
      db.users[id].log = [];
      save();
    },
    async getRanking() {
      return Object.values(db.users).map((u) => ({
        id: u.id,
        name: u.name,
        createdAt: u.createdAt,
        cards: u.cards || {},
        log: u.log || [],
      }));
    },

    // ---------------- Proyectos Compartidos ----------------
    async listProjects(userId = null) {
      const all = Object.values(db.projects);
      if (!userId) return all;
      return all.filter((p) => p.isPublic || (p.members && p.members.includes(userId)) || p.ownerId === userId);
    },
    async getProject(projectId) {
      return db.projects[projectId] || null;
    },
    async createProject(project) {
      const p = {
        id: project.id || 'proj-' + crypto.randomUUID().slice(0, 8),
        name: project.name,
        description: project.description || '',
        ownerId: project.ownerId || null,
        members: project.members || (project.ownerId ? [project.ownerId] : []),
        topics: project.topics || [{ id: 1, name: 'General' }],
        questions: project.questions || [],
        documents: project.documents || [],
        createdAt: project.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      db.projects[p.id] = p;
      save();
      return p;
    },
    async updateProject(projectId, patch) {
      const p = db.projects[projectId];
      if (!p) return null;
      db.projects[projectId] = { ...p, ...patch, updatedAt: Date.now() };
      save();
      return db.projects[projectId];
    },
    async deleteProject(projectId) {
      delete db.projects[projectId];
      save();
    },
    async addProjectMember(projectId, userId) {
      const p = db.projects[projectId];
      if (!p) return null;
      if (!p.members) p.members = [];
      if (!p.members.includes(userId)) {
        p.members.push(userId);
        p.updatedAt = Date.now();
        save();
      }
      return p;
    },
    async removeProjectMember(projectId, userId) {
      const p = db.projects[projectId];
      if (!p) return null;
      p.members = (p.members || []).filter((m) => m !== userId);
      p.updatedAt = Date.now();
      save();
      return p;
    },
    async addProjectQuestions(projectId, newQuestions) {
      const p = db.projects[projectId];
      if (!p) return null;
      if (!p.questions) p.questions = [];
      const existingIds = new Set(p.questions.map((q) => q.id));
      for (const q of newQuestions) {
        if (!existingIds.has(q.id)) {
          p.questions.push(q);
          existingIds.add(q.id);
        }
      }
      p.updatedAt = Date.now();
      save();
      return p;
    },
    async addProjectDocument(projectId, doc) {
      const p = db.projects[projectId];
      if (!p) return null;
      if (!p.documents) p.documents = [];
      p.documents.push({
        id: 'doc-' + crypto.randomUUID().slice(0, 8),
        title: doc.title || 'Documento sin título',
        content: doc.content || '',
        generatedCount: doc.generatedCount || 0,
        createdAt: Date.now(),
      });
      p.updatedAt = Date.now();
      save();
      return p;
    },

    // ---------------- Votaciones y Ranking de Preguntas ----------------
    async voteQuestion(qid, userId, { vote, tag }) {
      if (!db.questionVotes[qid]) db.questionVotes[qid] = {};
      db.questionVotes[qid][userId] = {
        vote, // 'up', 'down', 'star', 'clear'
        tag: tag || null,
        updatedAt: Date.now(),
      };
      save();
      return db.questionVotes[qid];
    },
    async getQuestionVotes(qid) {
      return db.questionVotes[qid] || {};
    },
    async getQuestionsRanking(projectId, questionsList = []) {
      const users = Object.values(db.users);
      const qStats = {};

      for (const q of questionsList) {
        qStats[q.id] = {
          id: q.id,
          q: q.q,
          topic: q.topic,
          type: q.type || (Array.isArray(q.answer) ? 'multi' : 'single'),
          totalAttempts: 0,
          failedAttempts: 0,
          successfulAttempts: 0,
          upvotes: 0,
          downvotes: 0,
          stars: 0,
          tags: {},
        };
      }

      for (const u of users) {
        for (const log of u.log || []) {
          if (qStats[log.qid]) {
            qStats[log.qid].totalAttempts++;
            if (log.correct) {
              qStats[log.qid].successfulAttempts++;
            } else {
              qStats[log.qid].failedAttempts++;
            }
          }
        }
      }

      for (const [qid, votes] of Object.entries(db.questionVotes)) {
        if (qStats[qid]) {
          for (const v of Object.values(votes)) {
            if (v.vote === 'up') qStats[qid].upvotes++;
            else if (v.vote === 'down') qStats[qid].downvotes++;
            else if (v.vote === 'star') qStats[qid].stars++;
            if (v.tag) {
              qStats[qid].tags[v.tag] = (qStats[qid].tags[v.tag] || 0) + 1;
            }
          }
        }
      }

      return Object.values(qStats).map((stat) => {
        const errorRate = stat.totalAttempts > 0
          ? Math.round((stat.failedAttempts / stat.totalAttempts) * 100)
          : null;
        return {
          ...stat,
          errorRate,
          popularityScore: (stat.upvotes * 2) + stat.stars - stat.downvotes,
        };
      });
    },
  };
}

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
  const PROJECTS = 'quiz:projects';
  const VOTES = 'quiz:votes';
  const cardsKey = (id) => `quiz:cards:${id}`;
  const logKey = (id) => `quiz:log:${id}`;

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
    async createUser(u) {
      await pipeline([['HSET', USERS, u.id, JSON.stringify(u)]]);
    },
    async getUser(id) {
      const [u, cards, log] = await pipeline([['HGET', USERS, id], ['HGETALL', cardsKey(id)], ['LRANGE', logKey(id), 0, -1]]);
      if (!u) return null;
      return { ...JSON.parse(u), cards: pairs(cards), log: log.map((e) => JSON.parse(e)) };
    },
    async hasUser(id) {
      return (await pipeline([['HEXISTS', USERS, id]]))[0] === 1;
    },
    async deleteUser(id) {
      await pipeline([['HDEL', USERS, id], ['DEL', cardsKey(id), logKey(id)]]);
    },
    async saveReview(id, qid, card, entry) {
      const cmds = [['RPUSH', logKey(id), JSON.stringify(entry)], ['LTRIM', logKey(id), -MAX_LOG, -1]];
      if (card) cmds.unshift(['HSET', cardsKey(id), qid, JSON.stringify(card)]);
      await pipeline(cmds);
    },
    async reset(id) {
      await pipeline([['DEL', cardsKey(id), logKey(id)]]);
    },
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

    // Proyectos en Redis
    async listProjects(userId = null) {
      const [vals] = await pipeline([['HVALS', PROJECTS]]);
      const projects = (vals || []).map((v) => JSON.parse(v));
      if (!userId) return projects;
      return projects.filter((p) => p.isPublic || (p.members && p.members.includes(userId)) || p.ownerId === userId);
    },
    async getProject(projectId) {
      const [res] = await pipeline([['HGET', PROJECTS, projectId]]);
      return res ? JSON.parse(res) : null;
    },
    async createProject(project) {
      const p = {
        id: project.id || 'proj-' + crypto.randomUUID().slice(0, 8),
        name: project.name,
        description: project.description || '',
        ownerId: project.ownerId || null,
        members: project.members || (project.ownerId ? [project.ownerId] : []),
        topics: project.topics || [{ id: 1, name: 'General' }],
        questions: project.questions || [],
        documents: project.documents || [],
        createdAt: project.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      await pipeline([['HSET', PROJECTS, p.id, JSON.stringify(p)]]);
      return p;
    },
    async updateProject(projectId, patch) {
      const p = await this.getProject(projectId);
      if (!p) return null;
      const updated = { ...p, ...patch, updatedAt: Date.now() };
      await pipeline([['HSET', PROJECTS, projectId, JSON.stringify(updated)]]);
      return updated;
    },
    async deleteProject(projectId) {
      await pipeline([['HDEL', PROJECTS, projectId]]);
    },
    async addProjectMember(projectId, userId) {
      const p = await this.getProject(projectId);
      if (!p) return null;
      if (!p.members) p.members = [];
      if (!p.members.includes(userId)) {
        p.members.push(userId);
        p.updatedAt = Date.now();
        await pipeline([['HSET', PROJECTS, projectId, JSON.stringify(p)]]);
      }
      return p;
    },
    async removeProjectMember(projectId, userId) {
      const p = await this.getProject(projectId);
      if (!p) return null;
      p.members = (p.members || []).filter((m) => m !== userId);
      p.updatedAt = Date.now();
      await pipeline([['HSET', PROJECTS, projectId, JSON.stringify(p)]]);
      return p;
    },
    async addProjectQuestions(projectId, newQuestions) {
      const p = await this.getProject(projectId);
      if (!p) return null;
      if (!p.questions) p.questions = [];
      const existingIds = new Set(p.questions.map((q) => q.id));
      for (const q of newQuestions) {
        if (!existingIds.has(q.id)) {
          p.questions.push(q);
          existingIds.add(q.id);
        }
      }
      p.updatedAt = Date.now();
      await pipeline([['HSET', PROJECTS, projectId, JSON.stringify(p)]]);
      return p;
    },
    async addProjectDocument(projectId, doc) {
      const p = await this.getProject(projectId);
      if (!p) return null;
      if (!p.documents) p.documents = [];
      p.documents.push({
        id: 'doc-' + crypto.randomUUID().slice(0, 8),
        title: doc.title || 'Documento sin título',
        content: doc.content || '',
        generatedCount: doc.generatedCount || 0,
        createdAt: Date.now(),
      });
      p.updatedAt = Date.now();
      await pipeline([['HSET', PROJECTS, projectId, JSON.stringify(p)]]);
      return p;
    },
    async voteQuestion(qid, userId, voteData) {
      const [curr] = await pipeline([['HGET', VOTES, qid]]);
      const votes = curr ? JSON.parse(curr) : {};
      votes[userId] = { ...voteData, updatedAt: Date.now() };
      await pipeline([['HSET', VOTES, qid, JSON.stringify(votes)]]);
      return votes;
    },
    async getQuestionVotes(qid) {
      const [curr] = await pipeline([['HGET', VOTES, qid]]);
      return curr ? JSON.parse(curr) : {};
    },
    async getQuestionsRanking(projectId, questionsList = []) {
      const users = await this.getRanking();
      const [votesRaw] = await pipeline([['HGETALL', VOTES]]);
      const allVotes = pairs(votesRaw || []);

      const qStats = {};
      for (const q of questionsList) {
        qStats[q.id] = {
          id: q.id,
          q: q.q,
          topic: q.topic,
          type: q.type || (Array.isArray(q.answer) ? 'multi' : 'single'),
          totalAttempts: 0,
          failedAttempts: 0,
          successfulAttempts: 0,
          upvotes: 0,
          downvotes: 0,
          stars: 0,
          tags: {},
        };
      }
      for (const u of users) {
        for (const log of u.log || []) {
          if (qStats[log.qid]) {
            qStats[log.qid].totalAttempts++;
            if (log.correct) qStats[log.qid].successfulAttempts++;
            else qStats[log.qid].failedAttempts++;
          }
        }
      }
      for (const [qid, votes] of Object.entries(allVotes)) {
        if (qStats[qid]) {
          for (const v of Object.values(votes)) {
            if (v.vote === 'up') qStats[qid].upvotes++;
            else if (v.vote === 'down') qStats[qid].downvotes++;
            else if (v.vote === 'star') qStats[qid].stars++;
            if (v.tag) {
              qStats[qid].tags[v.tag] = (qStats[qid].tags[v.tag] || 0) + 1;
            }
          }
        }
      }
      return Object.values(qStats).map((stat) => ({
        ...stat,
        errorRate: stat.totalAttempts > 0 ? Math.round((stat.failedAttempts / stat.totalAttempts) * 100) : null,
        popularityScore: stat.upvotes * 2 + stat.stars - stat.downvotes,
      }));
    },
  };
}

module.exports = { fileStore, redisStore };
