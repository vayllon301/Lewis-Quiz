# DATA 51000 — Data Mining and Analytics: Practice Final Exam Solutions

Official solutions, verified answer key, and comprehensive study guide for the **DATA 51000 Practice Final Exam** (40 questions | 1 point each).

## Quick Answer Key Table

| Q# | Correct Answer | Topic / Concept |
|:---:|:---:|:---|
| **Q1** | **A** | AdWords & BALANCE Algorithm |
| **Q2** | **A** | Collaborative Filtering & Popularity Bias |
| **Q3** | **B** | Information Retrieval (TF-IDF) |
| **Q4** | **B** | Graph Mining (Maximal vs. Maximum Cliques) |
| **Q5** | **A** | Recommender Systems (Mean-Centered Cosine Similarity) |
| **Q6** | **A, B** | Network Analysis (Small-World Networks) |
| **Q7** | **C** | Decision Trees (Entropy & Information Gain) |
| **Q8** | **A** | Clustering (1D k-Means Convergence) |
| **Q9** | **B** | Association Rules (Support Count) |
| **Q10** | **A** | Data Fundamentals (Data Instance Definition) |
| **Q11** | **A** | Clustering Algorithm Selection (k-Means) |
| **Q12** | **B** | Data Structures (Semi-Structured JSON) |
| **Q13** | **A** | Recommender Systems (Content-Based Limitations) |
| **Q14** | **A** | Data Warehousing (OLAP vs. OLTP) |
| **Q15** | **A** | Frequent Itemsets (Triples vs. Triangular Matrix Memory) |
| **Q16** | **A** | Link Analysis (HITS Hubs & Authorities) |
| **Q17** | **C** | Model Evaluation (Classification Recall) |
| **Q18** | **A** | Hierarchical Clustering (Agglomerative Dendrogram) |
| **Q19** | **A** | Frequent Itemset Mining (PCY Memory Efficiency) |
| **Q20** | **A** | Ensemble Learning (AdaBoost Reweighting) |
| **Q21** | **A** | Similarity Measures (Jaccard Similarity for Sets) |
| **Q22** | **A** | Hierarchical Clustering (Centroid Linkage) |
| **Q23** | **B** | Model Generalization & Overfitting |
| **Q24** | **A** | Online Algorithms (Greedy Bipartite Matching Ratios) |
| **Q25** | **A** | Distributed Computing (Hadoop HDFS Failure Detection) |
| **Q26** | **A** | MapReduce Patterns (Global Maximum Computation) |
| **Q27** | **B** | Attribute Types (Ordinal Data) |
| **Q28** | **A** | Online Advertising (CTR Exploration vs. Exploitation) |
| **Q29** | **C** | Cluster Evaluation (Silhouette Coefficient) |
| **Q30** | **A** | Association Rules (MS-Apriori MIS Ordering) |
| **Q31** | **B** | Online Advertising (AdWords Nature) |
| **Q32** | **A** | Recommender Systems (Content-Based User Profiles) |
| **Q33** | **A** | Databases & SQL (JOIN and DISTINCT) |
| **Q34** | **A** | Similarity Measures (Jaccard Set Comparison) |
| **Q35** | **A** | LSH & Minhashing (Minhash Signatures) |
| **Q36** | **A** | Collaborative Filtering (Domain Independence / Advantages) |
| **Q37** | **A** | Association Rules (MS-Apriori Rare Item Problem) |
| **Q38** | **A** | Ensemble Learning (Bagging / Bootstrap Aggregation) |
| **Q39** | **A** | Online Advertising (BALANCE Selection Criterion) |
| **Q40** | **A** | Distributed Computing (MapReduce vs. OLAP Latency) |

---

### Question 1 (1 point)

**Three advertisers bid on search terms. A bids on p, B bids on p and q, and C bids on p, q, and r. Each has a budget of $2. For the stream p, p, q, q, r, r, which sequence is possible under BALANCE if ties are resolved in the order C, B, A?**

- **Options:**
  - **A)** C, B, C, B, _, _
  - **B)** C, C, B, B, _, _
  - **C)** A, A, B, B, C, C
  - **D)** C, B, A, C, B, A
- **Correct Answer:** A. C, B, C, B, _, _
- **Explanation:** p→C (all tied at $2, C wins tie); p→B (A and B still at $2); q→C (B and C tied at $1); q→B (C is out of budget); r, r→unassigned (only C bids on r and C is spent).

