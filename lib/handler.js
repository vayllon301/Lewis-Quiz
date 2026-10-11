// Lógica de la API: Usuarios, Repaso SRS, Proyectos Compartidos,
// Conversión de Documentos, Ranking de Preguntas y Evaluación con Jev.

const crypto = require('crypto');
const { evaluateAnswer } = require('./jev');
const { convertDocumentToQuestions } = require('./docParser');

const RATINGS = ['again', 'hard', 'good', 'easy'];

// parts: ruta tras /api/ partida por '/', p. ej. ['projects', '<id>', 'convert-doc']
async function handle(method, parts, body, store, query = {}) {
  const ok = (b, status = 200) => ({ status, body: b });
  const fail = (status, error) => ({ status, body: { error } });

  // ---------------- 1. EVALUADOR JEV (Auto-corrector de preguntas abiertas) ----------------
  if (parts.length === 2 && parts[0] === 'jev' && parts[1] === 'evaluate') {
    if (method !== 'POST') return fail(405, 'Método no permitido.');
    const { studentAnswer, idealAnswer, rubrics, questionPrompt } = body;
    if (idealAnswer === undefined) return fail(400, 'Falta la respuesta modelo (idealAnswer).');
    const evaluation = evaluateAnswer(studentAnswer, idealAnswer, rubrics || [], questionPrompt || '');
    return ok(evaluation);
  }

  // ---------------- 2. RANKING DE USUARIOS ----------------
  if ((parts.length === 1 && parts[0] === 'ranking') || (parts.length === 2 && parts[0] === 'users' && parts[1] === 'ranking')) {
    if (method === 'GET') {
      const list = await store.getRanking();
      return ok(list);
    }
    return fail(405, 'Método no permitido.');
  }

  // ---------------- 3. PROYECTOS COMPARTIDOS ENTRE CUENTAS ----------------
  if (parts[0] === 'projects') {
    // GET /api/projects?userId=xxx
    if (parts.length === 1 && method === 'GET') {
      const userId = query.userId || null;
      const projects = await store.listProjects(userId);
      return ok(projects);
    }

    // POST /api/projects
    if (parts.length === 1 && method === 'POST') {
      const name = String(body.name || '').trim().slice(0, 80);
      if (!name) return fail(400, 'El nombre del proyecto es obligatorio.');
      const project = {
        name,
        description: String(body.description || '').trim().slice(0, 300),
        ownerId: body.ownerId || null,
        members: Array.isArray(body.members) ? body.members : (body.ownerId ? [body.ownerId] : []),
        topics: Array.isArray(body.topics) && body.topics.length ? body.topics : [{ id: 1, name: 'Tema 1: General' }],
        questions: Array.isArray(body.questions) ? body.questions : [],
        documents: [],
        createdAt: Date.now(),
      };
      const created = await store.createProject(project);
      return ok(created, 201);
    }

    const projectId = parts[1];
    if (!projectId) return fail(404, 'Proyecto no encontrado.');

    // GET /api/projects/:id
    if (parts.length === 2 && method === 'GET') {
      const p = await store.getProject(projectId);
      return p ? ok(p) : fail(404, 'Proyecto no encontrado.');
    }

    // PUT /api/projects/:id
    if (parts.length === 2 && method === 'PUT') {
      const p = await store.updateProject(projectId, body);
      return p ? ok(p) : fail(404, 'Proyecto no encontrado.');
    }

    // DELETE /api/projects/:id
    if (parts.length === 2 && method === 'DELETE') {
      await store.deleteProject(projectId);
      return ok({ ok: true });
    }

    // POST /api/projects/:id/members (añadir colaborador al proyecto)
    if (parts.length === 3 && parts[2] === 'members' && method === 'POST') {
      const { userId } = body;
      if (!userId) return fail(400, 'Falta el ID del usuario a invitar.');
      const updated = await store.addProjectMember(projectId, userId);
      return updated ? ok(updated) : fail(404, 'Proyecto no encontrado.');
    }

    // DELETE /api/projects/:id/members/:userId (quitar colaborador)
    if (parts.length === 4 && parts[2] === 'members' && method === 'DELETE') {
      const targetUserId = parts[3];
      const updated = await store.removeProjectMember(projectId, targetUserId);
      return updated ? ok(updated) : fail(404, 'Proyecto no encontrado.');
    }

    // POST /api/projects/:id/questions (añadir preguntas directamente)
    if (parts.length === 3 && parts[2] === 'questions' && method === 'POST') {
      const { questions } = body;
      if (!Array.isArray(questions) || !questions.length) return fail(400, 'Array de preguntas requerido.');
      const updated = await store.addProjectQuestions(projectId, questions);
      return updated ? ok(updated) : fail(404, 'Proyecto no encontrado.');
    }

    // POST /api/projects/:id/convert-doc (convertir documento en preguntas y guardarlo)
    if (parts.length === 3 && parts[2] === 'convert-doc' && method === 'POST') {
      const { text, title, targetTopic, types, maxQuestions, autoImport } = body;
      if (!text || typeof text !== 'string') return fail(400, 'El texto del documento es necesario.');
      
      const convertedQuestions = convertDocumentToQuestions(text, {
        targetTopic: Number(targetTopic) || 1,
        types: Array.isArray(types) && types.length ? types : ['single', 'tf', 'open', 'multi'],
        maxQuestions: Math.min(100, Math.max(1, Number(maxQuestions) || 30))
      });

      if (autoImport !== false && convertedQuestions.length > 0) {
        await store.addProjectQuestions(projectId, convertedQuestions);
        await store.addProjectDocument(projectId, {
          title: title || 'Apuntes convertidos',
          content: text.slice(0, 10000),
          generatedCount: convertedQuestions.length
        });
      }

      const currentProj = await store.getProject(projectId);
      return ok({
        questions: convertedQuestions,
        totalConverted: convertedQuestions.length,
        project: currentProj
      });
    }

    // GET /api/projects/:id/questions/ranking (Ranking de preguntas por dificultad / tasa de fallos y votos)
    if (parts.length === 4 && parts[2] === 'questions' && parts[3] === 'ranking' && method === 'GET') {
      const p = await store.getProject(projectId);
      if (!p) return fail(404, 'Proyecto no encontrado.');
      const ranking = await store.getQuestionsRanking(projectId, p.questions || []);
      return ok(ranking);
    }
  }

  // ---------------- 4. VOTACIÓN Y VALORACIÓN DE PREGUNTAS ----------------
  if (parts[0] === 'questions' && parts[1]) {
    const qid = parts[1];
    if (parts.length === 3 && parts[2] === 'vote') {
      if (method === 'POST') {
        const { userId, vote, tag } = body;
        if (!userId) return fail(400, 'Usuario requerido para votar.');
        const votes = await store.voteQuestion(qid, userId, { vote, tag });
        return ok(votes);
      }
      if (method === 'GET') {
        const votes = await store.getQuestionVotes(qid);
        return ok(votes);
      }
    }
  }

  // ---------------- 5. USUARIOS Y SRS ----------------
  if (parts.length === 1 && parts[0] === 'users') {
    if (method === 'GET') {
      const list = await store.listUsers();
      return ok(list.sort((a, b) => a.name.localeCompare(b.name)));
    }
    if (method === 'POST') {
      const name = String(body.name || '').trim().slice(0, 40);
      if (!name) return fail(400, 'Escribe un nombre.');
      const list = await store.listUsers();
      if (list.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
        return fail(409, 'Ya existe un usuario con ese nombre.');
      }
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

  // POST /api/users/:id/review
  if (parts.length === 3 && parts[2] === 'review' && method === 'POST') {
    const { qid, rating, correct, practice, card } = body;
    if (typeof qid !== 'string' || qid.length > 50 || !RATINGS.includes(rating)) {
      return fail(400, 'Datos no válidos.');
    }
    if (!practice && (!card || typeof card !== 'object' || typeof card.due !== 'number')) {
      return fail(400, 'Falta la tarjeta.');
    }
    const entry = { t: Date.now(), qid, rating, correct: !!correct, practice: !!practice };
    await store.saveReview(id, qid, practice ? null : card, entry);
    return ok({ ok: true });
  }

  // POST /api/users/:id/reset
  if (parts.length === 3 && parts[2] === 'reset' && method === 'POST') {
    await store.reset(id);
    return ok({ ok: true });
  }

  return fail(404, 'Ruta no encontrada.');
}

module.exports = { handle };
