# DATA 51000 — Data Mining: Practice Final Exam Review

Official solutions and study notes for the 40 questions of the **DATA 51000 Practice Final Exam** (1 point each, total 40 points).

---

### Question 1 (1 point)
**Three advertisers bid on search terms. A bids on "car" and "insurance"; B bids on "car"; C bids on "insurance". If the BALANCE algorithm is used, which advertiser will be preferred when budgets are equal and a "car" query arrives?**
- **Options:**
  - A) Only B
  - B) Only A
  - C) Either A or B
  - D) C
- **Answer:** C) Either A or B
- **Explanation:** When budgets are equal, the BALANCE algorithm breaks ties arbitrarily (or round-robin) among eligible bidders with the maximum remaining budget. Since both A and B bid on "car", either can be allocated.

---

### Question 2 (1 point)
**In the context of the BALANCE algorithm, what is the competitive ratio for the worst-case scenario with two advertisers having equal budgets?**
- **Options:**
  - A) 1/2
  - B) 3/4
  - C) 1 - 1/e (~0.63)
  - D) 1
- **Answer:** B) 3/4
- **Explanation:** For two advertisers with equal budgets, the worst-case competitive ratio of the BALANCE algorithm is 3/4 (0.75). For large $N$ advertisers, the ratio approaches $1 - 1/e \approx 0.632$.

---

### Question 3 (1 point)
**Why is advertising on the web often more effective than traditional media advertising?**
- **Options:**
  - A) Web ads are always cheaper
  - B) Ads can be targeted to user interests shown by search queries or browsing
  - C) Web ads reach everyone regardless of internet access
  - D) Web ads cannot be blocked
- **Answer:** B) Ads can be targeted to user interests shown by search queries or browsing
- **Explanation:** Web search engines and platforms can deliver contextually and behaviorally targeted ads based on real-time intent revealed by queries and browsing history.

---

### Question 4 (1 point)
**In the AdWords problem, why cannot an optimal offline matching algorithm be used directly in practice?**
- **Options:**
  - A) The offline algorithm is too simple
  - B) Search queries arrive as an online stream and must be answered immediately without knowing future queries
  - C) Advertisers do not set budgets
  - D) Offline algorithms require quantum computers
- **Answer:** B) Search queries arrive as an online stream and must be answered immediately without knowing future queries
- **Explanation:** Search queries arrive dynamically in real time and must be served in milliseconds without knowledge of future arrivals, making this an online bipartite matching problem.

---

### Question 5 (1 point)
**What happens to an advertiser in the AdWords model when their daily budget is exhausted?**
- **Options:**
  - A) They are charged double
  - B) They are dropped from consideration for subsequent queries that day
  - C) Their bids are increased automatically
  - D) They receive free ad placements
- **Answer:** B) They are dropped from consideration for subsequent queries that day
- **Explanation:** Once an advertiser's budget is fully spent, they can no longer participate in auctions for subsequent queries in that billing cycle.

---

### Question 6 (1 point)
**Select all that apply. In a collaborative filtering recommender system, which of the following are true?**
- **Options:**
  - A) User-user collaborative filtering finds users with similar rating patterns
  - B) Item-item collaborative filtering often yields better quality recommendations than user-user CF when items are rated by many users
  - C) Collaborative filtering requires detailed text descriptions of every item
  - D) CF cannot make recommendations if two users have no items in common
- **Answer:** A and B
- **Explanation:** CF uses interaction patterns without requiring item text descriptions. User-user CF finds similar users, and item-item CF typically offers higher stability and quality because item average tastes change slower than user behaviors.

---

### Question 7 (1 point)
**Given the utility matrix where rows are users (U1, U2, U3) and columns are items (I1, I2, I3):**
```
     I1   I2   I3
U1    4    ?    2
U2    5    3    ?
U3    ?    4    1
```
**After mean-centering each user's ratings (subtracting user average over known ratings), what is U1's normalized rating on I1?**
- **Options:**
  - A) 1
  - B) 4
  - C) 0
  - D) 3
- **Answer:** A) 1
- **Explanation:** U1's known ratings are $I_1 = 4$ and $I_3 = 2$. User average $\mu = (4 + 2)/2 = 3$. The normalized centered rating for $I_1$ is $4 - 3 = 1$.

---

### Question 8 (1 point)
**After mean-centering user ratings, user U has ratings [1, -1] on two co-rated items and user V has ratings [-2, 2]. What is their cosine similarity?**
- **Options:**
  - A) 1
  - B) 0
  - C) 0.5
  - D) -1
