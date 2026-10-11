// Jev: Modelo auto-corrector para evaluación inteligente de preguntas abiertas.
// Evalúa la respuesta del alumno respecto a la respuesta modelo, rubricas y conceptos clave.

const SPANISH_STOPWORDS = new Set([
  'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'como', 'con', 'contra',
  'cual', 'cuando', 'de', 'del', 'desde', 'donde', 'durante', 'e', 'el', 'ella', 'ellas',
  'ello', 'ellos', 'en', 'entre', 'era', 'erais', 'eran', 'eras', 'eres', 'es', 'esa',
  'esas', 'ese', 'eso', 'esos', 'esta', 'estaba', 'estado', 'estais', 'estan', 'estar',
  'estas', 'este', 'esto', 'estos', 'estoy', 'fue', 'fueron', 'fui', 'ha', 'habeis',
  'habia', 'habian', 'hablar', 'han', 'has', 'hasta', 'hay', 'la', 'las', 'le', 'les',
  'lo', 'los', 'me', 'mi', 'mis', 'mucho', 'muchos', 'muy', 'nada', 'ni', 'no', 'nos',
  'nosotras', 'nosotros', 'o', 'otra', 'otras', 'otro', 'otros', 'para', 'pero', 'poco',
  'por', 'porque', 'que', 'quien', 'quienes', 'se', 'sea', 'sean', 'segun', 'ser',
  'si', 'sido', 'siempre', 'sin', 'sobre', 'sois', 'somos', 'son', 'soy', 'su', 'sus',
  'tambien', 'tanto', 'te', 'tenemos', 'tener', 'tenga', 'tengo', 'ti', 'tiene', 'tienen',
  'todo', 'todos', 'tu', 'tus', 'un', 'una', 'unas', 'uno', 'unos', 'vosotras', 'vosotros',
  'y', 'ya'
]);

const ENGLISH_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
  'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'did', 'do', 'does', 'doing',
  'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
  'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'let\'s', 'me', 'more',
  'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she',
  'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours'
]);

function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^\w\s]/g, ' ')       // Quitar puntuación
    .replace(/\s+/g, ' ')           // Espacios uniformes
    .trim();
}

// Lematización/Stemming ligero con armonización morfológica
function stemToken(token) {
  if (!token || token.length <= 3) return token;
  let t = token.toLowerCase();

  // Armonización morfológica para nominalizaciones latinas / sajonas
  // e.g., translation -> translat, execution -> execut, compilation -> compil
  if (t.endsWith('ations') || t.endsWith('aciones')) return t.slice(0, -6) + 'at';
  if (t.endsWith('ation') || t.endsWith('acion')) return t.slice(0, -5) + 'at';
  if (t.endsWith('tions') || t.endsWith('ciones')) return t.slice(0, -5) + 't';
  if (t.endsWith('tion') || t.endsWith('cion')) return t.slice(0, -4) + 't';

  // Plurales comunes
  if (t.endsWith('es') && t.length > 4) t = t.slice(0, -2);
  else if (t.endsWith('s') && t.length > 3) t = t.slice(0, -1);

  // Terminaciones verbales y adverbiales
  const suffixes = ['mente', 'ando', 'endo', 'ado', 'ido', 'ing', 'ment', 'able', 'ible', 'ity', 'idad', 'ed'];
  for (const suf of suffixes) {
    if (t.endsWith(suf) && t.length > suf.length + 3) {
      t = t.slice(0, -suf.length);
      break;
    }
  }
  return t;
}

function extractKeywords(text) {
  const norm = normalizeText(text);
  const words = norm.split(' ').filter(Boolean);
  const meaningful = [];
  for (const w of words) {
    if (w.length < 3) continue;
    if (SPANISH_STOPWORDS.has(w) || ENGLISH_STOPWORDS.has(w)) continue;
    meaningful.push(w);
  }
  return meaningful;
}

function extractBigrams(words) {
  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }
  return bigrams;
}

