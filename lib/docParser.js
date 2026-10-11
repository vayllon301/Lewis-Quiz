// Document Parser & Question Generator
// Convierte documentos, apuntes, archivos Markdown o guías de estudio en preguntas estructuradas
// con soporte para: Opción múltiple, Verdadero/Falso, Multi-selección y Preguntas Abiertas (evaluadas por Jev).

const { autoExtractRubrics, extractKeywords, normalizeText } = require('./jev');
const crypto = require('crypto');

function cleanMarkdown(text) {
  return text
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

/**
 * Parsea formato explícito de preguntas estilo examen / Blackboard:
 * 1. **Pregunta...**
 *    Answer: Respuesta...
 *    Explanation: Explicación...
 */
function parseExplicitQA(text, topic = 1) {
  const questions = [];
  const lines = text.split('\n');
  let currentQ = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detectar inicio de pregunta numerada
    const qMatch = line.match(/^(?:\d+[\.\)]\s*|\*\*Q\d*:\s*|\*\*Pregunta\s*\d*:\s*)(.*)/i) ||
                   line.match(/^\*\*(?:Question|Pregunta|\d+)\.?\s*(.*?)\*\*$/i);

    if (qMatch) {
      if (currentQ && currentQ.q && (currentQ.rawAnswer !== undefined || currentQ.options.length)) {
        questions.push(finalizeParsedQuestion(currentQ, topic));
      }
      let prompt = qMatch[1] || line;
      prompt = prompt.replace(/^\*\*|\*\*$/g, '').replace(/^#+\s*/, '').trim();
      currentQ = {
        q: prompt,
        topic,
        options: [],
        rawAnswer: '',
        explain: '',
        rubrics: []
      };
      continue;
    }

    if (!currentQ) continue;

    // Detectar respuesta
    const ansMatch = line.match(/^\*?\*?(?:Answer|Respuesta):\*?\*?\s*(.*)/i);
    if (ansMatch) {
      const rawAns = ansMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
      currentQ.rawAnswer = rawAns;
      continue;
    }

    // Detectar explicación
    const expMatch = line.match(/^\*?\*?(?:Explanation|Explicaci[oó]n|Nota):\*?\*?\s*(.*)/i);
    if (expMatch) {
      currentQ.explain = expMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
      continue;
    }

    // Detectar opciones de test tipo A) B) C) D)
    const optMatch = line.match(/^[A-Da-d][\.\)]\s*(.*)/);
    if (optMatch) {
      currentQ.options.push(optMatch[1].trim());
      continue;
    }
  }

  if (currentQ && currentQ.q && (currentQ.rawAnswer !== undefined || currentQ.options.length)) {
    questions.push(finalizeParsedQuestion(currentQ, topic));
  }

  return questions;
}