- **Answer:** D) -1
- **Explanation:** Dot product $= (1)(-2) + (-1)(2) = -2 - 2 = -4$. Magnitude $\|U\| = \sqrt{1^2 + (-1)^2} = \sqrt{2}$, $\|V\| = \sqrt{(-2)^2 + 2^2} = \sqrt{8}$. Cosine similarity $= -4 / (\sqrt{2}\cdot\sqrt{8}) = -4 / \sqrt{16} = -4/4 = -1$.

---

### Question 9 (1 point)
**What is the "cold-start problem" in recommender systems?**
- **Options:**
  - A) The server takes too long to boot
  - B) New users or new items have few or no ratings, making accurate recommendations difficult
  - C) Recommendations can only be computed in batch overnight
  - D) Similarity scores are zero due to floating point underflow
- **Answer:** B) New users or new items have few or no ratings, making accurate recommendations difficult
- **Explanation:** The cold-start problem occurs when an item or user is newly added to the platform, lacking sufficient interaction history to compute reliable correlations or similarities.

---

### Question 10 (1 point)
**In content-based recommendation, an item profile is typically created using:**
- **Options:**
  - A) Features or attributes of the item (e.g., genre, director, TF-IDF of text description)
  - B) The item's sales rank only
  - C) The server IP address hosting the item
  - D) Random vectors
- **Answer:** A) Features or attributes of the item (e.g., genre, director, TF-IDF of text description)
- **Explanation:** Content-based systems characterize items using descriptive metadata and feature representations, such as keywords, genres, tags, or TF-IDF text features.

---

### Question 11 (1 point)
**Given a database of 100 transactions, itemset {A, B} appears in 20 transactions. What is the support of {A, B}?**
- **Options:**
  - A) 0.05
  - B) 20
  - C) 0.20
  - D) 5
- **Answer:** C) 0.20
- **Explanation:** Support is the proportion of total transactions containing the itemset: $\text{Support}(\{A, B\}) = 20 / 100 = 0.20$ (or 20%).

---

### Question 12 (1 point)
**If support of {A, B} is 0.20 and support of {A} is 0.50, what is the confidence of the association rule A -> B?**
- **Options:**
  - A) 0.10
  - B) 0.40
  - C) 0.70
  - D) 2.50
- **Answer:** B) 0.40
- **Explanation:** $\text{Confidence}(A \to B) = \text{Support}(A \cup B) / \text{Support}(A) = 0.20 / 0.50 = 0.40$ (40%).

---

### Question 13 (1 point)
**If support({A, B}) = 0.20, support({A}) = 0.50, and support({B}) = 0.40, what is the interest (or lift minus 1) of the rule A -> B?**
- **Options:**
  - A) 0
  - B) 0.20
  - C) 0.50
  - D) -0.20
- **Answer:** A) 0
- **Explanation:** $\text{Interest} = \text{Confidence}(A \to B) - \text{Support}(B) = 0.40 - 0.40 = 0$. Since interest is 0 (and $\text{Lift} = 0.20 / (0.50 \times 0.40) = 1.0$), A and B appear together completely independently.

---

### Question 14 (1 point)
**The Apriori principle states that:**
- **Options:**
  - A) If an itemset is frequent, all its supersets must be frequent
  - B) If an itemset is frequent, all of its non-empty subsets must also be frequent
  - C) Association rules always have confidence 1.0
  - D) Frequent itemsets can only contain pairs of items
- **Answer:** B) If an itemset is frequent, all of its non-empty subsets must also be frequent
- **Explanation:** The Apriori principle relies on the downward-closure (monotonicity) of support: any subset of a frequent itemset must also be frequent. If a subset is infrequent, its supersets cannot be frequent.

---

### Question 15 (1 point)
**In the PCY algorithm, what is hashed into the hash table in the first pass?**
- **Options:**
  - A) Individual items
  - B) Triples of items
  - C) All pairs of items present in each basket
  - D) The entire basket as a single string
- **Answer:** C) All pairs of items present in each basket
- **Explanation:** The Park-Chen-Yu (PCY) algorithm hashes all 2-item pairs in each basket into buckets during Pass 1, converting frequent buckets into a bit-vector to prune candidate pairs in Pass 2.

---

### Question 16 (1 point)
**In the HITS algorithm, the authority score of a page is proportional to the sum of the:**
- **Options:**
  - A) Authority scores of pages it links to
  - B) Hub scores of pages that link to it
  - C) PageRank scores of all web pages
  - D) Number of outgoing links
- **Answer:** B) Hub scores of pages that link to it
- **Explanation:** In Kleinberg's HITS algorithm:
  - An **authority** is pointed to by good hubs: $a(p) = \sum_{q \to p} h(q)$
  - A **hub** points to good authorities: $h(q) = \sum_{q \to p} a(p)$

