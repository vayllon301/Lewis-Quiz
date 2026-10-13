// Sistema de Internacionalización (i18n) y Selector de Tema (Claro / Oscuro / Auto)
// Lewis Quiz

const I18N = {
  es: {
    // Top & common
    app_title: 'Lewis Quiz',
    loading: 'Cargando…',
    back: '← Volver',
    back_to_panel: '← Volver al panel',
    back_to_study: '← Volver al estudio',
    nav_stats: 'Estadísticas',
    nav_ranking: 'Ranking',
    nav_switch: 'Cambiar',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Borrar',
    reset_progress: 'Reiniciar mi progreso',
    delete_user: 'Borrar usuario',
    study: 'Estudiar',
    study_now: 'Estudiar ahora',
    force: '⚡ Forzar',
    force_session: '⚡ Forzar sesión',
    test: '📝 Test',
    exam: '📝 Examen',
    questions: 'preguntas',
    question: 'Pregunta',
    answers: 'respuestas',
    overall_accuracy: 'acierto global',
    historic_accuracy: 'acierto histórico',
    today: 'hoy',
    coverage: 'Cobertura',
    accuracy: 'Acierto',
    details: 'Detalle',
    hide: 'Ocultar',
    compare: 'Comparar',
    all: 'Todas',
    new_label: 'nuevas',
    learning_label: 'aprendiendo',
    review_label: 'para repasar',
    practice_label: 'práctica',
    never_seen: 'Nunca vistas',
    in_learning: 'En aprendizaje que tocan ya',
    due_reviews: 'Repasos que tocan hoy',
    bar_legend: 'Verde oscuro: dominadas (≥21 d) · verde: en repaso · rojo: aprendiendo · gris: nuevas',

    // Themes & Languages
    theme_light: '☀️ Claro',
    theme_dark: '🌙 Oscuro',
    theme_auto: '💻 Auto',
    theme_light_title: 'Modo claro',
    theme_dark_title: 'Modo oscuro',
    theme_auto_title: 'Automático (según el sistema)',
    lang_es: '🇪🇸 ES',
    lang_en: '🇺🇸 EN',

    // User selection screen
    choose_user_title: '¿Quién eres?',
    choose_user_subtitle: 'Elige tu nombre para empezar o crea uno nuevo:',
    new_student: 'Nuevo alumno',
    your_name: 'Tu nombre',
    start_btn: 'Empezar',

    // Grades
    grade_sobresaliente: 'Sobresaliente',
    grade_notable: 'Notable',
    grade_aprobado: 'Aprobado',
    grade_suspenso: 'Suspenso',

    // Subjects & Topics
    sp_name: 'Statistical Programming',
    dm_name: 'Data Mining',
    sp_t1: 'Tema 1 · Introducción a la programación y Python',
    sp_t2: 'Tema 2 · Fundamentos del lenguaje Python',
    sp_t3: 'Tema 3 · NumPy',
    sp_t4: 'Tema 4 · pandas',
    sp_t5: 'Tema 5 · Carga, limpieza y transformación de datos',
    sp_t6: 'Tema 6 · Visualización',
    sp_t7: 'Tema 7 · Agregación de datos y operaciones de grupo',
    dm_t1: 'Tema 1 · Introducción a la minería de datos',
    dm_t2: 'Tema 2 · Bases de datos, MapReduce y TF.IDF',
    dm_t3: 'Tema 3 · Similitud, LSH y clustering',
    dm_t4: 'Tema 4 · Itemsets frecuentes y reglas de asociación',
    dm_t5: 'Tema 5 · PageRank, HITS y grafos web',
    dm_t6: 'Tema 6 · Sistemas de recomendación',
    dm_t7: 'Tema 7 · Publicidad online y algoritmo BALANCE',
    final_mock_name: 'Final Mock Exam',
    final_mock_title: 'DATA 51000 Practice Final Exam',
    final_mock_desc: 'Examen oficial de práctica de 40 preguntas · 1 punto cada una',

    // Dashboard
    expected_grade_banner: 'Nota esperada en el examen:',
    expected_grade_sub: 'Cobertura: {cov}% ({seen}/{total} preguntas) · Acierto: {acc}%',
    view_ranking_btn: 'Ver Ranking →',
    test_sim_title: '📝 Simulador de Test con Nota Final',
    test_sim_desc: 'Ponte a prueba con un test de <b>todas las {total} preguntas</b> o elige cuántas quieres. Al finalizar obtendrás tu nota oficial sobre 10 y revisión detallada.',
    btn_final_mock: '🎓 Final Mock Exam (40)',
    btn_test_all: '🚀 Test de todas ({total})',
    btn_custom_test: '⚙️ Elegir cuántas preguntas...',
    global_title: 'Global',
    global_desc: '{total} preguntas de todos los temas de {subject} mezcladas',
    exams_section_title: 'Exámenes Oficiales y Simulacros',
    topics_section_title: 'Por temas',
    history_section_title: 'Historial',
    most_missed_title: 'Las que más fallas',
    recent_answers_title: 'Últimas respuestas',
    no_answers_yet: 'Todavía no has respondido ninguna pregunta.',
    faq_summary: '¿Cómo funciona el repaso espaciado y el modo test?',
    faq_p1: '<b>Modo Estudio (SRS SM-2):</b> Cada pregunta es una tarjeta programada según tu memoria. Al acertar, su intervalo crece en días. Si fallas, vuelve a corto plazo.',
    faq_p2: '<b>Modo Test / Examen:</b> Te permite examinarte con una tanda de preguntas (o el 100% del temario). Al terminar te calcula tu <b>nota sobre 10</b>, te asigna calificación académica (Suspenso, Aprobado, Notable, Sobresaliente) y te muestra un desglose de fallos y explicaciones.',

    // Ratings (Anki SM-2)
    rating_again: 'Otra vez',
    rating_hard: 'Difícil',
    rating_good: 'Bien',
    rating_easy: 'Fácil',
    check_btn: 'Comprobar',
    next_btn: 'Siguiente',
    select_all_prompt: 'Selecciona todas las opciones correctas y pulsa <b>Comprobar respuesta</b>.',

    // Study View
    study_done_title: '¡Al día con {scope}!',
    study_done_sub: 'No te toca ninguna tarjeta ahora.',
    next_due_in: 'La próxima vuelve en <b>{wait}</b>.',
    btn_force_study: '⚡ Forzar sesión de estudio',
    btn_practice_random: 'Practicar al azar',
    force_study_tip: '<b>⚡ Forzar sesión:</b> adelanta tarjetas que vencerán próximamente o repasa tus puntos débiles recalculando y consolidando tus intervalos de memoria.',
    practice_banner: 'Modo práctica: tus respuestas cuentan en el historial, pero no cambian cuándo vuelve cada tarjeta.',

    // Force Study Modal
    force_modal_title: 'Forzar Sesión de Estudio',
    force_modal_sub: '{scope} · <b>{total}</b> preguntas disponibles',
    force_modal_desc: 'Estudia tarjetas sin esperar a que venzan. Puedes reprogramar tus intervalos SRS con Anki SM-2 para acelerar tu retención o hacer un repaso intensivo de tus puntos débiles.',
    how_many_cards: '¿CUÁNTAS TARJETAS QUIERES ESTUDIAR?',
    cards_unit: 'tarjetas',
    all_cards_chip: '⭐ Todas ({total})',
    exact_number: 'Número exacto:',
    of_total: 'de {total}',
    priority_criteria: 'CRITERIO DE PRIORIDAD Y SELECCIÓN',
    strat_due_title: '🕒 Próximas a vencer primero',
    strat_due_desc: 'Adelanta los repasos cuya fecha de vencimiento está más próxima en el tiempo.',
    strat_hard_title: '🧠 Mayor dificultad y más falladas',
    strat_hard_desc: 'Prioriza tarjetas con menor facilidad (ease) o con más fallos históricos.',
    strat_random_title: '🎲 Aleatorio / Temario completo',
    strat_random_desc: 'Mezcla libremente preguntas de todo el temario seleccionado.',
    reschedule_cb_title: 'Reprogramar con algoritmo SRS (SM-2):',
    reschedule_cb_desc: 'Al calificar con los 4 botones de Anki (Otra vez, Difícil, Bien, Fácil), el nuevo intervalo se recalcula a partir de hoy, adelantando tu curva de retención real.',
    btn_start_force: '⚡ Comenzar Sesión Forzada',
    tag_forced_session: '⚡ Sesión Forzada',
    tag_forced_completed: '⚡ Sesión Forzada Completada',
    force_completed_title: '¡Sesión de estudio forzada completada!',
    force_completed_desc: 'Has repasado con éxito <b>{total} tarjetas</b> en <b>{scope}</b>.',
    intervals_expanded: 'intervalos ampliados',
    srs_active_label: 'SRS Activo',
    srs_active_sub: 'Tarjetas reprogramadas',
    srs_review_label: 'Repaso',
    srs_review_sub: 'Sin alterar fechas',
    btn_another_force: '⚡ Otra tanda forzada',

    // Test Modal & Execution
    test_modal_title: '📝 Configurar Test de Examen',
    mock_modal_title: '🎓 Configurar Final Mock Exam',
    mock_modal_sub: 'DATA 51000 Practice Final Exam · <b>{total}</b> preguntas disponibles (1 punto c/u)',
    test_modal_sub: '{scope} · <b>{total}</b> preguntas disponibles',
    how_many_questions: '¿CUÁNTAS PREGUNTAS QUIERES EN EL TEST?',
    all_questions_chip: '⭐ Todas ({total})',
    full_exam_chip: '⭐ Examen completo ({total})',
    questions_unit: 'preguntas',
    immediate_feedback_title: 'Corrección inmediata:',
    immediate_feedback_desc: 'ver respuesta correcta y explicación tras responder cada pregunta',
    shuffle_title: 'Barajar preguntas:',
    shuffle_desc: 'orden aleatorio para no memorizar posiciones',
    btn_start_test: '🚀 Comenzar Test',
    btn_start_exam: '🎓 Comenzar Examen',
    exit_test_btn: '← Salir del test',
    test_tag: '📝 Test · {topic}',
    question_counter: 'Pregunta <b>{cur}</b> de <b>{total}</b>',
    correct_msg: '✓ ¡Respuesta correcta!',
    incorrect_msg: '✗ Respuesta incorrecta',
    was_single: 'Era:',
    were_multi: 'Eran:',
    btn_next_question: 'Siguiente pregunta →',
    btn_finish_test: 'Finalizar test y ver nota →',

    // Test Summary
    test_results_title: '🏁 Resultados del Test',
    test_results_sub: '{scope} · {total} preguntas evaluadas',
    test_score_label: 'Tu nota final en el test',
    mock_score_label: 'Puntuación Final Mock Exam',
    mock_points_detail: 'Puntos: <b style="color:{color}">{correct}</b> / {total} puntos (1 punto por pregunta)',
    btn_repeat_test: '🔄 Repetir este test',
    btn_new_test: '📝 Hacer otro test...',
    btn_to_dashboard: '🏠 Ir al panel',
    feedback_excellent: '¡Excelente resultado! Dominas con solvencia estas preguntas de la asignatura.',
    feedback_great: '¡Muy buen trabajo! Tienes un nivel notable. Repasa las falladas abajo para alcanzar el 10.',
    feedback_pass: '¡Has aprobado el test! Revisa con calma los fallos para consolidar tu conocimiento.',
    feedback_fail: 'No has alcanzado el aprobado (5,0). Revisa las soluciones explicadas abajo y vuelve a intentarlo.',

    // Ranking View
    ranking_title: 'Ranking de la Clase',
    ranking_sub: '{scope} · predicción de nota en el examen',
    tab_general: '🌍 General (Todas)',
    your_rank_is: 'Tu posición: <b>#{rank}</b> de {total} alumnos',
    sort_by_label: 'Criterio de ordenación:',
    sort_score: 'Nota esperada (estimación de examen)',
    sort_coverage: 'Mayor cobertura (% temario visto)',
    sort_reviews: 'Total de repasos completados',
    sort_accuracy: 'Porcentaje de acierto global',

    // Stats View
    stats_title: 'Estadísticas',
    stats_progress_tab: '📈 Mi progreso',
    stats_compare_tab: '👥 Comparar',
    time_7d: 'Últimos 7 días',
    time_30d: 'Últimos 30 días',
    time_all: 'Todo el histórico',
    class_average: '👥 Media de la clase',
  },

  en: {
    // Top & common
    app_title: 'Lewis Quiz',
    loading: 'Loading…',
    back: '← Back',
    back_to_panel: '← Back to dashboard',
    back_to_study: '← Back to study',
    nav_stats: 'Statistics',
    nav_ranking: 'Leaderboard',
    nav_switch: 'Switch',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    reset_progress: 'Reset my progress',
    delete_user: 'Delete user',
    study: 'Study',
    study_now: 'Study now',
    force: '⚡ Force',
    force_session: '⚡ Force session',
    test: '📝 Test',
    exam: '📝 Exam',
    questions: 'questions',
    question: 'Question',
    answers: 'answers',
    overall_accuracy: 'overall accuracy',
    historic_accuracy: 'historic accuracy',
    today: 'today',
    coverage: 'Coverage',
    accuracy: 'Accuracy',
    details: 'Details',
    hide: 'Hide',
    compare: 'Compare',
    all: 'All',
    new_label: 'new',
    learning_label: 'learning',
    review_label: 'to review',
    practice_label: 'practice',
    never_seen: 'Unseen',
    in_learning: 'Learning due now',
    due_reviews: 'Reviews due today',
    bar_legend: 'Dark green: mastered (≥21 d) · green: review · red: learning · gray: new',

    // Themes & Languages
    theme_light: '☀️ Light',
    theme_dark: '🌙 Dark',
    theme_auto: '💻 Auto',
    theme_light_title: 'Light mode',
    theme_dark_title: 'Dark mode',
    theme_auto_title: 'Automatic (match system)',
    lang_es: '🇪🇸 ES',
    lang_en: '🇺🇸 EN',

    // User selection screen
    choose_user_title: 'Who are you?',
    choose_user_subtitle: 'Select your name to start or create a new student profile:',
    new_student: 'New student',
    your_name: 'Your name',
    start_btn: 'Get started',

    // Grades
    grade_sobresaliente: 'High Pass (A)',
    grade_notable: 'Merit (B)',
    grade_aprobado: 'Pass (C)',
    grade_suspenso: 'Fail',

    // Subjects & Topics
    sp_name: 'Statistical Programming',
    dm_name: 'Data Mining',
    sp_t1: 'Topic 1 · Introduction to Programming & Python',
    sp_t2: 'Topic 2 · Python Language Fundamentals',
    sp_t3: 'Topic 3 · NumPy',
    sp_t4: 'Topic 4 · pandas',
    sp_t5: 'Topic 5 · Data Loading, Cleaning & Transformation',
    sp_t6: 'Topic 6 · Data Visualization',
    sp_t7: 'Topic 7 · Data Aggregation & Group Operations',
    dm_t1: 'Topic 1 · Introduction to Data Mining',
    dm_t2: 'Topic 2 · Databases, MapReduce & TF-IDF',
    dm_t3: 'Topic 3 · Similarity, LSH & Clustering',
    dm_t4: 'Topic 4 · Frequent Itemsets & Association Rules',
    dm_t5: 'Topic 5 · PageRank, HITS & Web Graphs',
    dm_t6: 'Topic 6 · Recommender Systems',
    dm_t7: 'Topic 7 · Online Advertising & BALANCE Algorithm',
    final_mock_name: 'Final Mock Exam',
    final_mock_title: 'DATA 51000 Practice Final Exam',
    final_mock_desc: 'Official 40-question practice final exam · 1 point each',

    // Dashboard
    expected_grade_banner: 'Expected exam grade:',
    expected_grade_sub: 'Coverage: {cov}% ({seen}/{total} questions) · Accuracy: {acc}%',
    view_ranking_btn: 'View Leaderboard →',
    test_sim_title: '📝 Practice Test Simulator with Final Grade',
    test_sim_desc: 'Test your knowledge across <b>all {total} questions</b> or customize your question count. Receive an official score out of 10 and detailed feedback.',
    btn_final_mock: '🎓 Final Mock Exam (40)',
    btn_test_all: '🚀 Test all ({total})',
    btn_custom_test: '⚙️ Choose question count...',
    global_title: 'Global',
    global_desc: '{total} questions mixed from all topics of {subject}',
    exams_section_title: 'Official Exams & Mock Tests',
    topics_section_title: 'By Topic',
    history_section_title: 'History',
    most_missed_title: 'Most missed questions',
    recent_answers_title: 'Recent answers',
    no_answers_yet: 'You have not answered any questions yet.',
    faq_summary: 'How do spaced repetition and test mode work?',
    faq_p1: '<b>Study Mode (SRS SM-2):</b> Each question acts as a scheduled flashcard. Correct answers expand intervals in days; incorrect answers return cards for short-term review.',
    faq_p2: '<b>Test / Exam Mode:</b> Allows you to take an exam simulation (or the full question pool). When finished, it calculates your <b>grade out of 10</b>, assigns academic status, and displays mistakes with explanations.',

    // Ratings (Anki SM-2)
    rating_again: 'Again',
    rating_hard: 'Hard',
    rating_good: 'Good',
    rating_easy: 'Easy',
    check_btn: 'Check',
    next_btn: 'Next',
    select_all_prompt: 'Select all correct options and click <b>Check answer</b>.',

    // Study View
    study_done_title: 'All caught up with {scope}!',
    study_done_sub: 'No cards are due right now.',
    next_due_in: 'Next card due in <b>{wait}</b>.',
    btn_force_study: '⚡ Force study session',
    btn_practice_random: 'Practice anyway',
    force_study_tip: '<b>⚡ Force study:</b> advance cards due in the future or review weak points while recalculating and solidifying memory intervals.',
    practice_banner: 'Practice mode: your answers count toward history, but do not change spaced repetition schedules.',

    // Force Study Modal
    force_modal_title: 'Force Study Session',
    force_modal_sub: '{scope} · <b>{total}</b> questions available',
    force_modal_desc: 'Study cards ahead of time without waiting for due dates. Reschedule intervals with Anki SM-2 to accelerate retention or conduct an intensive review of weak areas.',
    how_many_cards: 'HOW MANY CARDS WOULD YOU LIKE TO STUDY?',
    cards_unit: 'cards',
    all_cards_chip: '⭐ All ({total})',
    exact_number: 'Exact count:',
    of_total: 'of {total}',
    priority_criteria: 'PRIORITY & SELECTION CRITERIA',
    strat_due_title: '🕒 Upcoming due dates first',
    strat_due_desc: 'Reviews cards whose scheduled due date is closest.',
    strat_hard_title: '🧠 Highest difficulty & most missed',
    strat_hard_desc: 'Prioritizes cards with lowest ease factor or highest historic mistakes.',
    strat_random_title: '🎲 Random / Entire syllabus',
    strat_random_desc: 'Randomly draws questions across the selected syllabus.',
    reschedule_cb_title: 'Reschedule with SRS algorithm (SM-2):',
    reschedule_cb_desc: 'Rating with the 4 Anki buttons (Again, Hard, Good, Easy) recalculates intervals starting today, accelerating your real retention curve.',
    btn_start_force: '⚡ Start Forced Session',
    tag_forced_session: '⚡ Forced Session',
    tag_forced_completed: '⚡ Forced Session Completed',
    force_completed_title: 'Forced study session completed!',
    force_completed_desc: 'Successfully reviewed <b>{total} cards</b> in <b>{scope}</b>.',
    intervals_expanded: 'intervals expanded',
    srs_active_label: 'SRS Active',
    srs_active_sub: 'Cards rescheduled',
    srs_review_label: 'Review',
    srs_review_sub: 'Dates unchanged',
    btn_another_force: '⚡ Another forced session',

    // Test Modal & Execution
    test_modal_title: '📝 Configure Practice Test',
    mock_modal_title: '🎓 Configure Final Mock Exam',
    mock_modal_sub: 'DATA 51000 Practice Final Exam · <b>{total}</b> questions available (1 point each)',
    test_modal_sub: '{scope} · <b>{total}</b> questions available',
    how_many_questions: 'HOW MANY QUESTIONS IN THE TEST?',
    all_questions_chip: '⭐ All ({total})',
    full_exam_chip: '⭐ Full exam ({total})',
    questions_unit: 'questions',
    immediate_feedback_title: 'Immediate feedback:',
    immediate_feedback_desc: 'see correct answer and explanation after each question',
    shuffle_title: 'Shuffle questions:',
    shuffle_desc: 'random order to avoid memorizing positions',
    btn_start_test: '🚀 Start Test',
    btn_start_exam: '🎓 Start Exam',
    exit_test_btn: '← Exit test',
    test_tag: '📝 Test · {topic}',
    question_counter: 'Question <b>{cur}</b> of <b>{total}</b>',
    correct_msg: '✓ Correct answer!',
    incorrect_msg: '✗ Incorrect answer',
    was_single: 'Was:',
    were_multi: 'Were:',
    btn_next_question: 'Next question →',
    btn_finish_test: 'Finish test & see score →',

    // Test Summary
    test_results_title: '🏁 Test Results',
    test_results_sub: '{scope} · {total} questions evaluated',
    test_score_label: 'Your final test score',
    mock_score_label: 'Final Mock Exam Score',
    mock_points_detail: 'Score: <b style="color:{color}">{correct}</b> / {total} points (1 point per question)',
    btn_repeat_test: '🔄 Retake this test',
    btn_new_test: '📝 Take another test...',
    btn_to_dashboard: '🏠 Go to dashboard',
    feedback_excellent: 'Excellent result! You have mastered these subject questions with confidence.',
    feedback_great: 'Great job! You have a solid command of the material. Review the mistakes below to aim for 10/10.',
    feedback_pass: 'You passed the test! Take time to review the missed questions to reinforce your knowledge.',
    feedback_fail: 'You did not reach the passing grade (5.0). Review the explanations below and try again.',

    // Ranking View
    ranking_title: 'Class Leaderboard',
    ranking_sub: '{scope} · predicted exam grade',
    tab_general: '🌍 Overall (All)',
    your_rank_is: 'Your rank: <b>#{rank}</b> of {total} students',
    sort_by_label: 'Sort by:',
    sort_score: 'Expected score (exam estimate)',
    sort_coverage: 'Highest coverage (% syllabus seen)',
    sort_reviews: 'Total reviews completed',
    sort_accuracy: 'Overall accuracy percentage',

    // Stats View
    stats_title: 'Statistics',
    stats_progress_tab: '📈 My Progress',
    stats_compare_tab: '👥 Compare',
    time_7d: 'Last 7 days',
    time_30d: 'Last 30 days',
    time_all: 'All time',
    class_average: '👥 Class average',
  }
};

