// Registro de asignaturas. Cada archivo de preguntas añade la suya con SUBJECTS.push({ id, name, topics, questions }).
// Los `id` de pregunta deben ser únicos entre todas las asignaturas: son la clave del progreso guardado.
// `answer` es el índice de la opción correcta, o un array de índices si hay que marcar varias («select all that apply»).

const SUBJECTS = [];
const TF = ['True', 'False'];