---

### Question 2 (1 point)

**Popularity bias in collaborative filtering can cause frequently rated items to be recommended more often than niche items.**

- **Options:**
  - **A)** True
  - **B)** False
- **Correct Answer:** A. True
- **Explanation:** Popular items have more ratings, so they dominate neighbourhoods and predictions.

---

### Question 3 (1 point)

**A corpus contains 8 documents. The term "cloud" occurs once in document D1 and appears in 2 documents total. Using TF = raw count and IDF = log2(N/df), what is the TF-IDF weight of "cloud" in D1?**

- **Options:**
  - **A)** 1
  - **B)** 2
  - **C)** 3
  - **D)** 4
- **Correct Answer:** B. 2
- **Explanation:** TF = 1, IDF = log2(8/2) = log2(4) = 2, so TF-IDF = 1 × 2 = 2.

---

### Question 4 (1 point)

**A clique is a set of vertices in which every pair of vertices is connected. Every maximal clique is necessarily a maximum clique.**

- **Options:**
  - **A)** True
  - **B)** False
- **Correct Answer:** B. False
- **Explanation:** A maximal clique cannot be extended, but it need not be the largest clique in the graph.

---

### Question 5 (1 point)

**After mean-centering user ratings, user U has ratings [1, -1] on two co-rated items and user V has ratings [-2, 2]. What is their cosine similarity?**

- **Options:**
  - **A)** -1
  - **B)** 0
  - **C)** 0.5
  - **D)** 1
- **Correct Answer:** A. -1
- **Explanation:** Dot product = (1)(-2) + (-1)(2) = -4; norms = √2 · √8 = 4; cosine = -4/4 = -1 (V is exactly opposite to U).

---

### Question 6 (1 point)

**Which properties are characteristic of a small-world network? (Select all that apply.)**

- **Options:**
  - **A)** Short average path length
  - **B)** High clustering coefficient
  - **C)** Every vertex has the same degree
  - **D)** No triangles
- **Correct Answer:** A. Short average path length and B. High clustering coefficient
- **Explanation:** Small-world networks combine short paths with high clustering (lots of triangles). Equal degree is a regular-lattice property, not a small-world one.

---

### Question 7 (1 point)

**Using the data below (A: yes, yes, yes, no, no, no; Label: 0, 1, 1, 0, 0, 0), what is the information gain of attribute A for predicting the label?**

- **Options:**
  - **A)** 0
  - **B)** 0.082
  - **C)** 0.459
  - **D)** 1
- **Correct Answer:** C. 0.459
- **Explanation:** H(Label) with 2 ones / 4 zeros = 0.918. A = yes: (1 zero, 2 ones) → H = 0.918, weight 3/6. A = no: all zeros → H = 0. Expected entropy = 0.459. Gain = 0.918 − 0.459 = 0.459.

---

### Question 8 (1 point)

**Run one-dimensional k-means with k=2 on points {2, 3, 7, 8, 9}, starting with centroids 2 and 7. What are the final clusters?**

- **Options:**
  - **A)** {2,3} and {7,8,9}
  - **B)** {2,3,7} and {8,9}
  - **C)** {2} and {3,7,8,9}
  - **D)** {2,7} and {3,8,9}
- **Correct Answer:** A. {2,3} and {7,8,9}
- **Explanation:** First assignment gives {2,3} and {7,8,9}; new centroids 2.5 and 8 produce the same assignment, so it has converged.

---

### Question 9 (1 point)

**Transactions are {A,B}, {A,C}, {A,B,C}, {B,C}, {A,B,C,D}. What is the support count of {A,C}?**

- **Options:**
  - **A)** 2
  - **B)** 3
  - **C)** 4
  - **D)** 5
- **Correct Answer:** B. 3
- **Explanation:** {A,C} appears in {A,C}, {A,B,C} and {A,B,C,D} → 3.

---

### Question 10 (1 point)

**Which statement best defines a data instance?**

- **Options:**
  - **A)** A collection of attribute values describing one object
  - **B)** A description of all attribute domains
  - **C)** A group of database tables
  - **D)** A rule for normalizing data
- **Correct Answer:** A. A collection of attribute values describing one object
- **Explanation:** An instance (record, object, tuple) is one row of attribute values.

---

### Question 11 (1 point)

**The number of clusters is known in advance, the data are numeric, and runtime is important. Which method is generally the most appropriate?**

