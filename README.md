# MentorAI — vanilla HTML/CSS/JS + Node/Express version

This is a straight conversion of the original MentorAI submission (Flask + React) into the stack
covered in the bootcamp: **HTML/CSS/JS on the frontend, Node.js + Express on the backend, JSON over
REST for the connection between them.** Same routes, same request/response shapes, same UI, same
behavior — just no Python and no React/JSX/build step.

## What changed and why

| Original | Converted | Why |
|---|---|---|
| Flask, Flask-SQLAlchemy | Node.js, Express | matches the bootcamp backend stack |
| SQLite via SQLAlchemy | a small JSON file (`mentorai.db.json`) via plain `fs` | keeps things in JSON/Node, and avoids a native database driver that needs a C++ build step (which isn't guaranteed to work on every grading machine) |
| Flask-JWT-Extended | `jsonwebtoken` | same JWT approach, just the Node equivalent |
| PyPDF2 | `pdf-parse` | same PDF-text-extraction role |
| React + Vite + react-router-dom | plain `index.html` + `style.css` + vanilla JS | matches the bootcamp frontend stack (DOM manipulation, `fetch`, event listeners, no JSX/bundler) |
| React Router (`BrowserRouter`) | a small hash-based router (`#/`, `#/mentor`, `#/history`, `#/resume`, `#/login`) | no build step means no server-side rewrite rules for client-side routes, so hash routing is the simplest vanilla equivalent |
| React Context (`AuthContext`) | a plain `auth` object reading/writing `localStorage` | same idea (client-side session state), no framework needed |

Every route, request body, response shape, and CSS class name is unchanged, so the app looks and
behaves identically to the original.

## Project structure

```
MentorAI/
├── backend/
│   ├── app.js              # Express app setup (mirrors app.py)
│   ├── db.js                # JSON-file persistence (mirrors models.py)
│   ├── llm.js                # Groq API calls + prompts (mirrors llm.py)
│   ├── middleware/auth.js    # JWT verification (mirrors @jwt_required())
│   ├── routes/
│   │   ├── auth.js           # /auth/signup, /auth/login
│   │   ├── mentor.js         # /mentor/ask, /mentor/history
│   │   ├── resume.js         # /resume/analyze, /resume/history
│   │   └── dashboard.js      # /dashboard/stats
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html            # single page, all views rendered into #root
    ├── style.css             # identical to the original index.css
    ├── api.js                 # fetch wrapper (mirrors src/api.js)
    ├── auth.js                 # localStorage-backed session (mirrors AuthContext.jsx)
    └── app.js                  # hash router + page renderers (mirrors App.jsx + pages/*.jsx)
```
## Prerequisites

- Node.js 18+
- npm
- Python 3 (only to serve the frontend)
- A Groq API key

## Running it
Open two terminals.

### Terminal 1 (Backend)
### Backend
```bash
cd backend
npm install

# Create a .env file from .env.example and add your GROQ_API_KEY
npm start
```
Backend runs on `http://localhost:5000`.

### Terminal 2 (Frontend)
### Frontend
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

## API summary (unchanged)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/auth/signup` | POST | – | Create account |
| `/auth/login` | POST | – | Get JWT |
| `/mentor/ask` | POST | JWT | Ask mentor (mode, question) |
| `/mentor/history` | GET | JWT | Past sessions |
| `/resume/analyze` | POST | JWT | Upload resume file (+ optional target_role) |
| `/resume/history` | GET | JWT | Past resume reviews |
| `/dashboard/stats` | GET | JWT | Aggregate stats |

## Verified working

Both halves were tested end-to-end in isolation: signup/login issue a working JWT, `/mentor/ask`
saves a session and returns it (including the fail-soft path when `GROQ_API_KEY` is missing or
unreachable), `/resume/analyze` extracts text from an upload and returns a review, and
`/dashboard/stats` aggregates correctly across sessions and reviews.