let currentLang = localStorage.getItem('lewis-quiz-lang') || 'es';
if (currentLang !== 'es' && currentLang !== 'en') currentLang = 'es';

let currentTheme = localStorage.getItem('lewis-quiz-theme') || 'auto';
if (!['auto', 'light', 'dark'].includes(currentTheme)) currentTheme = 'auto';

function t(key, params = {}) {
  let str = (I18N[currentLang] && I18N[currentLang][key]) || (I18N['es'] && I18N['es'][key]) || key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return str;
}

function tTopicName(subjectId, topicId) {
  if (topicId === 'final-mock') return t('final_mock_name');
  const key = `${subjectId}_t${topicId}`;
  return t(key);
}

function setLang(lang) {
  if (lang !== 'es' && lang !== 'en') return;
  currentLang = lang;
  localStorage.setItem('lewis-quiz-lang', lang);
  document.documentElement.lang = lang;
  if (window.refreshCurrentView) {
    window.refreshCurrentView();
  }
}

function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('lewis-quiz-theme', theme);
  const root = document.documentElement;
  if (theme === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

function setTheme(theme) {
  applyTheme(theme);
  // Update theme toggle buttons active state in the DOM
  document.querySelectorAll('[data-set-theme]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.setTheme === theme);
  });
}

