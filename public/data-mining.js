// Banco de preguntas de Data Mining.
// Fuente: capturas de "Data Mining Questions/Chapter N", data_mining_quizzs.docx y las revisiones de los Quiz 1–6 en Blackboard (sin duplicados;
// en dm4-10 las opciones incorrectas son inventadas porque en Blackboard era de rellenar el hueco).

const DM_TOPICS = [
  { id: 1, name: 'Tema 1 · Introducción a la minería de datos' },
  { id: 2, name: 'Tema 2 · Bases de datos, MapReduce y TF.IDF' },
  { id: 3, name: 'Tema 3 · Similitud, LSH y clustering' },
  { id: 4, name: 'Tema 4 · Itemsets frecuentes y reglas de asociación' },
  { id: 5, name: 'Tema 5 · Clasificación y evaluación' },
  { id: 6, name: 'Tema 6 · Grafos y análisis de enlaces' },
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
];

SUBJECTS.push({ id: 'dm', name: 'Data Mining', topics: DM_TOPICS, questions: DM_QUESTIONS });