function finalizeParsedQuestion(raw, topic) {
  const id = 'gen-' + crypto.randomUUID().slice(0, 8);
  const cleanAns = String(raw.rawAnswer || '').trim().replace(/^[`'"]|[`'".]+$/g, '').trim();

  // Caso 1: Pregunta de Verdadero / Falso
  if (/^(true|verdadero|false|falso)$/i.test(cleanAns)) {
    const isTrue = /^(true|verdadero)$/i.test(cleanAns);
    return {
      id,
      topic,
      type: 'tf',
      q: cleanMarkdown(raw.q),
      options: ['True', 'False'],
      answer: isTrue ? 0 : 1,
      explain: raw.explain || `La afirmación es ${isTrue ? 'verdadera' : 'falsa'}.`,
      rubrics: []
    };
  }

  // Caso 2: Opciones explícitas ya encontradas
  if (raw.options && raw.options.length >= 2) {
    let ansIdx = 0;
    const letterMatch = cleanAns.match(/^([A-Da-d])$/);
    if (letterMatch) {
      ansIdx = 'abcd'.indexOf(letterMatch[1].toLowerCase());
    } else {
      const foundIdx = raw.options.findIndex((o) => o.toLowerCase() === cleanAns.toLowerCase());
      if (foundIdx >= 0) ansIdx = foundIdx;
    }
    return {
      id,
      topic,
      type: 'single',
      q: cleanMarkdown(raw.q),
      options: raw.options,
      answer: Math.max(0, ansIdx),
      explain: raw.explain || '',
      rubrics: []
    };
  }

  // Caso 3: Es una pregunta abierta con respuesta explicada (evaluada por Jev)
  const ideal = cleanAns || raw.explain || 'Respuesta conceptual esperada';
  const explanation = raw.explain ? raw.explain : ideal;
  return {
    id,
    topic,
    type: 'open',
    q: cleanMarkdown(raw.q),
    idealAnswer: ideal,
    explain: explanation,
    rubrics: autoExtractRubrics(explanation)
  };
}

/**
 * Generador desde apuntes en texto libre / párrafos conceptuales
 */
function generateFromTextNotes(text, topic = 1, preferredTypes = ['single', 'tf', 'open', 'multi'], maxCount = 20) {
  const questions = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Extraer sentencias informativas clave
  const statements = [];
  for (const line of lines) {
    if (line.startsWith('#') || line.length < 25) continue;
    const clean = line.replace(/^[\*\-\•\d+\.]+\s*/, '').trim();
    if (clean.length >= 30 && clean.includes(' ') && !clean.endsWith('?')) {
      statements.push(clean);
    }
  }

  // Detectar bloques de listas con viñetas para preguntas multi-selección
  const listGroups = [];
  let currentList = [];
  for (const line of lines) {
    if (/^[\*\-\•]\s+/.test(line)) {
      currentList.push(line.replace(/^[\*\-\•]\s+/, '').trim());
    } else {
      if (currentList.length >= 3) listGroups.push([...currentList]);
      currentList = [];
    }
  }
  if (currentList.length >= 3) listGroups.push([...currentList]);

  let typeIdx = 0;
  for (const stmt of statements) {
    if (questions.length >= maxCount) break;

    const requestedType = preferredTypes[typeIdx % preferredTypes.length];
    typeIdx++;

    const id = 'gen-' + crypto.randomUUID().slice(0, 8);
    const keywords = extractKeywords(stmt);
    const mainConcept = keywords.slice(0, 2).join(' ') || 'este concepto';

    if (requestedType === 'open') {
      questions.push({
        id,
        topic,
        type: 'open',
        q: `Explica en qué consiste y cuál es la función de ${mainConcept} según el documento.`,
        idealAnswer: stmt,
        explain: stmt,
        rubrics: autoExtractRubrics(stmt)
      });
    } else if (requestedType === 'tf') {
      const isTrue = Math.random() > 0.35;
      let qText = stmt;
      let explain = `La afirmación es correcta: "${stmt}"`;
      if (!isTrue) {
        // Invertir ligeramente la afirmación para crear un Falso plausible
        if (stmt.toLowerCase().includes(' es ')) {
          qText = stmt.replace(/ es /i, ' no es ');
        } else if (stmt.toLowerCase().includes(' permite ')) {
          qText = stmt.replace(/ permite /i, ' impide ');
        } else if (stmt.toLowerCase().includes(' always ')) {
          qText = stmt.replace(/ always /i, ' never ');
        } else {
          qText = `En ningún caso ${stmt.charAt(0).toLowerCase() + stmt.slice(1)}`;
        }
        explain = `Es falso. En realidad: ${stmt}`;
      }
      questions.push({
        id,
        topic,
        type: 'tf',
        q: qText,
        options: ['True', 'False'],
        answer: isTrue ? 0 : 1,
        explain,
        rubrics: []
      });
    } else if (requestedType === 'single') {
      const correctOpt = stmt.length > 90 ? stmt.slice(0, 85) + '…' : stmt;
      // Distractores plausibles
      const distractors = [
        `Solo es aplicable en estructuras inmutables sin dependencias.`,
        `Se descarta automáticamente en tiempo de compilación.`,
        `Requiere una conversión explícita a tipo primitivo previa.`
      ];
      // Si hay otras sentencias en el texto, usarlas como mejores distractores
      const otherStmts = statements.filter((s) => s !== stmt);
      if (otherStmts.length >= 3) {
        distractors[0] = otherStmts[0].length > 80 ? otherStmts[0].slice(0, 75) + '…' : otherStmts[0];
        distractors[1] = otherStmts[1].length > 80 ? otherStmts[1].slice(0, 75) + '…' : otherStmts[1];
      }
      const options = [correctOpt, ...distractors];
      // Barajar opciones
      const shuffled = options.map((opt, i) => ({ opt, originalIdx: i }));
      shuffled.sort(() => Math.random() - 0.5);

      questions.push({
        id,
        topic,
        type: 'single',
        q: `¿Cuál de las siguientes afirmaciones describe de forma precisa a ${mainConcept}?`,
        options: shuffled.map((s) => s.opt),
        answer: shuffled.findIndex((s) => s.originalIdx === 0),
        explain: stmt,
        rubrics: []
      });
    }
  }

  // Generar preguntas multi-selección si hay listas detectadas
  if (preferredTypes.includes('multi')) {
    for (const group of listGroups) {
      if (questions.length >= maxCount) break;
      const validItems = group.slice(0, 3);
      const fakeItem = 'Se ejecuta de manera síncrona en todos los casos sin excepción.';
      const allOpts = [...validItems, fakeItem];
      const correctAnswers = [0, 1, 2];

      questions.push({
        id: 'gen-' + crypto.randomUUID().slice(0, 8),
        topic,
        type: 'multi',
        q: `Indica cuáles de las siguientes propiedades son válidas según los apuntes (selecciona todas las correctas):`,
        options: allOpts,
        answer: correctAnswers,
        explain: `Los puntos válidos identificados en el documento son: ${validItems.join('; ')}.`,
        rubrics: []
      });
    }
  }

  return questions;
}

/**
 * Función principal de conversión de documentos
 */
function convertDocumentToQuestions(docText, options = {}) {
  const topic = options.targetTopic || 1;
  const types = options.types || ['single', 'tf', 'open', 'multi'];
  const maxCount = options.maxQuestions || 40;

  // Primero intentar parseo de preguntas explícitas estructuradas
  const explicit = parseExplicitQA(docText, topic);

  // Filtrar según tipos solicitados
  const filteredExplicit = explicit.filter((q) => {
    if (types.includes(q.type)) return true;
    if (types.includes('single') && (!q.type || q.type === 'single')) return true;
    return false;
  });

  // Generar adicionales si hay espacio y necesidad
  let generated = [];
  if (filteredExplicit.length < maxCount) {
    generated = generateFromTextNotes(docText, topic, types, maxCount - filteredExplicit.length);
  }

  const combined = [...filteredExplicit, ...generated];

  // Desduplicar por enunciado similar
  const seen = new Set();
  const result = [];
  for (const q of combined) {
    const key = normalizeText(q.q).slice(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(q);
    }
    if (result.length >= maxCount) break;
  }

  return result;
}

module.exports = {
  convertDocumentToQuestions,
  parseExplicitQA,
  generateFromTextNotes
};