---

### Question 17 (1 point)
**Consider a 2-node graph: Node 1 has a directed edge to Node 2, and Node 2 has a directed edge to Node 1. With teleportation probability (1 - beta) = 0.2 (so beta = 0.8), what is the PageRank of Node 1?**
- **Options:**
  - A) 0.8
  - B) 0.5
  - C) 0.2
  - D) 1.0
- **Answer:** B) 0.5
- **Explanation:** The graph is completely symmetric ($1 \leftrightarrow 2$). Due to symmetry and conservation of total probability $\sum r_i = 1$, each node has PageRank $1/2 = 0.5$.

---

### Question 18 (1 point)
**What problem in PageRank does the random teleport (damping factor beta) solve?**
- **Options:**
  - A) Slow network connections
  - B) Spider traps and dead ends (rank sinks and leaks)
  - C) Hash collisions
  - D) Floating point overflow
- **Answer:** B) Spider traps and dead ends (rank sinks and leaks)
- **Explanation:** Spider traps absorb rank without releasing it, and dead ends leak rank out of the web. The random walk teleportation jump with probability $1 - \beta$ guarantees the Markov chain is ergodic and converges to a unique stationary distribution.

---

### Question 19 (1 point)
**Topic-Sensitive PageRank modifies the teleport vector so that:**
- **Options:**
  - A) Teleports are uniform across all web pages
  - B) Teleports only go to a preselected subset of pages relevant to a specific topic
  - C) The damping factor is set to 0
  - D) Only dead ends can teleport
- **Answer:** B) Teleports only go to a preselected subset of pages relevant to a specific topic
- **Explanation:** Topic-Sensitive (Personalized) PageRank biases the teleport vector $v$ toward a specific set of topic-related pages $S$, making search results customized to the given context.

---

### Question 20 (1 point)
**In graph structure analysis, what is a "dead end"?**
- **Options:**
  - A) A node with no incoming edges
  - B) A node with no outgoing edges
  - C) A cycle of length 2
  - D) A disconnected component
- **Answer:** B) A node with no outgoing edges
- **Explanation:** A dead end is a webpage that contains no out-links, which would cause the random surfer's probability mass to drain out of the system if not handled.

---

### Question 21 (1 point)
**Given two points P1 = (1, 2) and P2 = (4, 6), what is the Euclidean distance between them?**
- **Options:**
  - A) 7
  - B) 5
  - C) 25
  - D) 3
- **Answer:** B) 5
- **Explanation:** $d(P_1, P_2) = \sqrt{(4 - 1)^2 + (6 - 2)^2} = \sqrt{3^2 + 4^2} = \sqrt{9 + 16} = \sqrt{25} = 5$.

---

### Question 22 (1 point)
**For the same points P1 = (1, 2) and P2 = (4, 6), what is the Manhattan (L1) distance?**
- **Options:**
  - A) 5
  - B) 7
  - C) 1
  - D) 12
- **Answer:** B) 7
- **Explanation:** $d_{L1}(P_1, P_2) = |4 - 1| + |6 - 2| = 3 + 4 = 7$.

---

### Question 23 (1 point)
**The Jaccard similarity between two sets S1 = {a, b, c} and S2 = {b, c, d, e} is:**
- **Options:**
  - A) 2/5 = 0.4
  - B) 2/3 = 0.67
  - C) 3/4 = 0.75
  - D) 2/7 = 0.29
- **Answer:** A) 2/5 = 0.4
- **Explanation:** Intersection $S_1 \cap S_2 = \{b, c\}$ (size 2). Union $S_1 \cup S_2 = \{a, b, c, d, e\}$ (size 5). Jaccard similarity $= 2 / 5 = 0.4$.

---

### Question 24 (1 point)
**The Jaccard distance between the sets S1 and S2 from the previous question is:**
- **Options:**
  - A) 0.4
  - B) 0.6
  - C) 0.2
  - D) 1.0
- **Answer:** B) 0.6
- **Explanation:** Jaccard distance is the complement of Jaccard similarity: $d_J(S_1, S_2) = 1 - J(S_1, S_2) = 1 - 0.4 = 0.6$.

---

### Question 25 (1 point)
**Cosine distance between two vectors u and v is defined as:**
- **Options:**
  - A) The dot product of u and v
  - B) 1 minus the cosine of the angle between u and v
  - C) The Euclidean distance between normalized vectors
  - D) The angle in radians divided by pi