- **Options:**
  - **A)** k-means
  - **B)** Agglomerative hierarchical clustering
  - **C)** Divisive hierarchical clustering
  - **D)** Apriori
- **Correct Answer:** A. k-means
- **Explanation:** k-means needs k up front, works on numeric data, and is roughly linear per iteration. Apriori is not a clustering method.

---

### Question 12 (1 point)

**A JSON document always represents completely unstructured data.**

- **Options:**
  - **A)** True
  - **B)** False
- **Correct Answer:** B. False
- **Explanation:** JSON is semi-structured: it has keys and nesting but no fixed schema.

---

### Question 13 (1 point)

**Which is a common limitation of content-based recommendation?**

- **Options:**
  - **A)** Overspecialization
  - **B)** It requires ratings from every user
  - **C)** It cannot explain recommendations
  - **D)** It cannot use item features
- **Correct Answer:** A. Overspecialization
- **Explanation:** It keeps recommending items very similar to what the user already liked.

---

### Question 14 (1 point)

**Which workload is a data warehouse primarily designed to support?**

- **Options:**
  - **A)** Historical analysis and decision support
  - **B)** High-volume transaction updates
  - **C)** Operating-system backups
  - **D)** Real-time device control
- **Correct Answer:** A. Historical analysis and decision support
- **Explanation:** Warehouses serve OLAP / analytical queries; OLTP systems handle transaction updates.

---

### Question 15 (1 point)

**When the universe of possible pairs is very large but only a small fraction appears, storing observed pairs as triples can use less memory than a triangular matrix.**

- **Options:**
  - **A)** True
  - **B)** False
- **Correct Answer:** A. True
- **Explanation:** Triples cost ~12 bytes per observed pair vs. 4 bytes for every possible pair; the triples method wins when fewer than about 1/3 of possible pairs occur.

---

### Question 16 (1 point)

**In HITS, authority and hub scores are distinct quantities.**

- **Options:**
  - **A)** True
  - **B)** False
- **Correct Answer:** A. True
- **Explanation:** Each page has two separate scores: hubs point to good authorities, authorities are pointed to by good hubs.

---

### Question 17 (1 point)

**Using the test results (True: 1,1,0,1,0,1,0; Predicted: 1,0,0,1,1,1,0), what is recall for the positive class?**

- **Options:**
  - **A)** 50%
  - **B)** 60%
  - **C)** 75%
  - **D)** 80%
- **Correct Answer:** C. 75%
- **Explanation:** Actual positives are rows 1, 2, 4, 6. Predicted 1 for three of them (TP = 3, FN = 1). Recall = 3/4 = 75%.

---

### Question 18 (1 point)

**You want to explore an unknown number of document groups and inspect the cluster structure at several levels. Which method is most suitable?**

- **Options:**
  - **A)** Hierarchical agglomerative clustering
  - **B)** PCY
  - **C)** Minhashing
  - **D)** Logistic regression
- **Correct Answer:** A. Hierarchical agglomerative clustering
- **Explanation:** The dendrogram shows clusters at every level without fixing k in advance.

---

### Question 19 (1 point)

**If enough memory is available to count every candidate pair directly, PCY may provide little benefit over standard Apriori.**

- **Options:**
  - **A)** True
  - **B)** False
- **Correct Answer:** A. True
- **Explanation:** PCY's hash buckets exist to save main memory in pass 2; if memory is plentiful, that saving matters little.

---

### Question 20 (1 point)

**Which ensemble method repeatedly reweights training examples to focus on previously misclassified cases?**

- **Options:**
  - **A)** AdaBoost
  - **B)** Bagging
  - **C)** k-nearest neighbors
  - **D)** Naive Bayes
- **Correct Answer:** A. AdaBoost
- **Explanation:** Boosting (AdaBoost) increases the weights of misclassified examples each round. k-NN is not an ensemble method.

---

### Question 21 (1 point)

**For users represented by sets of purchased items, Jaccard similarity can be used to compare the overlap between their purchase sets.**

- **Options:**
  - **A)** True
  - **B)** False
- **Correct Answer:** A. True
- **Explanation:** Jaccard = |A ∩ B| / |A ∪ B| is exactly a set-overlap measure.

---

### Question 22 (1 point)

**Using centroid linkage, begin with singleton points {1, 4, 5, 12}. Repeatedly merge the two clusters with closest centroids. If stopped at two clusters, what are they?**