// Extrae automáticamente conceptos clave si la pregunta no define rubricas
function autoExtractRubrics(idealAnswer) {
  const keywords = extractKeywords(idealAnswer);
  if (!keywords.length) return [];
  // Priorizar palabras de mayor longitud y bigramas técnicos
  const uniqWords = [...new Set(keywords)].sort((a, b) => b.length - a.length);
  const bigrams = extractBigrams(keywords);
  const rubrics = [];
  if (bigrams.length > 0) rubrics.push(bigrams[0]);
  if (bigrams.length > 2) rubrics.push(bigrams[2]);
  for (const w of uniqWords) {
    if (rubrics.length >= 4) break;
    if (!rubrics.some((r) => r.includes(w))) rubrics.push(w);
  }
  return rubrics;
}

// Comprueba si dos stems o tokens son semánticamente equivalentes o prefijo compatible
function areStemsSimilar(s1, s2) {
  if (s1 === s2) return true;
  if (s1.length >= 4 && s2.length >= 4) {
    if (s1.startsWith(s2) || s2.startsWith(s1)) return true;
    // Distancia de Levenshtein simple para typos menores
    if (Math.abs(s1.length - s2.length) <= 1) {
      let diff = 0;
      const minLen = Math.min(s1.length, s2.length);
      for (let i = 0; i < minLen; i++) {
        if (s1[i] !== s2[i]) diff++;
        if (diff > 1) break;
      }
      if (diff <= 1) return true;
    }
  }
  return false;
}

/**
 * Jev Evaluator:
 * Determina el grado de acierto de una respuesta abierta, contrastando
 * conceptos clave, cobertura semántica, precisión técnica y extensión.
 */