- **Answer:** B) 1 minus the cosine of the angle between u and v
- **Explanation:** Cosine distance is defined as $1 - \cos(\theta)$, where $\cos(\theta) = \frac{u \cdot v}{\|u\| \|v\|}$.

---

### Question 26 (1 point)
**In Minhash, the probability that minhash(C1) == minhash(C2) equals:**
- **Options:**
  - A) The Euclidean distance between C1 and C2
  - B) The Jaccard similarity of C1 and C2
  - C) 1 minus the Jaccard similarity
  - D) The cosine similarity of C1 and C2
- **Answer:** B) The Jaccard similarity of C1 and C2
- **Explanation:** Under random permutations of rows, the first row where at least one of the two sets has a 1 has both sets having a 1 with probability equal to $|C_1 \cap C_2| / |C_1 \cup C_2| = \text{Sim}(C_1, C_2)$.

---

### Question 27 (1 point)
**In Locality-Sensitive Hashing with b bands of r rows each (where signature length n = b * r), two documents with Jaccard similarity s become candidate pairs with probability:**
- **Options:**
  - A) 1 - (1 - s^r)^b
  - B) (1 - s^b)^r
  - C) s^(b*r)
  - D) 1 - s^r
- **Answer:** A) 1 - (1 - s^r)^b
- **Explanation:**
  - Probability all $r$ rows match in one band $= s^r$.
  - Probability they don't match in that band $= 1 - s^r$.
  - Probability they don't match in any of the $b$ bands $= (1 - s^r)^b$.
  - Probability of matching in at least one band $= 1 - (1 - s^r)^b$.

---

### Question 28 (1 point)
**Using LSH with b = 20 bands and r = 5 rows, what is the approximate threshold t where the S-curve has its steepest inflection point?**
- **Options:**
  - A) ~0.55 (computed as (1/b)^(1/r))
  - B) ~0.80
  - C) ~0.20
  - D) ~0.95
- **Answer:** A) ~0.55 (computed as (1/b)^(1/r))
- **Explanation:** The threshold where the probability equals 0.5 is approximately $t \approx (1/b)^{1/r} = (1/20)^{1/5} \approx 0.549$.

---

### Question 29 (1 point)
**In the k-means clustering algorithm, how are cluster centers updated in each iteration?**
- **Options:**
  - A) By randomly choosing a data point
  - B) By computing the mean (centroid) of all points currently assigned to each cluster
  - C) By taking the median along each dimension
  - D) Cluster centers are fixed and never updated
- **Answer:** B) By computing the mean (centroid) of all points currently assigned to each cluster
- **Explanation:** In standard Lloyd's $k$-means algorithm, each cluster center is updated by taking the mean of all data points currently assigned to that cluster.

---

### Question 30 (1 point)
**Which of the following is a key advantage of the BFR clustering algorithm over standard k-means?**
- **Options:**
  - A) BFR finds non-spherical clusters
  - B) BFR can cluster data that is too large to fit in main memory by making a single pass through the data
  - C) BFR does not require specifying k
  - D) BFR uses Manhattan distance exclusively
- **Answer:** B) BFR can cluster data that is too large to fit in main memory by making a single pass through the data
- **Explanation:** BFR summarizes chunks of streaming or disk-based data using compact summary statistics (Discard Set, Compressed Set, Retained Set), processing vast datasets in a single pass without loading all points into RAM.

---

### Question 31 (1 point)
**In the BFR algorithm, the Discard Set (DS) stores:**
- **Options:**
  - A) The original data points
  - B) Summary statistics (number of points N, sum vector SUM, and sum of squares vector SUMSQ) for points close enough to a centroid
  - C) Outliers that should be permanently deleted
  - D) The distance matrix between all pairs of points
- **Answer:** B) Summary statistics (number of points N, sum vector SUM, and sum of squares vector SUMSQ) for points close enough to a centroid
- **Explanation:** The Discard Set stores $2d + 1$ numbers per cluster ($N$, $\text{SUM}_i$, $\text{SUMSQ}_i$), enabling exact mean and variance calculations without storing raw coordinates.

---

### Question 32 (1 point)
**Hierarchical agglomerative clustering starts with:**
- **Options:**
  - A) A single cluster containing all points
  - B) Each data point as its own individual cluster, then iteratively merges the closest pair
  - C) k randomly chosen clusters
  - D) A decision tree
- **Answer:** B) Each data point as its own individual cluster, then iteratively merges the closest pair
- **Explanation:** Agglomerative clustering is a bottom-up approach: every observation begins in its own cluster, and clusters are successively merged based on a linkage criterion until a single tree (dendrogram) remains.

---

