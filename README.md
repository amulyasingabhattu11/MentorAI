# MentorAI

MentorAI is a full-stack AI-powered mentorship platform. It pairs users with an LLM-driven mentor
across multiple modes (career, academic, code), analyzes resumes against a target role, generates
and tracks personalized career roadmaps, and surfaces progress and learning-resource suggestions
along the way.

## Features

- **AI Mentor** — ask questions in career, academic, or code modes; conversations are saved and
  can be revisited or deleted.
- **Resume Analysis** — upload a resume (PDF or text) and get an AI review, optionally targeted at
  a specific role.
- **Career Roadmap** — generate a step-by-step roadmap toward a goal, track step completion, and
  manage multiple roadmaps.
- **Mentor-driven Suggestions** — the mentor can propose roadmap updates as notifications; nothing
  changes automatically unless the user explicitly approves.
- **Progress Dashboard** — streaks, XP/level, weekly study hours, a skills radar, and roadmap step
  status at a glance.
- **AI-curated Resources** — a learning-resource list generated from the user's stated goal (this
  is LLM-generated, not a live web search).

## Project structure

```
MentorAI/
├── backend/
│   ├── app.js                 # Express app setup — mounts all routers + /health
│   ├── db.js                  # JSON-file persistence layer (users, sessions, reviews, roadmaps, suggestions)
│   ├── llm.js                 # Groq API calls + prompts (mentor, resume, roadmap, resources)
│   ├── middleware/
│   │   └── auth.js            # JWT verification (requireAuth)
│   ├── routes/
│   │   ├── auth.js            # /auth/signup, /auth/login, /auth/me, /auth/profile
│   │   ├── mentor.js          # /mentor/ask, /mentor/history, /mentor/conversations/:id, /mentor/roadmap
│   │   ├── resume.js          # /resume/analyze, /resume/history
│   │   ├── dashboard.js       # /dashboard/stats, /dashboard/progress
│   │   ├── roadmap.js         # /roadmap/list, /roadmap/create, /roadmap/:id, /roadmap/:id/step/:stepIdx
│   │   ├── suggestions.js     # /suggestions, /suggestions/:id/approve, /suggestions/:id/dismiss
│   │   └── resources.js       # /resources (AI-curated, not a live web search)
│   ├── mentorai.db            # JSON data file (created/updated at runtime)
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html              # single page, all views rendered into #root
    ├── style.css                # app styling
    ├── api.js                   # fetch wrapper for every backend endpoint
    ├── auth.js                  # localStorage-backed session
    └── app.js                   # hash router + page renderers for all views
```

## Tech stack

- **Backend**: Node.js, Express, JSON-file persistence (`fs`), `jsonwebtoken` + `bcryptjs` for
  auth, `pdf-parse` for resume text extraction, Groq API for LLM calls.
- **Frontend**: plain HTML/CSS/JS, no build step, `fetch`-based API calls, hash-based client-side
  routing (`#/`, `#/mentor`, `#/roadmap`, `#/code-review`, `#/progress`, `#/history`,
  `#/resources`, `#/achievements`, `#/settings`, `#/resume`, `#/profile`, `#/login`), and a plain
  `localStorage`-backed session object in place of a framework auth context.

## Prerequisites

- Node.js 18+
- npm
- Python 3 (only to serve the frontend statically)
- A Groq API key

## Running it

Open two terminals.

### Terminal 1 — Backend
```bash
cd backend
npm install

# Create a .env file from .env.example and add your GROQ_API_KEY
npm start
```
Backend runs on `http://localhost:5000`. The `.env.example` values:
```
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET_KEY=change_this_to_a_random_secret
DATABASE_FILE=mentorai.db
PORT=5000
```

### Terminal 2 — Frontend
No build step, no npm install needed. Just serve the folder statically, e.g.:
```bash
cd frontend

# Windows
python -m http.server 8080

# macOS/Linux
python3 -m http.server 8080
```

Then open `http://localhost:8080`. If your backend runs somewhere other than
`http://localhost:5000`, set it before `app.js` loads:
```html
<script>window.MENTORAI_API_URL = "https://your-backend-url";</script>
```

## API summary

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/auth/signup` | POST | – | Create account |
| `/auth/login` | POST | – | Get JWT |
| `/auth/me` | GET | JWT | Current user profile |
| `/auth/profile` | PATCH | JWT | Update goal / career roadmap |
| `/mentor/ask` | POST | JWT | Ask mentor (mode, question, conversation_id) |
| `/mentor/history` | GET | JWT | Past sessions (optional `?mode=`) |
| `/mentor/conversations/:id` | GET | JWT | Get a single conversation's turns |
| `/mentor/conversations/:id` | DELETE | JWT | Delete a conversation |
| `/mentor/roadmap` | POST | JWT | Generate a roadmap from a goal |
| `/resume/analyze` | POST | JWT | Upload resume file (+ optional target_role) |
| `/resume/history` | GET | JWT | Past resume reviews |
| `/dashboard/stats` | GET | JWT | Aggregate stats |
| `/dashboard/progress` | GET | JWT | Streak, XP/level, weekly study hours, skills radar, roadmap step status |
| `/roadmap/list` | GET | JWT | List all roadmaps |
| `/roadmap/create` | POST | JWT | Create a roadmap (goal, title) |
| `/roadmap/:id` | GET | JWT | Get a single roadmap |
| `/roadmap/:id/step/:stepIdx` | PATCH | JWT | Mark a roadmap step complete/incomplete |
| `/roadmap/:id` | DELETE | JWT | Delete a roadmap |
| `/suggestions` | GET | JWT | List pending mentor-insight notifications |
| `/suggestions/:id/approve` | POST | JWT | Approve a suggestion (only path that mutates a roadmap automatically) |
| `/suggestions/:id/dismiss` | POST | JWT | Dismiss a suggestion |
| `/resources` | GET | JWT | AI-curated learning resources based on the user's goal |
| `/health` | GET | – | Health check |

## Notes

- `/resources` is **not** a live/real-time web search — it's the mentor LLM generating a relevant
  list from the user's stated goal. A genuine real-time version would need a separate search API
  (e.g. Bing/Serper/YouTube Data API) and its own key. The frontend labels this "AI-curated" so
  it isn't presented as something it isn't.
- Roadmap suggestions never mutate a roadmap on their own — `approve/:id` is the only path that
  does, and only because the user explicitly clicked it.
- `mentorai.db` is a plain JSON file (not SQLite) despite the `.db` extension.

## Verified working

Signup/login issue a working JWT; `/mentor/ask` saves a session and returns it (including the
fail-soft path when `GROQ_API_KEY` is missing or unreachable); `/resume/analyze` extracts text
from an upload and returns a review; `/dashboard/stats` and `/dashboard/progress` aggregate
correctly across sessions, reviews, and roadmaps; roadmap CRUD and step-completion toggles persist
correctly; suggestion approve/dismiss updates the linked roadmap only on approve.