function evaluateAnswer(studentAnswer, idealAnswer, rubrics = [], questionPrompt = '') {
  const rawStudent = String(studentAnswer || '').trim();
  const rawIdeal = String(idealAnswer || '').trim();

  const effectiveRubrics = (rubrics && rubrics.length > 0)
    ? rubrics
    : autoExtractRubrics(rawIdeal);

  if (!rawStudent) {
    return {
      score: 0,
      status: 'poor',
      gradeLabel: 'Sin respuesta',
      suggestedRating: 'again',
      feedback: 'No has introducido ninguna respuesta para evaluar.',
      detectedConcepts: [],
      missingConcepts: effectiveRubrics,
      idealAnswer: rawIdeal,
      stats: { conceptCoveragePct: 0, termRecallPct: 0, studentWordCount: 0, idealWordCount: 0 }
    };
  }

  const studentKeywords = extractKeywords(rawStudent);
  const idealKeywords = extractKeywords(rawIdeal);
  const studentStems = studentKeywords.map(stemToken);
  const idealStems = idealKeywords.map(stemToken);

  // 1. Concept Coverage (Identificación de conceptos clave o rúbricas)
  const detectedConcepts = [];
  const missingConcepts = [];

  for (const rubric of effectiveRubrics) {
    const rubricWords = extractKeywords(rubric);
    const rubricStems = rubricWords.map(stemToken);
    
    // Un concepto compuesto se da por detectado si sus palabras clave (o su raíz) están en la respuesta
    const matches = rubricStems.filter((rs) => studentStems.some((ss) => areStemsSimilar(rs, ss)));
    const matchRatio = rubricStems.length > 0 ? (matches.length / rubricStems.length) : 0;

    if (matchRatio >= 0.5) {
      detectedConcepts.push(rubric);
    } else {
      missingConcepts.push(rubric);
    }
  }

  const conceptCoverage = effectiveRubrics.length > 0 
    ? (detectedConcepts.length / effectiveRubrics.length) 
    : 0.5;

  // 2. Term Recall (Vocabulario y conceptos de la respuesta ideal)
  let termMatches = 0;
  for (const is of idealStems) {
    if (studentStems.some((ss) => areStemsSimilar(is, ss))) termMatches++;
  }
  const termRecall = idealStems.length > 0 ? (termMatches / idealStems.length) : 0;

  // 3. Coincidencia de Bigramas / Frases
  const studentBigrams = extractBigrams(studentKeywords);
  const idealBigrams = extractBigrams(idealKeywords);
  let bigramMatches = 0;
  for (const ibg of idealBigrams) {
    const [w1, w2] = ibg.split(' ');
    const s1 = stemToken(w1);
    const s2 = stemToken(w2);
    if (studentBigrams.some((sbg) => {
      const [sw1, sw2] = sbg.split(' ');
      return areStemsSimilar(s1, stemToken(sw1)) && areStemsSimilar(s2, stemToken(sw2));
    })) {
      bigramMatches++;
    }
  }
  const bigramRatio = idealBigrams.length > 0 ? (bigramMatches / idealBigrams.length) : termRecall;

  // 4. Factor de longitud
  let lengthFactor = 1.0;
  if (studentKeywords.length < 2 && idealKeywords.length >= 4) {
    lengthFactor = 0.4;
  } else if (studentKeywords.length < 4 && idealKeywords.length >= 8) {
    lengthFactor = 0.7;
  }

  // 5. Detección de negaciones contradictorias
  const normStudent = normalizeText(rawStudent);
  const normIdeal = normalizeText(rawIdeal);
  let negationPenalty = 0;
  const negationMarkers = ['no ', 'nunca', 'falso', 'incorrecto', 'not ', 'never', 'cannot'];
  for (const neg of negationMarkers) {
    if (normStudent.includes(neg) && !normIdeal.includes(neg)) {
      negationPenalty += 0.15;
    }
  }

  // 6. Cálculo Ponderado
  // Cobertura conceptual: 50%
  // Coincidencia de términos: 30%
  // Bigramas/Estructura: 20%
  let calculatedScore = (
    (conceptCoverage * 0.50) +
    (termRecall * 0.30) +
    (bigramRatio * 0.20)
  ) * lengthFactor;

  // Bonus si todos los conceptos clave están cubiertos
  if (conceptCoverage === 1.0 && detectedConcepts.length >= 2) {
    calculatedScore = Math.min(1.0, calculatedScore + 0.15);
  }

  calculatedScore = Math.max(0, Math.min(1.0, calculatedScore - negationPenalty));
  const scorePct = Math.round(calculatedScore * 100);

  // Calificación cualitativa y recomendación SRS
  let status = 'poor';
  let suggestedRating = 'again';
  let gradeLabel = 'Insuficiente';
  let feedback = '';

  if (scorePct >= 80) {
    status = 'excellent';
    suggestedRating = 'easy';
    gradeLabel = '¡Excelente!';
    feedback = 'Respuesta muy completa y precisa. Has demostrado dominio claro de los conceptos esenciales.';
  } else if (scorePct >= 60) {
    status = 'good';
    suggestedRating = 'good';
    gradeLabel = 'Buena respuesta';
    feedback = 'Bien respondido. Cubres la idea nuclear del concepto con rigor suficiente.';
  } else if (scorePct >= 35) {
    status = 'partial';
    suggestedRating = 'hard';
    gradeLabel = 'Parcialmente correcta';
    feedback = 'Tienes noción del tema, pero la explicación está incompleta o faltan términos clave determinantes.';
  } else {
    status = 'poor';
    suggestedRating = 'again';
    gradeLabel = 'Insuficiente / A repasar';
    feedback = 'La respuesta no cubre adecuadamente la definición esperada. Revisa la solución modelo para afianzarla.';
  }

  return {
    score: scorePct,
    status,
    gradeLabel,
    suggestedRating,
    feedback,
    detectedConcepts,
    missingConcepts,
    idealAnswer: rawIdeal,
    stats: {
      conceptCoveragePct: Math.round(conceptCoverage * 100),
      termRecallPct: Math.round(termRecall * 100),
      studentWordCount: studentKeywords.length,
      idealWordCount: idealKeywords.length
    }
  };
}

module.exports = {
  evaluateAnswer,
  autoExtractRubrics,
  extractKeywords,
  normalizeText
};
