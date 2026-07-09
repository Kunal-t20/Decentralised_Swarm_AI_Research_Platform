## Project Structure
```
.
decentralized-ai-swarm/
├── docker-compose.yml             # System infrastructure configuration (Postgres, Redis, Qdrant)
├── .env                           # Global environment variables (API keys, DB secrets)
├── README.md                      # Documentation for project submission
│
├── backend/                       # FastAPI Server + Celery Worker Node Context
│   ├── Dockerfile
│   ├── requirements.txt           # fastapi, langgraph, celery, qdrant-client, sqlalchemy, alembic, redis
│   ├── alembic.ini                # Relational database migration configurations
│   ├── alembic/                   # Database version histories
│   │   └── versions/
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py                # FastAPI Application entry point & CORS configuration
│       │
│       ├── core/                  # Global Infrastructure Engines
│       │   ├── config.py          # Environment configuration loader (Pydantic)
│       │   ├── database.py        # PostgreSQL connection pool and sessionmakers
│       │   ├── security.py        # JWT generation and encryption verification utilities
│       │   └── celery_app.py      # Celery task configuration mapping back to Redis
│       │
│       ├── models/                # SQLAlchemy Core Database Schemas
│       │   ├── __init__.py
│       │   ├── user.py            # User credentials and access tables
│       │   └── research.py        # Research tasks tracking ledger (ID, status, final paths)
│       │
│       ├── schemas/               # Pydantic Request/Response validation layers
│       │   ├── auth.py            # Data rules for Login and Registration inputs
│       │   └── research.py        # Data rules for Task Creation and Polling payloads
│       │
│       ├── api/                   # Router Controllers (FastAPI Routes)
│       │   └── v1/
│       │       ├── auth.py        # POST /login, POST /register
│       │       └── research.py    # POST /research (triggers Celery), GET /status/{id}
│       │
│       ├── services/              # Clean abstractions for 3rd Party Wrappers & Data Engines
│       │   ├── qdrant_service.py  # Handles vector schema definitions and embedding operations
│       │   ├── search_service.py  # Controls Tavily queries with DuckDuckGo python fallback logic
│       │   └── openrouter_client.py # Multi-model interface containing Redis Cache & Ollama Circuit Breaker
│       │
│       ├── tasks/                 # Background Worker Context Blocks
│       │   └── swarm_tasks.py     # Contains rate-limited Celery tasks that invoke LangGraph
│       │
│       └── swarm/                 # LangGraph Multi-Agent Engine
│           ├── __init__.py
│           ├── state.py           # Defines the shared state dictionary (input, notes, votes)
│           ├── graph.py           # Chains nodes, maps routing logic, and compiles the state engine
│           └── nodes/             # Isolated Agent Brain files
│               ├── researcher.py  # Gemma-4: Fetches live data and logs text metadata to Qdrant
│               ├── analyst.py     # GPT-MoE: Pulls Qdrant blocks, maps feedback, updates Markdown
│               └── critic.py      # Council layer: Parallel threads calling DeepSeek-R1 and Nemotron
│
└── frontend/                      # User Dashboard (React SPA)
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    │
    └── src/
        ├── main.jsx               # UI bootstrapper code
        ├── App.jsx                # Layout definitions and JWT route protections
        │
        ├── components/            # Isolated Presentational UI Modules
        │   ├── Navbar.jsx
        │   ├── SwarmVisualizer.jsx # Tracks active Celery states and displays executing agents
        │   └── ReportRenderer.jsx  # Dynamically parses compiled Markdown outputs into rich HTML
        │
        ├── pages/                 # Full Screen View Layouts
        │   ├── Login.jsx          # Secure terminal for credential acquisition
        │   ├── Dashboard.jsx      # Portal for launching prompts and listing historic files
        │   └── Workspace.jsx      # High-density panel showing live agent streams and votes
        │
        └── services/              # Centralized Network Handlers
            └── api.js             # Axios engine checking tokens, submitting jobs, and polling endpoints

```