- **Options:**
  - **A)** {1,4,5} and {12}
  - **B)** {1,4} and {5,12}
  - **C)** {1} and {4,5,12}
  - **D)** {1,5} and {4,12}
- **Correct Answer:** A. {1,4,5} and {12}
- **Explanation:** Merge 4 and 5 (distance 1) → centroid 4.5. Then 1 is 3.5 from 4.5 while 12 is 7.5 away, so merge {1,4,5}. Remaining: {1,4,5} and {12}.

---

### Question 23 (1 point)

**A hypothesis that perfectly fits the training set is guaranteed to generalize best to unseen data.**

- **Options:**
  - **A)** True
  - **B)** False
- **Correct Answer:** B. False
- **Explanation:** Perfect training fit often means overfitting.

---

### Question 24 (1 point)

**What are the worst-case and best-case competitive ratios of the greedy online bipartite matching algorithm?**

- **Options:**
  - **A)** 1/2 and 1
  - **B)** 0 and 1/2
  - **C)** 0 and 1
  - **D)** 1 and 1
- **Correct Answer:** A. 1/2 and 1
- **Explanation:** Greedy always finds at least half the optimal matching and can find the optimum.

---

### Question 25 (1 point)

**In Hadoop Distributed File System, which signal is used by the NameNode to detect that a DataNode may have failed?**

- **Options:**
  - **A)** Missing heartbeat messages
  - **B)** A failed SQL query
  - **C)** A MapReduce counter
  - **D)** A client logout
- **Correct Answer:** A. Missing heartbeat messages
- **Explanation:** DataNodes send periodic heartbeats; if they stop, the NameNode marks the node dead and re-replicates its blocks.

---

### Question 26 (1 point)

**What does the following MapReduce computation produce?
Mapper: for each number x: emit("key", x)
Reducer: m = -infinity; for each value v: if v > m: m = v; emit("max", m)**

- **Options:**
  - **A)** The maximum input value
  - **B)** The sum of the input values
  - **C)** The number of input values
  - **D)** The sum of squared values
- **Correct Answer:** A. The maximum input value
- **Explanation:** All values go to one key and the reducer keeps the running maximum.

---

### Question 27 (1 point)

**A satisfaction rating with values poor, fair, good, and excellent is which attribute type?**

- **Options:**
  - **A)** Nominal
  - **B)** Ordinal
  - **C)** Continuous
  - **D)** Binary
- **Correct Answer:** B. Ordinal
- **Explanation:** Categories with a meaningful order but no fixed spacing are ordinal.

---

### Question 28 (1 point)

**Why does estimating click-through rate create an exploration problem?**

- **Options:**
  - **A)** An ad must sometimes be displayed to obtain evidence about whether users will click it
  - **B)** CTR cannot be represented numerically
  - **C)** Clicks cannot be logged
  - **D)** All ads have identical CTR
- **Correct Answer:** A. An ad must sometimes be displayed to obtain evidence about whether users will click it
- **Explanation:** This is the explore-vs-exploit trade-off: an ad that is never shown can never have its CTR estimated.

---

### Question 29 (1 point)

**For point x, the average distance to its own cluster is a(x)=2 and the smallest average distance to another cluster is b(x)=5. What is the silhouette value s(x)?**

- **Options:**
  - **A)** -0.6
  - **B)** 0.4
  - **C)** 0.6
  - **D)** 1.5
- **Correct Answer:** C. 0.6
- **Explanation:** s(x) = (b − a) / max(a, b) = (5 − 2) / 5 = 0.6.

---

### Question 30 (1 point)

**Before candidate generation in MS-Apriori, items are ordered by which quantity?**

- **Options:**
  - **A)** Ascending MIS value
  - **B)** Descending MIS value
  - **C)** Ascending support count
  - **D)** Descending confidence
- **Correct Answer:** A. Ascending MIS value
- **Explanation:** MS-Apriori sorts items by increasing minimum item support (MIS) so the lowest-MIS item in an itemset comes first.

---

### Question 31 (1 point)

**The Adwords problem is primarily a collaborative-filtering problem.**

- **Options:**
  - **A)** True
  - **B)** False
- **Correct Answer:** B. False
- **Explanation:** Adwords is an online matching / budget-allocation problem.

---

### Question 32 (1 point)

**A content-based user profile may be formed as a weighted combination of features from items the user rated.**