// Initial theme application
applyTheme(currentTheme);
document.documentElement.lang = currentLang;

// Watch system theme change if in auto mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (currentTheme === 'auto') {
    applyTheme('auto');
  }
});

function renderTopControls() {
  return `
    <div class="top-controls" style="display:inline-flex;align-items:center;gap:6px">
      <!-- Selector de Idioma -->
      <div class="control-segment lang-segment" role="group" aria-label="Idioma / Language">
        <button class="btn-ctrl ${currentLang === 'es' ? 'active' : ''}" data-set-lang="es" title="Español">🇪🇸 ES</button>
        <button class="btn-ctrl ${currentLang === 'en' ? 'active' : ''}" data-set-lang="en" title="English">🇺🇸 EN</button>
      </div>
      <!-- Selector de Tema (Luz / Auto / Oscuro) -->
      <div class="control-segment theme-segment" role="group" aria-label="Tema / Theme">
        <button class="btn-ctrl ${currentTheme === 'light' ? 'active' : ''}" data-set-theme="light" title="${t('theme_light_title')}">☀️</button>
        <button class="btn-ctrl ${currentTheme === 'auto' ? 'active' : ''}" data-set-theme="auto" title="${t('theme_auto_title')}">💻</button>
        <button class="btn-ctrl ${currentTheme === 'dark' ? 'active' : ''}" data-set-theme="dark" title="${t('theme_dark_title')}">🌙</button>
      </div>
    </div>`;
}

// Event delegation for theme & language controls
document.addEventListener('click', (e) => {
  const langBtn = e.target.closest('[data-set-lang]');
  if (langBtn) {
    e.preventDefault();
    setLang(langBtn.dataset.setLang);
    return;
  }
  const themeBtn = e.target.closest('[data-set-theme]');
  if (themeBtn) {
    e.preventDefault();
    setTheme(themeBtn.dataset.setTheme);
    return;
  }
});

window.I18N = I18N;
window.t = t;
window.tTopicName = tTopicName;
window.currentLang = currentLang;
window.setLang = setLang;
window.currentTheme = currentTheme;
window.setTheme = setTheme;
window.renderTopControls = renderTopControls;
