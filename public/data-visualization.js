// Banco de preguntas de Data Visualization.
// Fuente: revisión del Quiz de la semana 1 en Blackboard. `answer` es el índice de la opción correcta dentro de `options`.

const DV_TOPICS = [
  { id: 1, name: 'Tema 1 · Fundamentos de la visualización y semiótica' },
];

const DV_QUESTIONS = [
  // ---------- Tema 1 ----------
  { id: 'dv1-01', topic: 1, q: 'What is semiotics?',
    options: ['Study of symbols and how they convey meaning.', 'Study of human perception.', 'Study of structure and meaning of language.', 'None of the above.'], answer: 0,
    explain: 'La semiótica estudia los símbolos (signos) y cómo transmiten significado.' },
  { id: 'dv1-02', topic: 1, q: 'Sensory representations tend to be stable across individuals, cultures, and time.',
    options: TF, answer: 0,
    explain: 'Las representaciones sensoriales se apoyan en el procesamiento perceptivo innato del cerebro, así que funcionan igual entre individuos, culturas y épocas.' },
  { id: 'dv1-03', topic: 1, q: 'Words are considered arbitrary representations.',
    options: TF, answer: 0,
    explain: 'Las palabras son el ejemplo clásico de representación arbitraria (convencional): nada en la palabra «dog» se parece a un perro.' },
  { id: 'dv1-04', topic: 1, q: 'Which of the following is an advantage of data visualization?',
    options: ['Ability to comprehend huge amounts of data.', 'Allows the perception of emergent properties that were not anticipated.', 'Enables problems with the data itself to become immediately apparent.', 'All of the above'], answer: 3,
    explain: 'Las tres son ventajas que enumera Ware, junto con facilitar la comprensión a varias escalas y ayudar a formular hipótesis.' },
  { id: 'dv1-05', topic: 1, q: 'Which of the following is a characteristic of arbitrary representation?',
    options: ['Its interpretation depends on culture identified with the reader.', 'It is hard to forget.', 'It has high sensory immediacy.', 'Can be understood without training.'], answer: 0,
    explain: 'Su interpretación depende de la cultura del lector. Las otras tres describen representaciones sensoriales: las arbitrarias se olvidan fácilmente, tienen poca inmediatez sensorial y requieren aprendizaje.' },
];

SUBJECTS.push({ id: 'dv', name: 'Data Visualization', topics: DV_TOPICS, questions: DV_QUESTIONS });
