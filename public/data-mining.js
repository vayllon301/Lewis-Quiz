// Banco de preguntas de Data Mining.
// Fuente: capturas de "Data Mining Questions/Chapter N", data_mining_quizzs.docx, las revisiones de los Quiz 1–6 en Blackboard, Tema 7 DM & SP.pdf y DATA 51000 Practice Final Exam (sin duplicados;
// en dm4-10 las opciones incorrectas son inventadas porque en Blackboard era de rellenar el hueco).

const DM_TOPICS = [
  { id: 1, name: 'Tema 1 · Introducción a la minería de datos' },
  { id: 2, name: 'Tema 2 · Bases de datos, MapReduce y TF.IDF' },
  { id: 3, name: 'Tema 3 · Similitud, LSH y clustering' },
  { id: 4, name: 'Tema 4 · Itemsets frecuentes y reglas de asociación' },
  { id: 5, name: 'Tema 5 · Clasificación y evaluación' },
  { id: 6, name: 'Tema 6 · Grafos y análisis de enlaces' },
  { id: 7, name: 'Tema 7 · Publicidad online y algoritmos online' },
];

const DM_TASKS = ['Classification', 'Regression', 'Link Analysis', 'Collaborative Filtering', 'Clustering', 'Association Rule Mining'];
const DM_ATTR = ['Continuous', 'Nominal', 'Ordinal', 'Binary'];

const DM_CUSTOMERS = `Assume you have a database with two relations (i.e. tables): customers and accounts.
The schema for customers is composed of the following attributes:
• customerID (integer)
• name (string)
• address (string)
• phone (string)
The schema for accounts is composed of the following attributes:
• customerID (integer)
• accountNumber (integer)
• balance (float)
`;

const DM_DOCS3 = `Assume you have 3 documents with the following terms:
• D1 = "computer", "web", "storage", "options"
• D2 = "computer", "game", "development"
• D3 = "web", "development", "frameworks"
`;

const DM_MINHASH = `Given the following characteristic matrix:
       Doc 1  Doc 2  Doc 3
Row 1:   1      1      0
Row 2:   0      1      1
Row 3:   1      0      1
Row 4:   1      1      0
and permutations:
P1 = (2,4,3,1)
P2 = (1,2,4,3)
P3 = (4,3,2,1)
`;

const DM_ITEMSETS = `Given the following itemsets:
{A,B,C}
{B,C}
{A,B,C,D}
{A,C,D}
{C,D}
{B,C}
{B,D}
`;

const DM_MIS = `Assume you have the following transactions:
{1, 2, 4}
{2, 4}
{1, 4}
{2, 4}
{1, 3}
and MIS(1)=5, MIS(2)=3, MIS(3)=4, MIS(4)=2.
`;

const DM_TRAINING = `Assume you have the following data set (EXP = Experience, QUAL = Sufficient Qualifications?, REFOP = Opinions of References):
 #  EXP        QUAL  REFOP          label
 1  good       yes   favorable      1
 2  excellent  yes   favorable      1
 3  none       no    favorable      0
 4  good       no    not favorable  0
 5  good       yes   not favorable  0
 6  excellent  yes   not favorable  0
 7  excellent  yes   favorable      1
 8  good       yes   favorable      1
 9  none       yes   favorable      1
10  none       yes   not favorable  0
`;

// TRUE / PREDICTED
const DM_PRED_A = `The following are true labels and predicted labels for a test set:
TRUE:      1 0 1 0 1 1 0 0 1 1
PREDICTED: 1 0 1 0 1 0 1 1 1 1
`;
const DM_PRED_B = `The following are true labels and predicted labels for a test set:
TRUE:      1 0 1 0 1 1 0 0 1 1
PREDICTED: 0 0 0 0 0 0 0 0 1 0
`;

const DM_M = `M =
[1/2  1/3  0]
[1/2  1/3  0]
[ 0   1/3  1]
`;