- **Options:**
  - **A)** True
  - **B)** False
- **Correct Answer:** A. True
- **Explanation:** For example, a rating-weighted average of the item feature vectors.

---

### Question 33 (1 point)

**Tables Student(studentID, name) and Enrollment(studentID, courseID, grade) are given. Which SQL query returns names of students with at least one grade of 90 or higher?**

- **Options:**
  - **A)** SELECT DISTINCT name FROM Student JOIN Enrollment ON Student.studentID=Enrollment.studentID WHERE grade>=90
  - **B)** SELECT name FROM Student WHERE grade>=90
  - **C)** SELECT Enrollment FROM Student WHERE Student.studentID=courseID
  - **D)** SELECT name FROM Student, Enrollment WHERE name=grade AND grade>=90
- **Correct Answer:** A. SELECT DISTINCT name FROM Student JOIN Enrollment ON Student.studentID=Enrollment.studentID WHERE grade>=90
- **Explanation:** You need a join on studentID, and DISTINCT removes duplicate names.

---

### Question 34 (1 point)

**Given A={1,2,3}, B={2,3,4}, and C={1,4,5}, which pair has the highest Jaccard similarity?**

- **Options:**
  - **A)** A and B
  - **B)** A and C
  - **C)** B and C
  - **D)** All pairs are equal
- **Correct Answer:** A. A and B
- **Explanation:** J(A,B) = 2/4 = 0.5; J(A,C) = 1/5 = 0.2; J(B,C) = 1/5 = 0.2.

---

### Question 35 (1 point)

**For the characteristic matrix below, use permutations P1=(2,1,4,3) and P2=(4,3,2,1). What is the minhash signature of Document 2? (Doc 1 = 1,0,1,0; Doc 2 = 0,1,1,1; Doc 3 = 1,1,0,0.)**

- **Options:**
  - **A)** (2,4)
  - **B)** (1,3)
  - **C)** (2,3)
  - **D)** (1,4)
- **Correct Answer:** A. (2,4)
- **Explanation:** Read each permutation as a row order and take the first row in that order where Doc 2 has a 1. P1 visits row 2 first, and Doc 2 has a 1 there → 2. P2 visits row 4 first, and Doc 2 has a 1 there → 4. Signature = (2,4).

---

### Question 36 (1 point)

**Which is an advantage of collaborative filtering?**

- **Options:**
  - **A)** It can recommend items without manually engineered item features
  - **B)** It eliminates the new-user problem
  - **C)** It always handles extreme sparsity well
  - **D)** It guarantees niche items are recommended
- **Correct Answer:** A. It can recommend items without manually engineered item features
- **Explanation:** CF only needs the user-item interaction matrix.

---

### Question 37 (1 point)

**What is the main advantage of MS-Apriori over standard Apriori?**

- **Options:**
  - **A)** It can discover patterns containing rare items by using item-specific minimum supports
  - **B)** It always uses only one database pass
  - **C)** It eliminates candidate generation
  - **D)** It guarantees higher-confidence rules
- **Correct Answer:** A. It can discover patterns containing rare items by using item-specific minimum supports
- **Explanation:** Per-item minimum supports address the rare-item problem.

---

### Question 38 (1 point)

**Bagging trains multiple models on bootstrap samples and combines their predictions.**

- **Options:**
  - **A)** True
  - **B)** False
- **Correct Answer:** A. True
- **Explanation:** This is the definition of bagging (bootstrap aggregating).

---

### Question 39 (1 point)

**When several eligible advertisers remain, BALANCE favors the advertiser with which property?**

- **Options:**
  - **A)** Largest unspent budget
  - **B)** Smallest original budget
  - **C)** Most queries already assigned
  - **D)** Lowest click-through rate
- **Correct Answer:** A. Largest unspent budget
- **Explanation:** BALANCE assigns each query to the bidder with the most remaining budget.

---

### Question 40 (1 point)

**Which is generally NOT an advantage of MapReduce relative to OLAP systems?**

- **Options:**
  - **A)** Very fast interactive access to simple aggregate statistics
  - **B)** Scalability across commodity machines
  - **C)** Support for a broad class of batch computations
  - **D)** Framework-level handling of machine failures
- **Correct Answer:** A. Very fast interactive access to simple aggregate statistics
- **Explanation:** MapReduce is batch-oriented and slow for interactive queries; that is OLAP's strength.

---