### Question 33 (1 point)
**Which linkage criterion in hierarchical clustering measures distance between two clusters as the distance between their closest pair of points?**
- **Options:**
  - A) Complete linkage
  - B) Single linkage
  - C) Average linkage
  - D) Centroid linkage
- **Answer:** B) Single linkage
- **Explanation:** Single linkage calculates minimum pairwise distance: $d(C_1, C_2) = \min_{x \in C_1, y \in C_2} d(x, y)$, which can lead to chaining effects.

---

### Question 34 (1 point)
**What does the following MapReduce computation produce?**
```
Mapper:
  for each number x:
    emit("key", x)

Reducer:
  m = -infinity
  for each value v:
    if v > m: m = v
  emit("max", m)
```
- **Options:**
  - A) The maximum input value
  - B) The sum of the input values
  - C) The number of input values
  - D) The sum of squared values
- **Answer:** A) The maximum input value
- **Explanation:** All inputs are emitted under the single key `"key"`. The reducer iterates through all values, keeping track of the largest number seen, thus emitting the global maximum.

---

### Question 35 (1 point)
**In MapReduce, what is the role of the Combiner?**
- **Options:**
  - A) It replaces the Reducer entirely
  - B) It performs a local reduction on the map node's output to reduce the volume of data transferred over the network during shuffle
  - C) It reads input from HDFS
  - D) It assigns tasks to worker nodes
- **Answer:** B) It performs a local reduction on the map node's output to reduce the volume of data transferred over the network during shuffle
- **Explanation:** A Combiner acts as a mini-reducer directly on each Mapper worker node, aggregating intermediate key-value pairs locally to drastically reduce network transmission during the shuffle phase.

---

### Question 36 (1 point)
**Given relations R(A, B) and S(B, C), how is a natural join R JOIN S implemented in MapReduce using a single map-reduce job?**
- **Options:**
  - A) Map key is A; reducer joins
  - B) Map key is B; each mapper emits (B, ('R', A)) or (B, ('S', C)); reducer computes Cartesian product for each B
  - C) Map key is C; reducer joins
  - D) Cannot be done in MapReduce
- **Answer:** B) Map key is B; each mapper emits (B, ('R', A)) or (B, ('S', C)); reducer computes Cartesian product for each B
- **Explanation:** In standard Reduce-Side Join, tuples from both tables are keyed on the common join attribute $B$ and tagged with their table name. The reducer receives all tuples sharing key $B$ and pairs them up.

---

### Question 37 (1 point)
**In HDFS, by default how many copies of each data block are stored across different machines?**
- **Options:**
  - A) 1
  - B) 2
  - C) 3
  - D) 5
- **Answer:** C) 3
- **Explanation:** Default HDFS replication factor is 3 (typically: one local replica, one on a different node in the same rack, and one on a node in an entirely different rack for fault tolerance).

---

### Question 38 (1 point)
**Given relation R(A, B), the SQL query `SELECT A, COUNT(B) FROM R GROUP BY A` is implemented in MapReduce by:**
- **Options:**
  - A) Mapper emits (A, 1); Reducer sums the 1s for each A
  - B) Mapper emits (B, 1); Reducer sums for each B
  - C) Mapper emits (1, A); Reducer counts
  - D) Mapper does all the counting and Reducer is not needed
- **Answer:** A) Mapper emits (A, 1); Reducer sums the 1s for each A
- **Explanation:** The grouping attribute $A$ is the key emitted by the mapper with value 1 (`(A, 1)`). The reducer receives all 1s for each key $A$ and computes $\sum 1$.

---

### Question 39 (1 point)
**In TF-IDF, if term t appears in all N documents in a collection, what is its IDF value? (Using IDF = log(N / DF))**
- **Options:**
  - A) 1
  - B) 0
  - C) N
  - D) infinity
- **Answer:** B) 0
- **Explanation:** When document frequency $\text{DF} = N$, $\text{IDF} = \log(N / N) = \log(1) = 0$. Words that appear in every document (like common stop words) carry zero discriminatory power.

---

### Question 40 (1 point)
**Which of the following is generally NOT an advantage of MapReduce / Hadoop?**
- **Options:**
  - A) Automatic fault tolerance via task re-execution and data replication
  - B) Linear horizontal scalability by adding commodity machines
  - C) Ultra-low latency query processing for interactive, real-time applications
  - D) Moving computation to where data is stored (data locality)
- **Answer:** C) Ultra-low latency query processing for interactive, real-time applications
- **Explanation:** Classical MapReduce is a batch processing system with high startup overhead, disk checkpoints, and shuffle phases. It is designed for high-throughput batch workloads, not sub-second interactive or real-time queries.