const DM_QUESTIONS = [
  // ---------- Tema 1 ----------
  { id: 'dm1-01', topic: 1, q: 'A data schema is',
    options: ["a description of a data set's attributes and their properties", 'a set of instances', 'a quantity describing an instance', 'a grouping of instances'], answer: 0,
    explain: 'El esquema describe los atributos del conjunto de datos y sus propiedades (tipo, dominio…), no los datos en sí.' },
  { id: 'dm1-02', topic: 1, q: "Identify all the data mining tasks that could be naturally associated with the following application:\nFinding how a person's average weight varies with demographics.",
    options: DM_TASKS, answer: [1],
    explain: 'El peso medio es un valor numérico continuo que se predice a partir de variables demográficas: es regresión.' },
  { id: 'dm1-03', topic: 1, q: 'Which of the following attribute types is most fitting for an attribute specifying a distance value, where the values are specified in meters',
    options: DM_ATTR, answer: 0,
    explain: 'Una distancia en metros es una magnitud numérica que puede tomar cualquier valor real: continuo.' },
  { id: 'dm1-04', topic: 1, q: 'A Decision Tree is an example of a:',
    options: ['Classifier', 'Linear regression', 'Continuous attribute', 'Support Vector Machine'], answer: 0,
    explain: 'Un árbol de decisión asigna una clase a cada instancia: es un clasificador.' },
  { id: 'dm1-05', topic: 1, q: 'Which of the following attribute types is most fitting for an attribute specifying whether a person is employed?',
    options: DM_ATTR, answer: 3,
    explain: 'Solo tiene dos valores posibles (sí/no): binario.' },
  { id: 'dm1-06', topic: 1, q: 'Identify all the data mining tasks that could be naturally associated with the following application:\nFinding possible drug interactions from patient data.',
    options: DM_TASKS, answer: [5],
    explain: 'Buscar qué fármacos aparecen juntos con ciertos efectos es buscar co-ocurrencias: reglas de asociación.' },
  { id: 'dm1-07', topic: 1, q: "Identify all the data mining tasks that could be naturally associated with the following application:\nRecommending a wine based on the client's preferences (e.g. I want a sweet red wine).",
    options: DM_TASKS, answer: [0, 3],
    explain: 'Se puede clasificar cada vino según encaje o no con las preferencias, o recomendar con filtrado colaborativo (lo que gustó a clientes parecidos).' },
  { id: 'dm1-08', topic: 1, q: 'In clustering tasks, each data instance contains a class attribute, and the goal is to find a function that maps instances into classes.',
    options: TF, answer: 1,
    explain: 'Eso describe la clasificación. El clustering es no supervisado: no hay atributo de clase y se agrupan instancias parecidas.' },
  { id: 'dm1-09', topic: 1, q: "Which of the following attribute types is most fitting for an attribute specifying an object's color (red, green, white, etc.) ?",
    options: DM_ATTR, answer: 1,
    explain: 'Los colores son categorías sin orden natural: nominal.' },
  { id: 'dm1-10', topic: 1, q: 'Identify all the data mining tasks that could be naturally associated with the following application:\nRecommending a possible friend for a user of a social network.',
    options: DM_TASKS, answer: [0, 2, 3],
    explain: 'Se puede clasificar cada par como «amigos o no», analizar los enlaces del grafo social (amigos de amigos) o usar filtrado colaborativo.' },
  { id: 'dm1-11', topic: 1, q: "Which of the following attribute types is most fitting for an attribute specifying a person's income as low, medium, or high?",
    options: DM_ATTR, answer: 2,
    explain: 'Son categorías con un orden natural (low < medium < high): ordinal.' },
  { id: 'dm1-12', topic: 1, q: 'Collaborative filtering is a technique most often used for recommendation systems',
    options: TF, answer: 0,
    explain: 'El filtrado colaborativo recomienda a partir de las preferencias de usuarios parecidos: es la base de los sistemas de recomendación.' },

  // ---------- Tema 2 ----------
  { id: 'dm2-01', topic: 2, q: DM_DOCS3 + 'If the query Q is composed of terms "computer" and "development", what is the relevance of the query to document D2, using the TF.IDF measure?',
    options: ['1.16992', '0.58496', '0', '1'], answer: 0,
    explain: 'TF = f / máx. f del documento = 1 para ambos términos. Cada uno aparece en 2 de 3 documentos: IDF = log2(3/2) ≈ 0.585. Relevancia = 0.585 + 0.585 = 1.16992.' },
  { id: 'dm2-02', topic: 2, q: DM_CUSTOMERS + 'What is the SQL query to find all customer names who have at least one account with balance >$100,000 ?',
    options: ['SELECT name FROM customers, accounts WHERE customers.customerID=accounts.customerID AND balance>100000',
      'SELECT customers FROM name, accounts WHERE customers.customerID=accounts.customerID AND balance>100000',
      'SELECT name FROM customers, accounts WHERE balance>100000',
      'SELECT name FROM customers, accounts WHERE name=accounts.customerID AND balance>100000'], answer: 0,
    explain: 'Hay que unir las dos tablas por customerID (si no, sale el producto cartesiano) y filtrar por balance.' },
  { id: 'dm2-03', topic: 2, q: 'Which of the following SQL statements is equivalent to the Relational Algebra query:\nπ_name(σ_age=21(Employee))',
    options: ['SELECT name FROM Employee WHERE age=21', 'SELECT Employee FROM name, age WHERE age=21', 'SELECT age=21 FROM Employee.name', 'SELECT Employee WHERE age=21 FROM name'], answer: 0,
    explain: 'σ (selección) filtra filas → WHERE age=21. π (proyección) elige columnas → SELECT name.' },
  { id: 'dm2-04', topic: 2, q: 'How does Hadoop know that DataNodes fail?',
    options: ['DataNodes stop sending heartbeat messages', 'DataNodes are polled', 'DataNodes send a signal indicating failure', 'Hadoop cannot know when DataNodes fail'], answer: 0,
    explain: 'Cada DataNode envía latidos (heartbeats) periódicos al NameNode. Si dejan de llegar, se da por caído. Un nodo caído no puede avisar de que ha fallado.' },
  { id: 'dm2-05', topic: 2, q: 'Assume you have 5 documents with the following terms:\n• D1 = "data", "web", "storage", "options"\n• D2 = "computer", "game", "development"\n• D3 = "web", "mining", "development", "frameworks"\n• D4 = "programming", "game", "course", "programming", "mining", "game"\n• D5 = "data", "mining", "course"\nIf the query Q is composed of terms "game" and "mining", what is the relevance of document D4 to the query, using the TF.IDF measure?',
    options: ['1.69', '0.676', '-1.69', '0.487'], answer: 0,
    explain: 'En D4 la frecuencia máxima es 2. game: TF = 2/2 = 1, IDF = log2(5/2) ≈ 1.32. mining: TF = 1/2, IDF = log2(5/3) ≈ 0.74 → 0.37. Total ≈ 1.69.' },
  { id: 'dm2-06', topic: 2, q: 'Which of the following is generally NOT a reason for using MapReduce over OLAP ?',
    options: ['MapReduce provides quick access to simple statistics for the data', 'MapReduce can be used to compute a greater class of analytics than OLAP', 'MapReduce is easily scalable and works with off-the-shelf systems', 'MapReduce automatically deals with hardware failures'], answer: 0,
    explain: 'El acceso rápido a estadísticas simples (agregados precalculados en cubos) es justo la ventaja de OLAP. MapReduce es por lotes.' },
  { id: 'dm2-07', topic: 2, q: DM_CUSTOMERS + 'What is the SQL query to find the customer name with account number 12345.',
    options: ['SELECT name FROM customers, accounts WHERE customers.customerID=accounts.customerID AND accountNumber=12345',
      'SELECT customers, accounts FROM name WHERE customers.customerID=accounts.customerID AND accountNumber=12345',
      'SELECT name FROM customers, accounts WHERE accountNumber=12345',
      'SELECT accountNumber FROM name WHERE customers.customerID=accounts.customerID AND accountNumber=12345'], answer: 0,
    explain: 'SELECT columna FROM tablas, con la condición de unión por customerID y el filtro accountNumber=12345.' },
  { id: 'dm2-08', topic: 2, q: 'At a high level, what is the purpose of the following mapper and reducer combination?\nMapper:\nFOR EACH line IN input\n  FOR EACH number IN line\n    emit (<"s", number^2>)\nReducer:\nt = 0\nFOR EACH value IN input list\n  t = t + value\nemit(<"t", t>)',
    options: ['Compute the sum of squares of each integer in the input', 'Compute the maximum integer in the input', 'Count the word frequency in the input', 'Sum all integers in the input'], answer: 0,
    explain: 'El mapper emite el cuadrado de cada número, todos con la misma clave, y el reducer los suma: suma de cuadrados.' },
  { id: 'dm2-09', topic: 2, q: DM_DOCS3 + 'What is the TF.IDF score of the term "computer" in document D1?',
    options: ['0.58496', '1.16992', '0', '1'], answer: 0,
    explain: 'TF = 1/1 = 1. "computer" aparece en 2 de 3 documentos: IDF = log2(3/2) ≈ 0.58496.' },
  { id: 'dm2-10', topic: 2, q: 'Positioning data from a GPS system is an example of unstructured data.',
    options: TF, answer: 1,
    explain: 'Los datos GPS tienen un formato fijo (latitud, longitud, hora…): son datos estructurados.' },
  { id: 'dm2-11', topic: 2, q: 'Assume the output from Mappers in a MapReduce application is the following set of key/value pairs:\n<1, 1>, <1, 2>, <1, 3>, <2, 1>, <2, 2>, <3, 1>\nWhat is the set of inputs that are given to the reducers?',
    options: ['<1, [1, 2, 3]>, <2, [1, 2]>, <3, [1]>', '<1, 3>, <1, 2>, <1, 1>', '<[1], [2], [3]>', '<1, 1>, <1, 2>, <1, 3>, <2, 1>, <2, 2>, <3, 1>'], answer: 0,
    explain: 'En la fase shuffle/sort se agrupan los valores por clave: cada reducer recibe <clave, [lista de valores]>.' },
  { id: 'dm2-12', topic: 2, q: 'What is the main purpose of a data warehouse?',
    options: ['To provide a repository for the purpose of analysis', 'To quickly store and update transaction data', 'To backup data', 'To store unstructured data'], answer: 0,
    explain: 'Un data warehouse integra datos históricos de varias fuentes para analizarlos (OLAP). Guardar y actualizar transacciones rápido es tarea de las bases de datos operacionales (OLTP).' },
  { id: 'dm2-13', topic: 2, q: 'Based on the TF.IDF measure of similarity, if a term appears in many documents, it will be given a higher IDF value.',
    options: TF, answer: 1,
    explain: 'IDF = log2(N / n_i): cuantos más documentos contienen el término, menor es su IDF, porque discrimina menos.' },
  { id: 'dm2-14', topic: 2, q: 'At a high level, what is the purpose of the following mapper and reducer combination?\nMapper:\nFOR EACH line IN input\n  v = -inf\n  FOR EACH number IN line\n    IF number > v, THEN v = number\n  emit (<"v", v>)\nReducer:\nFOR EACH line IN input\n  v = -inf\n  FOR EACH number IN line\n    IF number > v, THEN v = number\n  emit (<"v", v>)',
    options: ['Computes the maximum integer in the input', 'Computes the count of integers greater than a certain value', 'Computes the sum of squares of each integer', 'Does not produce any output'], answer: 0,
    explain: 'El mapper emite el máximo de cada línea con la misma clave, y el reducer se queda con el máximo de esos máximos: el entero mayor de toda la entrada.' },

  // ---------- Tema 3 ----------
  { id: 'dm3-01', topic: 3, q: DM_MINHASH + 'What is the minhash signature of document 3?',
    options: ['2,2,3', '2,1,4', '1,4,3,2', '1,4,4,2'], answer: 0,
    explain: 'Se recorren las filas en el orden de cada permutación y se anota la primera fila con 1. Doc 3 tiene 1 en las filas 2 y 3. P1 (2,4,3,1): fila 2. P2 (1,2,4,3): fila 2. P3 (4,3,2,1): fila 3. Firma 2,2,3.' },
  { id: 'dm3-02', topic: 3, q: 'Which of the following algorithms would be more applicable to use for clustering when the number of clusters is known and time efficiency is an issue?',
    options: ['k-means', 'Agglomerative hierarchical clustering', 'Divisive hierarchical clustering', 'Minhashing'], answer: 0,
    explain: 'k-means necesita conocer k y es mucho más rápido que el clustering jerárquico (cuadrático o peor). Minhashing no es un algoritmo de clustering.' },
  { id: 'dm3-03', topic: 3, q: 'Given the following sets of integers:\nA={1, 2, 3, 4}\nB={2, 3, 5, 7}\nC={2, 4, 6}\nWhich pair has the highest Jaccard similarity?',
    options: ['A and C', 'A and B', 'B and C', 'They all have the same Jaccard similarity.'], answer: 0,
    explain: 'Jaccard = |A ∩ B| / |A ∪ B|. sim(A,B) = 2/6 ≈ 0.33. sim(A,C) = 2/5 = 0.4. sim(B,C) = 1/6 ≈ 0.17.' },
  { id: 'dm3-04', topic: 3, q: 'You have the following data points:\n1, 2, 4, 6, 9\nAssuming you have done agglomerative hierarchical clustering with clusters are represented by their centroids (average), and at each step the clusters with the closest centroids were merged. If you cut off the process once two clusters existed, which points belonged to these clusters?',
    options: ['C1 = {1,2,4,6}\nC2 = {9}', 'C1 = {1,2,4}\nC2 = {6,9}', 'C1 = {1,2}\nC2 = {4,6,9}', 'C1 = {1}\nC2 = {2,4,6,9}'], answer: 0,
    explain: 'Primero se une {1,2} (distancia 1, centroide 1.5). Después {4,6} (distancia 2, centroide 5). Luego 1.5–5 (3.5) está más cerca que 5–9 (4). Quedan {1,2,4,6} y {9}.' },
  { id: 'dm3-05', topic: 3, q: 'Using Locality-Sensitive Hashing, two dissimilar documents will always end up in separate buckets and therefore the similarity of these documents will not have to be computed.',
    options: TF, answer: 1,
    explain: 'LSH es probabilístico: puede haber falsos positivos (documentos distintos en el mismo bucket) y falsos negativos.' },
  { id: 'dm3-06', topic: 3, q: 'The problem that points in high-dimensional spaces appear to be at about the same distance from each other is called:',
    options: ['The curse of dimensionality', 'The clustering problem', 'The shingling problem', 'The representation problem'], answer: 0,
    explain: 'La maldición de la dimensionalidad: con muchas dimensiones casi todas las distancias entre puntos se parecen.' },
  { id: 'dm3-07', topic: 3, q: 'Which of the following distance measures is most applicable for comparing strings?',
    options: ['Edit distance', 'Cosine distance', 'Chebyshev distance', 'Manhattan distance'], answer: 0,
    explain: 'La distancia de edición cuenta las inserciones, borrados (y sustituciones) necesarias para pasar de una cadena a otra.' },
  { id: 'dm3-08', topic: 3, q: 'Assume you have the following clusters of points:\nC1={1,2}, C2={4}\nWhat is the average silhouette score of this clustering, assuming Euclidean distance is used?',
    options: ['7/18', '-4/6', '1/2', '2'], answer: 0,
    explain: 's(i) = (b − a) / máx(a, b). s(1) = (3−1)/3 = 2/3. s(2) = (2−1)/2 = 1/2. s(4) = 0 por estar solo en su cluster. Media = (2/3 + 1/2 + 0)/3 = 7/18.' },
  { id: 'dm3-09', topic: 3, q: 'Which of the following is an appropriate way of determining the number of clusters for the k-means method?',
    options: ['Compute average silhouette scores for different values of k and choose k that generates the largest value.',
      'Compute average cluster diameter for different values of k, graph the diameter values over k, and choose a knee point.',
      'Compute average silhouette scores for different values of k and choose k that generates the smallest value.',
      'Compute average cluster diameter for different values of k, graph the diameter values over k, and choose a k that provides the largest average diameter.'], answer: [0, 1],
    explain: 'Una silueta alta indica clusters compactos y separados. El diámetro medio siempre baja al subir k, así que se busca el codo (knee point) donde deja de bajar mucho.' },
  { id: 'dm3-10', topic: 3, q: DM_MINHASH + 'What pair of documents has the lowest Jaccard similarity based on their minhash signatures?',
    options: ['1 and 3', '2 and 3', '1 and 2', 'Both 1-3 and 2-3.'], answer: 0,
    explain: 'Firmas: doc 1 = 4,1,4. Doc 2 = 2,1,4. Doc 3 = 2,2,3. Coincidencias: 1–2 → 2/3, 2–3 → 1/3, 1–3 → 0. La más baja es 1 y 3.' },
  { id: 'dm3-11', topic: 3, q: 'Assume you have the following data points:\n1, 4, 15, 20, 42\nand you execute the k-means algorithm to cluster the data with k=2.\nIf 1 is the first cluster centroid and 4 the second cluster centroid, then what are the final centroid values after the k-means algorithm finishes?',
    options: ['2.5 and 25.67', '1 and 20.25', '1 and 20', '2.5 and 20'], answer: 0,
    explain: 'Iteración 1: {1} y {4,15,20,42} → centroides 1 y 20.25. Iteración 2: {1,4} y {15,20,42} → 2.5 y 25.67. Ya no cambia.' },

  // ---------- Tema 4 ----------
  { id: 'dm4-01', topic: 4, q: 'In the PCY algorithm, if 3 pairs map to the same bucket and the minimum support is 2, which of the following statements is true?',
    options: ['Any pair that maps to this bucket may be frequent.', 'All pairs that map to this bucket are frequent.', 'Each of the items in the pair that maps to each bucket is frequent', 'None of the items in the pair that maps to each bucket is frequent'], answer: 0,
    explain: 'Un bucket frecuente solo dice que la suma de sus pares llega al soporte. Cualquiera de sus pares puede ser frecuente, pero no está garantizado.' },
  { id: 'dm4-02', topic: 4, q: "If we use a triangular matrix to count pairs, and n, the number of items, is 20, what pair's count is in a[100]?",
    options: ['7,8', '15,16', '20,1', '1,2'], answer: 0,
    explain: 'k = (i−1)(n − i/2) + j − i. Con i=7: 6·(20 − 3.5) = 99, y 99 + 8 − 7 = 100. Es el par {7,8}.' },
  { id: 'dm4-03', topic: 4, q: DM_MIS + 'Which items will be included in the set returned by the initial pass of the MSApriori algorithm?',
    options: ['{4, 2, 1}', '{1, 2}', '{4, 2, 3, 1}', '{4, 2}'], answer: 0,
    explain: 'Recuentos: c(1)=3, c(2)=3, c(3)=1, c(4)=4. Se ordena por MIS: M = <4,2,3,1>. El primer ítem que cumple su MIS es 4 (4 ≥ 2). Desde ahí entra todo ítem con recuento ≥ MIS(4) = 2: F = {4, 2, 1}.' },
  { id: 'dm4-04', topic: 4, q: 'What is the main advantage of using the MSApriori algorithm compared to the standard Apriori?',
    options: ['MSApriori allows for finding rules related to rare items, while limiting the total number of rules generated.', 'MSApriori will always have a faster execution time.', 'MSApriori can find more confident rules.', 'MSApriori reduces space requirements.'], answer: 0,
    explain: 'Con soportes mínimos por ítem (MIS) se pueden encontrar reglas de ítems raros sin bajar el soporte global, que dispararía el número de reglas.' },
  { id: 'dm4-05', topic: 4, q: 'Which of the following algorithms would be the most appropriate to use for determining how many topics exist in a large collection of papers written about different topics?',
    options: ['Hierarchical agglomerative clustering', 'A-Priori', 'PCY', 'Locality-sensitive hashing'], answer: 0,
    explain: 'Si no se sabe cuántos grupos hay, el clustering jerárquico permite elegir el corte del dendrograma. A-Priori y PCY buscan itemsets frecuentes, y LSH busca pares similares.' },
  { id: 'dm4-06', topic: 4, q: 'Assuming there is sufficient memory to store all pairs of frequent items, The PCY algorithm runs slower than the standard A-Priori algorithm?',
    options: TF, answer: 0,
    explain: 'Si los pares caben en memoria, la tabla hash y el bitmap de PCY no ahorran nada y solo añaden trabajo: PCY va más lento.' },
  { id: 'dm4-07', topic: 4, q: DM_ITEMSETS + 'What is the confidence of {B,C}->D ?',
    options: ['0.25', '1', '0', '0.5'], answer: 0,
    explain: 'conf = sop({B,C,D}) / sop({B,C}) = 1/4 = 0.25. {B,C} aparece en 4 itemsets y {B,C,D} solo en {A,B,C,D}.' },
  { id: 'dm4-08', topic: 4, q: 'To count pairs, using the triples method is always more efficient than using a triangular matrix.',
    options: TF, answer: 1,
    explain: 'Las tripletas gastan 3 enteros por par, pero solo para los pares que aparecen. Solo ganan si aparece menos de 1/3 de los pares posibles.' },
  { id: 'dm4-09', topic: 4, q: DM_ITEMSETS + 'What will be in the candidate set C3 when applying the A-Priori algorithm with a support threshold of 3?',
    options: ['{ {A,B,C}, {A,C,D}, {B,C,D} }', '{ {A,B,C}, {A,B,D}, {A,C,D}, {B,C,D} }', '{ {A,C}, {B,D}, {C,D} }', '{ {A,C,D}, {B,C,D} }'], answer: 0,
    explain: 'Pares frecuentes (soporte ≥ 3): {A,C}=3, {B,C}=4, {C,D}=3. C3 son las uniones de dos pares frecuentes que forman un trío: {A,B,C}, {A,C,D} y {B,C,D}.' },
  { id: 'dm4-10', topic: 4, q: 'If the support of {A,B} is 4 and the support of {A} is 8, what is the confidence of the rule {A}->B ?',
    options: ['0.5', '2', '0.25', '4'], answer: 0,
    explain: 'conf(A→B) = sop({A,B}) / sop({A}) = 4/8 = 0.5.' },
  { id: 'dm4-11', topic: 4, q: 'Assume you are given the following collection of twelve baskets, each of which containing three of the six items 1 through 6:\n{1, 2, 3} {2, 3, 4} {3, 4, 5} {4, 5, 6}\n{1, 3, 5} {2, 4, 6} {1, 3, 4} {2, 4, 5}\n{3, 5, 6} {1, 2, 4} {2, 3, 5} {3, 4, 6}\nSuppose the support threshold is 4. On the first pass of the PCY Algorithm we use a hash table with 11 buckets, and the set {i, j} is hashed to bucket i×j mod 11.\nWhich of the following pairs would not be counted on the second pass of the PCY Algorithm?',
    options: ['{1,5}', '{1,2}', '{2,6}', '{5,6}'], answer: 0,
    explain: '{1,5} va al bucket 5, y ningún otro par de ítems 1–6 cae ahí. {1,5} solo aparece en {1,3,5}, así que el bucket suma 1 < 4: no es frecuente y el par no se cuenta.' },
  { id: 'dm4-12', topic: 4, q: DM_ITEMSETS + 'What is the support of {A,C} ?',
    options: ['3', '1', '2', '4'], answer: 0,
    explain: '{A,C} está en {A,B,C}, {A,B,C,D} y {A,C,D}: soporte 3.' },
  { id: 'dm4-13', topic: 4, q: 'Assume you have a transaction database with items 1, 2, 3, and 4. The counts and MIS values of these items is listed below.\n1: count=3, MIS=3\n2: count=2, MIS=4\n3: count=1, MIS=2\n4: count=4, MIS=1\nIf the initial pass of the algorithm returned F = {4, 3, 1, 2}, then what pairs will be generated by the second level candidate generation algorithm?',
    options: ['{<4,3>, <4,1>, <4,2>}', '{<4,3>, <4,1>, <4,2>, <3,1>, <3,2>}', '{<4,3>, <4,1>, <4,2>, <3,1>, <3,2>, <1,2>}', '{}'], answer: 0,
    explain: '4 es frecuente (4 ≥ MIS 1) y combina con los siguientes cuyo recuento ≥ MIS(4) = 1: <4,3>, <4,1>, <4,2>. 3 no es frecuente (1 < 2), así que no genera pares. 1 con 2: c(2) = 2 < MIS(1) = 3, no entra. 2 es el último.' },
  { id: 'dm4-14', topic: 4, q: DM_ITEMSETS + 'What is the interest of {A}->C ?',
    options: ['0.143', '0', '1', '0.857'], answer: 0,
    explain: 'interés = conf(A→C) − P(C). conf = 3/3 = 1, porque C está en los 3 itemsets con A. P(C) = 6/7 ≈ 0.857. Interés = 1 − 0.857 ≈ 0.143.' },

  // ---------- Tema 5 ----------
  { id: 'dm5-01', topic: 5, q: DM_TRAINING + 'After performing decision tree induction using the information gain criteria, how many levels would the decision tree have?',
    options: ['2', '1', '3', '4'], answer: 0,
    explain: 'La raíz es REFOP, que tiene la mayor ganancia (0.61). La rama «not favorable» es toda 0. En «favorable» solo la instancia 3 es 0 y es la única con QUAL=no, así que un segundo nivel con QUAL separa todo.' },
  { id: 'dm5-02', topic: 5, q: 'If both knn and decision tree learning are used and the trained models for both are generated, the knn method will be generally faster to make a prediction than a decision tree.',
    options: TF, answer: 1,
    explain: 'kNN es perezoso: para predecir compara con todo el conjunto de entrenamiento. El árbol solo recorre un camino de la raíz a una hoja.' },
  { id: 'dm5-03', topic: 5, q: DM_PRED_A + 'What is the precision of the predictions?',
    options: ['71%', '100%', '10%', '50%'], answer: 0,
    explain: 'TP = 5 y FP = 2. Precisión = TP / (TP + FP) = 5/7 ≈ 71%.' },
  { id: 'dm5-04', topic: 5, q: 'A consistent hypothesis is necessarily the best hypothesis.',
    options: TF, answer: 1,
    explain: 'Una hipótesis consistente acierta todo el entrenamiento, pero puede sobreajustar y generalizar peor que otra más simple.' },
  { id: 'dm5-05', topic: 5, q: DM_TRAINING + 'What is the information gain of the REFOP attribute?',
    options: ['0.61', '0.65', '0', '0.76'], answer: 0,
    explain: 'H(S) = 1 (cinco 0 y cinco 1). Favorable: 1 cero y 5 unos → H ≈ 0.65. Not favorable: todo 0 → H = 0. IG = 1 − (0.6·0.65 + 0.4·0) = 0.61.' },
  { id: 'dm5-06', topic: 5, q: 'Which of the following measures is commonly used as a splitting criteria for decision tree induction?',
    options: ['Information gain', 'Precision', 'Recall', 'F-measure'], answer: 0,
    explain: 'Se divide por el atributo con más ganancia de información (o Gini). Precision, recall y F se usan para evaluar.' },
  { id: 'dm5-07', topic: 5, q: DM_PRED_B + 'What is the F1-measure value of the predictions?',
    options: ['29%', '10%', '71%', '83%'], answer: 0,
    explain: 'TP = 1, FP = 0 y FN = 5. P = 1 y R = 1/6. F1 = 2PR / (P + R) = 2·(1/6) / (7/6) = 2/7 ≈ 29%.' },
  { id: 'dm5-08', topic: 5, q: DM_PRED_A + 'What is the recall of the predictions?',
    options: ['83%', '71%', '70%', '10%'], answer: 0,
    explain: 'TP = 5 y FN = 1. Recall = TP / (TP + FN) = 5/6 ≈ 83%.' },
  { id: 'dm5-09', topic: 5, q: DM_PRED_A + 'What is the accuracy of the predictions?',
    options: ['70%', '50%', '10%', '100%'], answer: 0,
    explain: '7 de 10 predicciones coinciden con la etiqueta real: 70%.' },
  { id: 'dm5-10', topic: 5, q: 'If we had the values of precision and recall measures, it would be possible to easily compute the accuracy measure.',
    options: TF, answer: 1,
    explain: 'Ni la precisión ni el recall usan los verdaderos negativos (TN), y la exactitud sí los necesita.' },
  { id: 'dm5-11', topic: 5, q: 'Which of the following algorithms has been shown to make a weak learner into a strong learner?',
    options: ['AdaBoost', 'Random Forests', 'k-Nearest Neighbor', 'Kernel Regression'], answer: 0,
    explain: 'El boosting (AdaBoost) combina clasificadores débiles dando más peso a los errores, y se demostró que así se obtiene uno fuerte.' },
  { id: 'dm5-12', topic: 5, q: 'A machine learning algorithm may have overfit when its performance on training examples is significantly higher than on testing examples.',
    options: TF, answer: 0,
    explain: 'Es la señal típica de sobreajuste: el modelo memoriza el entrenamiento y no generaliza a datos nuevos.' },

  // ---------- Tema 6 ----------
  { id: 'dm6-01', topic: 6, q: 'A sparse matrix representation is more memory efficient.',
    options: TF, answer: 0,
    explain: 'Solo guarda los elementos distintos de cero. Para grafos grandes, con pocos enlaces por nodo, ahorra muchísima memoria.' },
  { id: 'dm6-02', topic: 6, q: 'Given the following adjacency matrix, the PageRank algorithm was executed with beta = 0.9. How many nodes had the same PageRank value?\n' + DM_M,
    options: ['2', 'All', 'None', 'Algorithm would not converge.'], answer: 0,
    explain: 'Los nodos 1 y 2 tienen filas idénticas, así que acaban con el mismo rango. El nodo 3 es una trampa (spider trap) y acumula más. Con β = 0.9 sí converge.' },
  { id: 'dm6-03', topic: 6, q: 'A node with high hubness value must necessarily have a low authority value.',
    options: TF, answer: 1,
    explain: 'En HITS el hub (apunta a buenas autoridades) y la autoridad (recibe enlaces de buenos hubs) son independientes: un nodo puede tener ambos altos.' },
  { id: 'dm6-04', topic: 6, q: 'What is the initial rank vector that should be used in the power iteration method to guarantee convergence?',
    options: ['A vector with any values that sum to 1', 'A vector with all zero values', 'A vector with all values equal to 1', 'A vector with all values set to the number of out-links for each node'], answer: 0,
    explain: 'Vale cualquier distribución de probabilidad (suma 1), normalmente 1/N para cada nodo. Con todo ceros se queda en cero.' },
  { id: 'dm6-05', topic: 6, q: 'Every strongly connected component of a graph satisfies the property of a weakly connected component.',
    options: TF, answer: 0,
    explain: 'Si hay camino dirigido entre cualquier par de nodos, también lo hay ignorando la dirección: fuertemente conexo implica débilmente conexo.' },
  { id: 'dm6-06', topic: 6, q: 'For PageRank to be computed, the stochastic adjacency matrix could be stored on the disk, but the rank vector has to be stored in main memory.',
    options: TF, answer: 1,
    explain: 'No es obligatorio: si el vector no cabe en memoria, se divide en bloques (block-stripe) y se procesa por partes.' },
  { id: 'dm6-07', topic: 6, q: 'Given the graph below, what is the rank of nodes A, B, and C ? Solve this by setting up the flow equations with the constraint that the sum of ranks is 1, and then solving the equations for the rank values (use PageRank model with beta=1):\nGraph edges: A→C, C→A, C→B, B→A',
    options: ['Ra=2/5\nRb=1/5\nRc=2/5', 'Ra=3/5\nRb=1/5\nRc=1/5', 'Ra=1/5\nRb=1/5\nRc=3/5', 'Ra=3/5\nRb=2/5\nRc=2/5'], answer: 0,
    explain: 'Ra = Rb + Rc/2, Rb = Rc/2 y Rc = Ra. Sustituyendo, Ra + Rc/2 + Rc = 1 → Rc = 2/5. Queda Ra = 2/5 y Rb = 1/5.' },
  { id: 'dm6-08', topic: 6, q: 'What is the value of x that would make the following adjacency matrix stochastic?\n[1/4  1/3  0]\n[1/2  1/3  0]\n[ x   1/3  1]',
    options: ['1/4', '1/2', '1/3', '0'], answer: 0,
    explain: 'En una matriz estocástica por columnas, cada columna suma 1: 1/4 + 1/2 + x = 1 → x = 1/4.' },
  { id: 'dm6-09', topic: 6, q: 'Every complete graph is a maximum clique.',
    options: TF, answer: 0,
    explain: 'En un grafo completo todos los vértices están conectados entre sí: todo el grafo es una clique y no puede haber otra mayor.' },
  { id: 'dm6-10', topic: 6, q: 'Given the following adjacency matrix, what is the approximate rank vector after one iteration of the power iteration method (use PageRank model with beta=1)?\n' + DM_M,
    options: ["[5/18, 5/18, 4/9]'", "[1, 0, 0]'", "[1/2, 1/3, 0]'", "[1, 2, 3]'"], answer: 0,
    explain: 'r0 = [1/3, 1/3, 1/3] y r1 = M·r0. Fila 1: 1/6 + 1/9 = 5/18. Fila 2: 5/18. Fila 3: 1/9 + 1/3 = 4/9.' },
  { id: 'dm6-11', topic: 6, q: 'Which of the following values need to be recomputed at each iteration of the Girvan-Newman algorithm?',
    options: ['Edge-betweenness', 'Closeness', 'Modularity', 'PageRank'], answer: 0,
    explain: 'Girvan-Newman quita en cada paso la arista con más betweenness. Al cambiar el grafo hay que recalcularla.' },
  { id: 'dm6-12', topic: 6, q: 'What is the graph diameter of a complete graph of 10 vertices?',
    options: ['1', '10', '90', '1000'], answer: 0,
    explain: 'En un grafo completo todos los pares son adyacentes: el camino más corto más largo mide 1.' },
  { id: 'dm6-13', topic: 6, q: 'A small-world graph is characterized by which of the following properties?',
    options: ['Low average shortest path length', 'High clustering coefficient value', 'High average shortest path length', 'Low clustering coefficient value'], answer: [0, 1],
    explain: 'Mundo pequeño: caminos medios cortos (como un grafo aleatorio) y mucho agrupamiento local (como un grafo regular).' },
  { id: 'dm6-14', topic: 6, q: 'Assume you have a simple graph with 5 vertices: A, B, C, D, and E. What can we call a traversal of this graph if we start at A, then proceed to C, E, B, A, and finish at D?',
    options: ['walk', 'trail', 'path', 'cycle'], answer: [0, 1],
    explain: 'Es un walk. Como no repite aristas también es un trail. No es un path porque repite el vértice A, ni un ciclo porque no acaba donde empieza.' },
  { id: 'dm6-15', topic: 6, q: 'According to the PageRank model, a page with more in-links will always have higher rank than a page with less in-links',
    options: TF, answer: 1,
    explain: 'Importa la calidad de los enlaces: uno desde una página con mucho rango y pocos enlaces salientes vale más que muchos desde páginas poco importantes.' },
  // ---------- Tema 7 ----------
  { id: 'dm7-01', topic: 7, q: 'What is the main reason why it is hard to measure the ClickThrough Rate (CTR)?',
    options: ['CTR needs data on how many times an ad was clicked, but to do this, we may need to show a possibly worthless ad.', 'It requires expensive computation.', 'It cannot be computed in real-time.', 'The CTR will be less certain over time.'], answer: 0,
    explain: 'Para estimar el CTR de un anuncio hay que mostrarlo muchas veces y contar los clics, aunque luego resulte ser un anuncio que casi nadie pulsa (dilema exploración/explotación).' },
  { id: 'dm7-02', topic: 7, q: 'If the expected revenue per click for a particular advertiser is $0.02 and the bid for that advertiser was $0.50, what is the ClickThrough Rate?',
    options: ['4%', '2%', '50%', '20%'], answer: 0,
    explain: 'Ingreso esperado = puja × CTR → 0.02 = 0.50 × CTR → CTR = 0.04 = 4%.' },
  { id: 'dm7-03', topic: 7, q: 'An online algorithm will look at all the inputs before making a decision.',
    options: TF, answer: 1,
    explain: 'Eso es un algoritmo offline. Uno online decide con cada entrada según llega, sin conocer las futuras.' },
  { id: 'dm7-04', topic: 7, q: 'The BALANCE algorithm always chooses which of the following:',
    options: ['The advertiser with the largest unspent balance', 'The advertiser with the smallest unspent balance', 'A randomly selected advertiser', 'The advertiser with half of the balance spent'], answer: 0,
    explain: 'BALANCE asigna cada consulta al anunciante (que puja por ella) con más presupuesto sin gastar.' },
  { id: 'dm7-05', topic: 7, q: 'Consider the following scenario:\nThere are three advertisers A, B, and C\nA bids on query x, B bids on x and y, and C bids on x, y, and z\nAll have budgets of $3.\nGiven the following query stream:\nxxxyyyzzz\nWhat is the sequence of choices, assuming the worst case scenario, using the greedy algorithm?',
    options: ['C,C,C,B,B,B,_,_,_', 'C,B,A,C,B,C,_,_,_', 'C,C,C,B,B,B,A,A,A', 'A,A,A,B,B,B,C,C,C'], answer: 0,
    explain: 'En el peor caso greedy da las x a C y las y a B. Cuando llegan las z, C (el único que puja por z) ya no tiene presupuesto: quedan sin asignar.' },

  // ---------- Practice Final Exam (DATA 51000) ----------
  { id: 'dm-fe-01', topic: 7, exam: 'final-mock', examOrder: 1,
    q: 'Three advertisers bid on search terms. A bids on p, B bids on p and q, and C bids on p, q, and r. Each has a budget of $2. For the stream p, p, q, q, r, r, which sequence is possible under BALANCE if ties are resolved in the order C, B, A?',
    options: ['C, B, C, B, _, _', 'C, C, B, B, _, _', 'A, A, B, B, C, C', 'C, B, A, C, B, A'], answer: 0,
    explain: 'BALANCE elige al anunciante con mayor presupuesto restante. 1ª \'p\': empatan A, B, C ($2); por orden de desempate gana C (quedan A=$2, B=$2, C=$1). 2ª \'p\': empatan A y B ($2); desempate da B (quedan A=$2, B=$1, C=$1). 3ª \'q\': pujan B y C ($1); desempate da C (quedan A=$2, B=$1, C=$0). 4ª \'q\': solo B tiene presupuesto ($1) → gana B (A=$2, B=$0, C=$0). 5ª y 6ª \'r\': solo puja C pero tiene $0 → sin asignar (_, _).' },
  { id: 'dm-fe-02', topic: 3, exam: 'final-mock', examOrder: 2,
    q: 'Popularity bias in collaborative filtering can cause frequently rated items to be recommended more often than niche items.',
    options: TF, answer: 0,
    explain: 'Verdadero. El sesgo de popularidad en filtrado colaborativo ocurre porque los ítems populares acumulan muchas más valoraciones en el conjunto de datos, provocando que se recomienden con mucha más frecuencia que los ítems de nicho (long tail).' },
  { id: 'dm-fe-03', topic: 2, exam: 'final-mock', examOrder: 3,
    q: 'A corpus contains 8 documents. The term "cloud" occurs once in document D1 and appears in 2 documents total. Using TF = raw count and IDF = log2(N/df), what is the TF-IDF weight of "cloud" in D1?',
    options: ['1', '2', '3', '4'], answer: 1,
    explain: 'N = 8 y df = 2. IDF = log2(N / df) = log2(8 / 2) = log2(4) = 2. Con TF = recuento crudo = 1 en D1, TF-IDF = TF × IDF = 1 × 2 = 2.' },
  { id: 'dm-fe-04', topic: 6, exam: 'final-mock', examOrder: 4,
    q: 'A clique is a set of vertices in which every pair of vertices is connected. Every maximal clique is necessarily a maximum clique.',
    options: TF, answer: 1,
    explain: 'Falso. Una clique maximal no puede expandirse añadiendo otro vértice, pero una clique máxima (maximum clique) es la de mayor tamaño posible en todo el grafo. Una clique puede ser maximal sin ser máxima (ej. una clique de 3 nodos en un grafo que contiene una de 5).' },
  { id: 'dm-fe-05', topic: 3, exam: 'final-mock', examOrder: 5,
    q: 'After mean-centering user ratings, user U has ratings [1, -1] on two co-rated items and user V has ratings [-2, 2]. What is their cosine similarity?',
    options: ['-1', '0', '0.5', '1'], answer: 0,
    explain: 'sim(U, V) = (U · V) / (||U|| · ||V||). U · V = (1)(-2) + (-1)(2) = -4. ||U|| = √(1² + (-1)²) = √2. ||V|| = √((-2)² + 2²) = √8 = 2√2. sim = -4 / (√2 · 2√2) = -4 / 4 = -1.' },
  { id: 'dm-fe-06', topic: 6, exam: 'final-mock', examOrder: 6,
    q: 'Which properties are characteristic of a small-world network?',
    options: ['Short average path length', 'High clustering coefficient', 'Every vertex has the same degree', 'No triangles'], answer: [0, 1],
    explain: 'Las dos propiedades del modelo Watts-Strogatz de mundo pequeño son: 1) longitud media de caminos corta (short average path length) y 2) alto coeficiente de agrupamiento local (high clustering coefficient).' },
  { id: 'dm-fe-07', topic: 5, exam: 'final-mock', examOrder: 7,
    q: 'Using the data below, what is the information gain of attribute A for predicting the label?\n\nRecord   A     Label\n1        yes   0\n2        yes   1\n3        yes   1\n4        no    0\n5        no    0\n6        no    0',
    options: ['0', '0.082', '0.459', '1'], answer: 2,
    explain: 'H(S) = -(4/6)log2(4/6) - (2/6)log2(2/6) ≈ 0.9183. Al dividir por A: Para A=yes (un 0 y dos 1s), H(yes) = -(1/3)log2(1/3) - (2/3)log2(2/3) ≈ 0.9183. Para A=no (tres 0s), H(no) = 0. H(S|A) = (3/6)(0.9183) + (3/6)(0) = 0.45915. Information Gain = 0.9183 - 0.45915 ≈ 0.459.' },
  { id: 'dm-fe-08', topic: 3, exam: 'final-mock', examOrder: 8,
    q: 'Run one-dimensional k-means with k=2 on points {2, 3, 7, 8, 9}, starting with centroids 2 and 7. What are the final clusters?',
    options: ['{2,3} and {7,8,9}', '{2,3,7} and {8,9}', '{2} and {3,7,8,9}', '{2,7} and {3,8,9}'], answer: 0,
    explain: 'Iteración 1 (centroides 2 y 7): {2,3} van al 2; {7,8,9} van al 7. Nuevos centroides: (2+3)/2 = 2.5 y (7+8+9)/3 = 8. Iteración 2: {2,3} siguen más cerca de 2.5 y {7,8,9} más cerca de 8. Los clusters no cambian y converge a {2,3} y {7,8,9}.' },
  { id: 'dm-fe-09', topic: 4, exam: 'final-mock', examOrder: 9,
    q: 'Transactions are {A,B}, {A,C}, {A,B,C}, {B,C}, {A,B,C,D}. What is the support count of {A,C}?',
    options: ['2', '3', '4', '5'], answer: 1,
    explain: '{A,C} está contenido en 3 transacciones: {A,C}, {A,B,C} y {A,B,C,D}. Por tanto su support count es 3.' },
  { id: 'dm-fe-10', topic: 1, exam: 'final-mock', examOrder: 10,
    q: 'Which statement best defines a data instance?',
    options: ['A collection of attribute values describing one object', 'A description of all attribute domains', 'A group of database tables', 'A rule for normalizing data'], answer: 0,
    explain: 'Una instancia de datos (registro, tupla o vector de características) es la colección de valores de atributos que describen a un único objeto.' },
  { id: 'dm-fe-11', topic: 3, exam: 'final-mock', examOrder: 11,
    q: 'The number of clusters is known in advance, the data are numeric, and runtime is important. Which method is generally the most appropriate?',
    options: ['k-means', 'Agglomerative hierarchical clustering', 'Divisive hierarchical clustering', 'Apriori'], answer: 0,
    explain: 'k-means requiere fijar k previamente, funciona sobre datos numéricos y su complejidad O(n·k·i) es mucho más rápida que el clustering jerárquico (O(n²) o O(n³)).' },
  { id: 'dm-fe-12', topic: 2, exam: 'final-mock', examOrder: 12,
    q: 'A JSON document always represents completely unstructured data.',
    options: TF, answer: 1,
    explain: 'Falso. JSON representa datos semiestructurados (semi-structured data) con claves, tipos, valores y anidamientos, no datos completamente no estructurados (como texto sin procesar o audio).' },
  { id: 'dm-fe-13', topic: 3, exam: 'final-mock', examOrder: 13,
    q: 'Which is a common limitation of content-based recommendation?',
    options: ['Overspecialization', 'It requires ratings from every user', 'It cannot explain recommendations', 'It cannot use item features'], answer: 0,
    explain: 'La sobreespecialización (overspecialization) es el inconveniente típico del filtrado basado en contenido: solo recomienda ítems muy similares a los ya conocidos por el usuario, sin permitir descubrir áreas o temáticas nuevas (falta de serendipia).' },
  { id: 'dm-fe-14', topic: 2, exam: 'final-mock', examOrder: 14,
    q: 'Which workload is a data warehouse primarily designed to support?',
    options: ['Historical analysis and decision support', 'High-volume transaction updates', 'Operating-system backups', 'Real-time device control'], answer: 0,
    explain: 'Un data warehouse está optimizado para consultas analíticas (OLAP): análisis histórico y soporte a decisiones empresariales. El procesamiento de transacciones operacionales corresponde a sistemas OLTP.' },
  { id: 'dm-fe-15', topic: 4, exam: 'final-mock', examOrder: 15,
    q: 'When the universe of possible pairs is very large but only a small fraction appears, storing observed pairs as triples can use less memory than a triangular matrix.',
    options: TF, answer: 0,
    explain: 'Verdadero. La matriz triangular reserva memoria para todos los pares posibles n(n-1)/2. Si los pares reales son muy escasos (esparsos), almacenar solo las tripletas (ítem_i, ítem_j, conteo) consume mucha menos memoria.' },
  { id: 'dm-fe-16', topic: 6, exam: 'final-mock', examOrder: 16,
    q: 'In HITS, authority and hub scores are distinct quantities.',
    options: TF, answer: 0,
    explain: 'Verdadero. En el algoritmo HITS, la puntuación de autoridad y la de hub son dos magnitudes diferentes asociadas a cada nodo: la autoridad mide la calidad de contenido (recibe enlaces de buenos hubs) y el hub mide la calidad como directorio (apunta a buenas autoridades).' },
  { id: 'dm-fe-17', topic: 5, exam: 'final-mock', examOrder: 17,
    q: 'Using the test results below, what is recall for the positive class?\n\nTrue   Predicted\n1      1\n1      0\n0      0\n1      1\n0      1\n1      1\n0      0',
    options: ['50%', '60%', '75%', '80%'], answer: 2,
    explain: 'Hay 4 casos positivos reales (True = 1: filas 1, 2, 4 y 6). De ellos, 3 se predijeron como 1 (TP = 3: filas 1, 4, 6) y 1 como 0 (FN = 1: fila 2). Recall = TP / (TP + FN) = 3 / 4 = 75%.' },
  { id: 'dm-fe-18', topic: 3, exam: 'final-mock', examOrder: 18,
    q: 'You want to explore an unknown number of document groups and inspect the cluster structure at several levels. Which method is most suitable?',
    options: ['Hierarchical agglomerative clustering', 'PCY', 'Minhashing', 'Logistic regression'], answer: 0,
    explain: 'El clustering jerárquico aglomerativo construye un árbol jerárquico (dendrograma) que permite examinar la estructura de grupos a diferentes niveles de granularidad sin prefijar el número de clusters.' },
  { id: 'dm-fe-19', topic: 4, exam: 'final-mock', examOrder: 19,
    q: 'If enough memory is available to count every candidate pair directly, PCY may provide little benefit over standard Apriori.',
    options: TF, answer: 0,
    explain: 'Verdadero. PCY usa memoria residual para crear una tabla hash y podar pares candidatos. Si hay suficiente memoria principal para contar directamente todos los pares candidatos, el filtrado hash de PCY no ahorra pases ni memoria y añade sobrecarga.' },
  { id: 'dm-fe-20', topic: 5, exam: 'final-mock', examOrder: 20,
    q: 'Which ensemble method repeatedly reweights training examples to focus on previously misclassified cases?',
    options: ['AdaBoost', 'Bagging', 'k-nearest neighbors', 'Naive Bayes'], answer: 0,
    explain: 'AdaBoost (Adaptive Boosting) reasigna pesos a los ejemplos de entrenamiento en cada ronda, incrementando el peso de los casos erróneos para que el siguiente clasificador débil se centre en ellos.' },
  { id: 'dm-fe-21', topic: 3, exam: 'final-mock', examOrder: 21,
    q: 'For users represented by sets of purchased items, Jaccard similarity can be used to compare the overlap between their purchase sets.',
    options: TF, answer: 0,
    explain: 'Verdadero. La similitud de Jaccard (|A ∩ B| / |A ∪ B|) es la métrica natural para medir el grado de coincidencia entre dos conjuntos binarios de compras.' },
  { id: 'dm-fe-22', topic: 3, exam: 'final-mock', examOrder: 22,
    q: 'Using centroid linkage, begin with singleton points {1, 4, 5, 12}. Repeatedly merge the two clusters with closest centroids. If stopped at two clusters, what are they?',
    options: ['{1,4,5} and {12}', '{1,4} and {5,12}', '{1} and {4,5,12}', '{1,5} and {4,12}'], answer: 0,
    explain: 'Puntos iniciales: {1}, {4}, {5}, {12}. Distancia mínima: |4 - 5| = 1 → se unen {4,5} (centroide 4.5). Ahora quedan {1} (c=1), {4,5} (c=4.5) y {12} (c=12). La menor distancia entre centroides es |1 - 4.5| = 3.5 (frente a 7.5 de 4.5 a 12) → se unen {1} y {4,5} formando {1,4,5}. Al quedar dos clusters, el resultado es {1,4,5} y {12}.' },
  { id: 'dm-fe-23', topic: 5, exam: 'final-mock', examOrder: 23,
    q: 'A hypothesis that perfectly fits the training set is guaranteed to generalize best to unseen data.',
    options: TF, answer: 1,
    explain: 'Falso. Una hipótesis que se ajusta al 100% a los datos de entrenamiento suele sobreajustar (overfitting), memorizando el ruido y generalizando peor ante datos no vistos.' },
  { id: 'dm-fe-24', topic: 7, exam: 'final-mock', examOrder: 24,
    q: 'What are the worst-case and best-case competitive ratios of the greedy online bipartite matching algorithm?',
    options: ['1/2 and 1', '0 and 1/2', '0 and 1', '1 and 1'], answer: 0,
    explain: 'Para emparejamiento bipartito online, el algoritmo voraz (greedy) garantiza al menos un ratio competitivo de 1/2 en el peor caso (50% del óptimo offline) y puede alcanzar 1 (100%) en el mejor caso.' },
  { id: 'dm-fe-25', topic: 2, exam: 'final-mock', examOrder: 25,
    q: 'In Hadoop Distributed File System, which signal is used by the NameNode to detect that a DataNode may have failed?',
    options: ['Missing heartbeat messages', 'A failed SQL query', 'A MapReduce counter', 'A client logout'], answer: 0,
    explain: 'El NameNode supervisa la disponibilidad de los DataNodes mediante mensajes periódicos de latido (heartbeats). Si deja de recibir latidos de un nodo durante un intervalo de tiempo, lo marca como caído.' },
  { id: 'dm-fe-26', topic: 2, exam: 'final-mock', examOrder: 26,
    q: 'What does the following MapReduce computation produce?\n\nMapper:\n  for each number x:\n    emit("key", x)\n\nReducer:\n  m = -infinity\n  for each value v:\n    if v > m: m = v\n  emit("max", m)',
    options: ['The maximum input value', 'The sum of the input values', 'The number of input values', 'The sum of squared values'], answer: 0,
    explain: 'El mapper emite todos los números con la misma clave "key", enviándolos a un solo reducer. El reducer busca el valor máximo recorriendo todos los valores y emite el máximo global.' },
  { id: 'dm-fe-27', topic: 1, exam: 'final-mock', examOrder: 27,
    q: 'A satisfaction rating with values poor, fair, good, and excellent is which attribute type?',
    options: ['Nominal', 'Ordinal', 'Continuous', 'Binary'], answer: 1,
    explain: 'Los valores poor, fair, good y excellent tienen un orden cualitativo natural (poor < fair < good < excellent), por lo que es un atributo ordinal.' },
  { id: 'dm-fe-28', topic: 7, exam: 'final-mock', examOrder: 28,
    q: 'Why does estimating click-through rate create an exploration problem?',
    options: ['An ad must sometimes be displayed to obtain evidence about whether users will click it', 'CTR cannot be represented numerically', 'Clicks cannot be logged', 'All ads have identical CTR'], answer: 0,
    explain: 'Es el clásico problema de exploración/explotación: para saber si un anuncio nuevo tiene un buen CTR hay que mostrarlo (explorar), asumiendo el coste de no mostrar otro anuncio de rendimiento ya conocido.' },
  { id: 'dm-fe-29', topic: 3, exam: 'final-mock', examOrder: 29,
    q: 'For point x, the average distance to its own cluster is a(x)=2 and the smallest average distance to another cluster is b(x)=5. What is the silhouette value s(x)?',
    options: ['-0.6', '0.4', '0.6', '1.5'], answer: 2,
    explain: 's(x) = (b(x) - a(x)) / max(a(x), b(x)) = (5 - 2) / max(2, 5) = 3 / 5 = 0.6.' },
  { id: 'dm-fe-30', topic: 4, exam: 'final-mock', examOrder: 30,
    q: 'Before candidate generation in MS-Apriori, items are ordered by which quantity?',
    options: ['Ascending MIS value', 'Descending MIS value', 'Ascending support count', 'Descending confidence'], answer: 0,
    explain: 'En MS-Apriori los ítems se ordenan en orden ascendente según su valor de soporte mínimo MIS: MIS(i1) ≤ MIS(i2) ≤ ... ≤ MIS(ik), asegurando la corrección de la poda antimótona.' },
  { id: 'dm-fe-31', topic: 7, exam: 'final-mock', examOrder: 31,
    q: 'The Adwords problem is primarily a collaborative-filtering problem.',
    options: TF, answer: 1,
    explain: 'Falso. El problema de AdWords es un problema de asignación online con presupuestos limitados (online bipartite matching), no de filtrado colaborativo.' },
  { id: 'dm-fe-32', topic: 3, exam: 'final-mock', examOrder: 32,
    q: 'A content-based user profile may be formed as a weighted combination of features from items the user rated.',
    options: TF, answer: 0,
    explain: 'Verdadero. En recomendación basada en contenido, el perfil del usuario se construye típicamente como una combinación ponderada de los vectores de características de los ítems que ha valorado o consultado.' },
  { id: 'dm-fe-33', topic: 2, exam: 'final-mock', examOrder: 33,
    q: 'Tables Student(studentID, name) and Enrollment(studentID, courseID, grade) are given. Which SQL query returns names of students with at least one grade of 90 or higher?',
    options: [
      'SELECT DISTINCT name FROM Student JOIN Enrollment ON Student.studentID=Enrollment.studentID WHERE grade>=90',
      'SELECT name FROM Student WHERE grade>=90',
      'SELECT Enrollment FROM Student WHERE Student.studentID=courseID',
      'SELECT name FROM Student, Enrollment WHERE name=grade AND grade>=90'
    ], answer: 0,
    explain: 'Se realiza un JOIN entre Student y Enrollment por studentID, se filtra por grade >= 90 y se usa DISTINCT para no repetir nombres de alumnos con varias asignaturas con nota ≥ 90.' },
  { id: 'dm-fe-34', topic: 3, exam: 'final-mock', examOrder: 34,
    q: 'Given A={1,2,3}, B={2,3,4}, and C={1,4,5}, which pair has the highest Jaccard similarity?',
    options: ['A and B', 'A and C', 'B and C', 'All pairs are equal'], answer: 0,
    explain: 'sim(A,B) = |{2,3}| / |{1,2,3,4}| = 2/4 = 0.5. sim(A,C) = |{1}| / |{1,2,3,4,5}| = 1/5 = 0.2. sim(B,C) = |{4}| / |{1,2,3,4,5}| = 1/5 = 0.2. El par con mayor similitud es A y B (0.5).' },
  { id: 'dm-fe-35', topic: 3, exam: 'final-mock', examOrder: 35,
    q: 'For the characteristic matrix below, use permutations P1=(2,1,4,3) and P2=(4,3,2,1). What is the minhash signature of Document 2?\n\n        Doc 1   Doc 2   Doc 3\nRow 1:    1       0       1\nRow 2:    0       1       1\nRow 3:    1       1       0\nRow 4:    0       1       0',
    options: ['(2,4)', '(1,3)', '(2,3)', '(1,4)'], answer: 0,
    explain: 'Doc 2 tiene 1s en las filas 2, 3 y 4. Permutación P1=(2,1,4,3): la primera fila examinada es la 2, donde Doc 2 tiene un 1 → minhash = 2. Permutación P2=(4,3,2,1): la primera fila examinada es la 4, donde Doc 2 tiene un 1 → minhash = 4. Firma: (2,4).' },
  { id: 'dm-fe-36', topic: 3, exam: 'final-mock', examOrder: 36,
    q: 'Which is an advantage of collaborative filtering?',
    options: ['It can recommend items without manually engineered item features', 'It eliminates the new-user problem', 'It always handles extreme sparsity well', 'It guarantees niche items are recommended'], answer: 0,
    explain: 'El filtrado colaborativo se basa exclusivamente en las interacciones o valoraciones usuario-ítem, por lo que no necesita conocer ni extraer manualmente las características de los ítems.' },
  { id: 'dm-fe-37', topic: 4, exam: 'final-mock', examOrder: 37,
    q: 'What is the main advantage of MS-Apriori over standard Apriori?',
    options: ['It can discover patterns containing rare items by using item-specific minimum supports', 'It always uses only one database pass', 'It eliminates candidate generation', 'It guarantees higher-confidence rules'], answer: 0,
    explain: 'Permite definir umbrales de soporte mínimo distintos para cada ítem (MIS), resolviendo el "dilema del ítem raro" (rare item problem) sin provocar una explosión inmanejable de reglas irrelevantes.' },
  { id: 'dm-fe-38', topic: 5, exam: 'final-mock', examOrder: 38,
    q: 'Bagging trains multiple models on bootstrap samples and combines their predictions.',
    options: TF, answer: 0,
    explain: 'Verdadero. Bagging (Bootstrap Aggregating) crea múltiples subconjuntos de datos mediante muestreo aleatorio con reemplazo (bootstrap), entrena un clasificador en cada uno y agrega sus predicciones.' },
  { id: 'dm-fe-39', topic: 7, exam: 'final-mock', examOrder: 39,
    q: 'When several eligible advertisers remain, BALANCE favors the advertiser with which property?',
    options: ['Largest unspent budget', 'Smallest original budget', 'Most queries already assigned', 'Lowest click-through rate'], answer: 0,
    explain: 'El criterio fundamental de BALANCE es asignar la consulta al anunciante elegible que tenga el mayor presupuesto restante sin gastar.' },
  { id: 'dm-fe-40', topic: 2, exam: 'final-mock', examOrder: 40,
    q: 'Which is generally NOT an advantage of MapReduce relative to OLAP systems?',
    options: ['Very fast interactive access to simple aggregate statistics', 'Scalability across commodity machines', 'Support for a broad class of batch computations', 'Framework-level handling of machine failures'], answer: 0,
    explain: 'El acceso interactivo de baja latencia a agregados simples es la ventaja de los sistemas OLAP (cubos precalculados). MapReduce es un sistema de procesamiento por lotes masivo y con alta latencia de arranque.' },
];


const DM_EXAMS = [
  {
    id: 'final-mock',
    name: 'Final Mock Exam',
    title: 'DATA 51000 Practice Final Exam',
    description: 'Examen oficial de práctica de 40 preguntas · 1 punto cada una',
    count: 40,
  },
];

SUBJECTS.push({ id: 'dm', name: 'Data Mining', topics: DM_TOPICS, exams: DM_EXAMS, questions: DM_QUESTIONS });
