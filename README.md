# BFHL Tree Hierarchy Analyzer

REST API + Frontend for the Bajaj Finserv Health (BFHL) Full Stack Engineering Challenge.

Parses directed edge relationships (`A->B`), constructs tree hierarchies, detects cycles, and returns structured insights.

## Features

- **Edge Validation** — Rejects invalid formats, lowercase, multi-char nodes, self-loops, and empty strings
- **Duplicate Detection** — Tracks repeated edges, keeps first occurrence
- **Multi-Parent Resolution** — First parent wins (diamond problem)
- **Cycle Detection** — DFS with WHITE/GRAY/BLACK coloring
- **Connected Component Discovery** — Handles multiple independent trees
- **Tree Depth Calculation** — Longest root-to-leaf path (node count)
- **CORS Enabled** — Cross-origin requests fully supported

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS (glassmorphism dark theme)
- **No external frameworks** — zero build step required

## Quick Start

```bash
npm install
npm start
# Server runs at http://localhost:3000
# API at POST http://localhost:3000/bfhl
```

## API

### `POST /bfhl`

```json
{
  "data": ["A->B", "A->C", "B->D", "C->E", "E->F",
           "X->Y", "Y->Z", "Z->X",
           "P->Q", "Q->R",
           "G->H", "G->H", "G->I",
           "hello", "1->2", "A->"]
}
```

### `GET /bfhl`

Returns `{ "operation_code": 1 }` for health checks.

## Project Structure

```
├── src/
│   ├── server.js              # Express entry point
│   ├── routes/bfhl.js         # GET + POST /bfhl handlers
│   └── helpers/
│       ├── validator.js       # Edge parsing, validation, dedup
│       └── treeBuilder.js     # Adjacency maps, components, DFS cycles
├── public/
│   ├── index.html             # Frontend
│   ├── style.css              # Design system
│   └── app.js                 # Client logic
└── package.json
```

## Architecture

```
Input → Validator (trim, format, dedup) → TreeBuilder (components, roots, cycles, depth) → Response
```

Key algorithms:
- **Connected Components:** Undirected BFS to group nodes
- **Cycle Detection:** Iterative DFS with 3-color marking (back-edge = cycle)
- **Root Finding:** Per-component; fallback to lex-smallest if all nodes are children
- **Multi-Parent:** `childOf` map — first parent claim wins, subsequent edges silently discarded
