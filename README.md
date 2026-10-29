# Lewis Quiz

A lightweight, zero-dependency spaced-repetition (SRS) and quiz practice web application tailored for **Statistical Programming** and **Data Mining** coursework.

---

## 🎯 Overview

**Lewis Quiz** combines Anki-style spaced repetition (SM-2 rating: *Again, Hard, Good, Easy*) with targeted exam practice. It provides comprehensive question banks and explanations to help students master key concepts, prepare for weekly quizzes, and review for final exams.

### 📚 Subjects & Topics

1. **Statistical Programming**
   - Topic 1: Introduction to Programming & Python
   - Topic 2: Python Language Fundamentals
   - Topic 3: NumPy (arrays, vectorization, indexing)
   - Topic 4: pandas (Series, DataFrames, indexing)
   - Topic 5: Data loading, cleaning, and transformation
   - Topic 6: Data Visualization
   - Topic 7: Data aggregation and group operations

2. **Data Mining**
   - Topic 1: Introduction to Data Mining
   - Topic 2: Databases, MapReduce & TF-IDF
   - Topic 3: Similarity, Locality-Sensitive Hashing (LSH) & Clustering
   - Topic 4: Frequent Itemsets & Association Rules
   - Topic 5: Classification & Model Evaluation
   - Topic 6: Graphs & Link Analysis (PageRank, HITS)
   - Topic 7: Online Advertising & Streaming Algorithms

3. **Data Visualization**
   - Topic 1: Fundamentals of Visualization & Semiotics

---

## ✨ Features

- **Spaced Repetition (SRS)**: Smart card scheduling based on mastery level and review intervals.
- **Practice & Exam Mode**: Filter by subject, specific topic/chapter, or practice final exam questions with instant feedback and detailed explanations.
- **Multi-User Profiles**: Create and switch user profiles to track independent learning curves and streaks.
- **Analytics & Leaderboard**: Track accuracy, review history, and mastery breakdown by topic with interactive Chart.js visualizations.
- **Modern UI & Themes**: Clean SaaS-inspired responsive interface with Light, Dark, and System theme detection.
- **Bilingual Support (i18n)**: Seamless language toggle between Spanish and English.
- **Zero-Dependency Local Server**: Pure native Node.js HTTP server—no heavy build steps or npm installations required.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or newer).

### Running Locally

1. Start the local server:
   ```bash
   npm start
   # or directly:
   node dev-server.js
   ```

2. Open your browser at:
   ```
   http://127.0.0.1:4321
   ```

> **Tip:** You can customize the port and host via environment variables:
> ```bash
> PORT=8080 HOST=0.0.0.0 node dev-server.js
> ```

---

## 🛠️ Project Structure

```
.
├── api/
│   └── index.js                    # Vercel serverless function entrypoint
├── data/
│   └── db.json                     # Local storage (users, reviews, cards)
├── lib/
│   ├── handler.js                  # Shared API route handler (CRUD, reviews, rankings)
│   └── stores.js                   # Storage adapter: Local JSON file vs. Upstash Redis
├── public/
│   ├── index.html                  # Main application shell
│   ├── styles.css                  # UI styling and dark/light themes
│   ├── main.js                     # App state, routing, and view coordination
│   ├── srs.js                      # Spaced repetition scheduling logic
│   ├── stats.js                    # Charts and metrics calculation
│   ├── i18n.js                     # Spanish / English translations
│   ├── ui.js                       # Reusable UI components & helpers
│   ├── subjects.js                 # Subject registry
│   ├── statistical-programming.js  # Question bank for Statistical Programming
│   ├── data-mining.js              # Question bank for Data Mining
│   └── data-visualization.js       # Question bank for Data Visualization
├── dev-server.js                   # Standalone Node.js development server
├── package.json                    # Project configuration and start script
└── vercel.json                     # Deployment configuration for Vercel
```

---

## ☁️ Deployment & Configuration

Lewis Quiz is designed to deploy seamlessly to **Vercel** with **Upstash Redis**:

- By default, local runs persist data to [`data/db.json`](file:///Users/victorayllon/Desktop/Lewis-Quiz/data/db.json).
- When deploying to serverless environments (or testing with Redis locally), supply Upstash credentials in `.env.local` or environment variables:
  ```env
  KV_REST_API_URL="https://<your-upstash-instance>.upstash.io"
  KV_REST_API_TOKEN="<your-token>"
  ```
- The backend automatically switches from file storage to Redis when `KV_REST_API_URL` is detected.
