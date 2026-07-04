// app.js — mirrors frontend/src/App.jsx + components/Sidebar.jsx + pages/*.jsx.
// No React, no JSX, no router library: a plain hash-based router, template strings for markup,
// and addEventListener for interactivity. Same routes, same behavior, same CSS classes.

const root = document.getElementById("root");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---- routing ----

const ROUTES = ["/", "/mentor", "/history", "/resume", "/login"];

function currentPath() {
  const hash = window.location.hash.replace(/^#/, "");
  return ROUTES.includes(hash) ? hash : "/";
}

function navigate(path) {
  window.location.hash = path;
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

function render() {
  const path = currentPath();
  const user = auth.getUser();

  // mirrors ProtectedShell: every route except /login requires a logged-in user
  if (path !== "/login" && !user) {
    navigate("/login");
    return;
  }
  if (path === "/login" && user) {
    navigate("/");
    return;
  }

  if (path === "/login") {
    renderAuthPage();
    return;
  }

  renderProtectedShell(path);
}

// ---- shell + sidebar (mirrors App.jsx's ProtectedShell + components/Sidebar.jsx) ----

function renderProtectedShell(path) {
  root.innerHTML = `
    <div class="app-shell">
      <div class="sidebar">
        <div class="brand">MentorAI</div>
        ${navLink("/", "Dashboard", path)}
        ${navLink("/mentor", "Ask mentor", path)}
        ${navLink("/history", "History", path)}
        ${navLink("/resume", "Resume review", path)}
        <div style="margin-top:auto; padding-top:16px;">
          <button id="logout-btn" class="button-secondary" style="width:100%">Log out</button>
        </div>
      </div>
      <div id="main-outlet"></div>
    </div>
  `;

  document.getElementById("logout-btn").addEventListener("click", () => {
    auth.logout();
    navigate("/login");
  });

  const outlet = document.getElementById("main-outlet");
  if (path === "/") renderDashboardPage(outlet);
  else if (path === "/mentor") renderMentorPage(outlet);
  else if (path === "/history") renderHistoryPage(outlet);
  else if (path === "/resume") renderResumePage(outlet);
}

function navLink(path, label, currentPathValue) {
  const active = path === currentPathValue ? "active" : "";
  return `<a href="#${path}" class="nav-link ${active}">${label}</a>`;
}

// ---- pages/Auth.jsx ----

function renderAuthPage() {
  let mode = "login"; // 'login' | 'signup'

  function paint() {
    root.innerHTML = `
      <div class="auth-shell">
        <div class="auth-card">
          <div class="brand" style="margin-bottom:4px">MentorAI</div>
          <p style="color:#6b6a63; font-size:13px; margin-top:0; margin-bottom:20px">
            ${mode === "login" ? "Log in to continue" : "Create your student account"}
          </p>

          <form id="auth-form">
            ${
              mode === "signup"
                ? `<div class="field">
                     <label>Name</label>
                     <input id="auth-name" required />
                   </div>`
                : ""
            }
            <div class="field">
              <label>Email</label>
              <input id="auth-email" type="email" required />
            </div>
            <div class="field">
              <label>Password</label>
              <input id="auth-password" type="password" required minlength="6" />
            </div>

            <p class="error-text" id="auth-error" style="display:none"></p>

            <button type="submit" id="auth-submit" style="width:100%; margin-top:8px">
              ${mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>

          <p style="font-size:13px; margin-top:16px; text-align:center">
            ${mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <a href="#" id="auth-toggle" style="color:#185fa5">${mode === "login" ? "Sign up" : "Log in"}</a>
          </p>
        </div>
      </div>
    `;

    document.getElementById("auth-toggle").addEventListener("click", (e) => {
      e.preventDefault();
      mode = mode === "login" ? "signup" : "login";
      paint();
    });

    document.getElementById("auth-form").addEventListener("submit", handleSubmit);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errorEl = document.getElementById("auth-error");
    const submitBtn = document.getElementById("auth-submit");
    errorEl.style.display = "none";

    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    const name = mode === "signup" ? document.getElementById("auth-name").value : undefined;

    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait…";

    try {
      const data = mode === "signup" ? await api.signup(name, email, password) : await api.login(email, password);
      auth.login(data.token, data.user);
      navigate("/");
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = mode === "login" ? "Log in" : "Sign up";
    }
  }

  paint();
}

// ---- pages/Dashboard.jsx ----

async function renderDashboardPage(outlet) {
  const user = auth.getUser();

  outlet.innerHTML = `
    <div class="main">
      <h2 style="font-weight:500">Welcome back${user ? `, ${escapeHtml(user.name)}` : ""}</h2>
      <p class="error-text" id="dash-error" style="display:none"></p>

      <div class="stat-grid">
        <div class="stat-card">
          <p class="stat-label">Sessions this week</p>
          <p class="stat-value" id="stat-sessions">–</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Topics covered</p>
          <p class="stat-value" id="stat-topics">–</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Latest resume score</p>
          <p class="stat-value" id="stat-resume">–</p>
        </div>
      </div>

      <div class="card">
        <p style="margin:0 0 8px; font-weight:500">Get started</p>
        <p style="margin:0 0 12px; color:#6b6a63; font-size:14px">
          Ask your mentor a question, or upload your resume for a readiness review.
        </p>
        <div style="display:flex; gap:8px">
          <a href="#/mentor"><button>Ask mentor</button></a>
          <a href="#/resume"><button class="button-secondary">Review resume</button></a>
        </div>
      </div>
    </div>
  `;

  try {
    const stats = await api.dashboardStats();
    document.getElementById("stat-sessions").textContent = stats.sessions_this_week;
    document.getElementById("stat-topics").textContent = stats.topics_covered;
    document.getElementById("stat-resume").textContent =
      stats.latest_resume_score !== null ? `${stats.latest_resume_score}/100` : "–";
  } catch (e) {
    const errorEl = document.getElementById("dash-error");
    errorEl.textContent = e.message;
    errorEl.style.display = "block";
  }
}

// ---- pages/Mentor.jsx ----

function renderMentorPage(outlet) {
  const MODES = [
    { id: "career", title: "Career mentor", desc: "Roadmaps and career guidance" },
    { id: "academic", title: "Academic mentor", desc: "Subject doubts and concepts" },
    { id: "code", title: "Code mentor", desc: "Hints, not full answers" },
  ];

  let mode = "career";

  function placeholderFor(m) {
    if (m === "code") return "I'm stuck on this bug and don't know why...";
    if (m === "academic") return "Explain how X concept works...";
    return "I want to break into ML but don't know where to start";
  }

  function paint() {
    outlet.innerHTML = `
      <div class="main">
        <h2 style="font-weight:500">Ask your mentor</h2>

        <div class="mode-grid">
          ${MODES.map(
            (m) => `
            <button data-mode="${m.id}" class="mode-card ${mode === m.id ? "selected" : ""}" style="background:#fff; color:inherit">
              <p class="mode-title">${m.title}</p>
              <p class="mode-desc">${m.desc}</p>
            </button>`
          ).join("")}
        </div>

        <div class="card">
          <textarea id="mentor-question" rows="3" placeholder="${escapeHtml(placeholderFor(mode))}"></textarea>
          <div style="display:flex; justify-content:flex-end; margin-top:8px">
            <button id="mentor-ask-btn">Ask</button>
          </div>

          <p class="error-text" id="mentor-error" style="display:none"></p>

          <div id="mentor-result"></div>
        </div>
      </div>
    `;

    outlet.querySelectorAll(".mode-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.dataset.mode;
        paint();
      });
    });

    document.getElementById("mentor-ask-btn").addEventListener("click", handleAsk);
  }

  async function handleAsk() {
    const textarea = document.getElementById("mentor-question");
    const question = textarea.value.trim();
    if (!question) return;

    const btn = document.getElementById("mentor-ask-btn");
    const errorEl = document.getElementById("mentor-error");
    errorEl.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Thinking…";

    try {
      const result = await api.askMentor(mode, question);
      renderResult(result);
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.style.display = "block";
    } finally {
      btn.disabled = false;
      btn.textContent = "Ask";
    }
  }

  function renderResult(result) {
    const resultEl = document.getElementById("mentor-result");
    const steps = result.steps || [];
    const resources = result.resources || [];

    resultEl.innerHTML = `
      <div style="border-top:1px solid #ece9df; margin-top:16px; padding-top:16px">
        <span class="badge">${escapeHtml(result.mode)}</span>
        <p style="font-weight:500; margin:8px 0 4px">Summary</p>
        <p style="font-size:14px; color:#3a392f; margin:0 0 12px">${escapeHtml(result.summary)}</p>

        ${
          steps.length > 0
            ? `<p style="font-weight:500; margin:0 0 8px">Steps</p>
               ${steps
                 .map(
                   (s, i) => `
                 <div class="step-row">
                   <span class="step-num">${i + 1}</span>
                   <span>${escapeHtml(s)}</span>
                 </div>`
                 )
                 .join("")}`
            : ""
        }

        ${
          resources.length > 0
            ? `<p style="font-weight:500; margin:12px 0 8px">Look into</p>
               <ul style="margin:0; padding-left:18px; font-size:14px">
                 ${resources.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}
               </ul>`
            : ""
        }
      </div>
    `;
  }

  paint();
}

// ---- pages/History.jsx ----

async function renderHistoryPage(outlet) {
  outlet.innerHTML = `
    <div class="main">
      <h2 style="font-weight:500">Session history</h2>
      <p class="error-text" id="history-error" style="display:none"></p>
      <div class="card" id="history-list">
        <p style="color:#6b6a63; font-size:14px">Loading…</p>
      </div>
    </div>
  `;

  try {
    const sessions = await api.mentorHistory();
    const listEl = document.getElementById("history-list");

    if (sessions.length === 0) {
      listEl.innerHTML = `<p style="color:#6b6a63; font-size:14px">No sessions yet. Ask your mentor something first.</p>`;
      return;
    }

    listEl.innerHTML = sessions
      .map(
        (s) => `
        <div class="history-item">
          <span class="badge">${escapeHtml(s.mode)}</span>
          <p style="font-weight:500; margin:4px 0">${escapeHtml(s.question)}</p>
          <p style="font-size:13px; color:#6b6a63; margin:0">${escapeHtml(s.summary)}</p>
        </div>`
      )
      .join("");
  } catch (e) {
    const errorEl = document.getElementById("history-error");
    errorEl.textContent = e.message;
    errorEl.style.display = "block";
  }
}

// ---- pages/Resume.jsx ----

function renderResumePage(outlet) {
  let file = null;

  outlet.innerHTML = `
    <div class="main">
      <h2 style="font-weight:500">Resume review</h2>

      <div class="card">
        <div class="field">
          <label>Target role (optional)</label>
          <input id="resume-role" placeholder="e.g. SDE, Data Analyst, AI Engineer" />
        </div>
        <div class="field">
          <label>Resume file (PDF or text)</label>
          <input id="resume-file" type="file" accept=".pdf,.txt" />
        </div>
        <button id="resume-analyze-btn" disabled>Analyze resume</button>

        <p class="error-text" id="resume-error" style="display:none"></p>

        <div id="resume-result"></div>
      </div>
    </div>
  `;

  const analyzeBtn = document.getElementById("resume-analyze-btn");

  document.getElementById("resume-file").addEventListener("change", (e) => {
    file = e.target.files[0] || null;
    analyzeBtn.disabled = !file;
  });

  analyzeBtn.addEventListener("click", handleAnalyze);

  async function handleAnalyze() {
    if (!file) return;
    const targetRole = document.getElementById("resume-role").value;
    const errorEl = document.getElementById("resume-error");
    errorEl.style.display = "none";
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing…";

    try {
      const result = await api.analyzeResume(file, targetRole);
      renderResult(result);
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.style.display = "block";
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = "Analyze resume";
    }
  }

  function renderResult(result) {
    const resultEl = document.getElementById("resume-result");
    const missingSkills = result.missing_skills || [];
    const suggestions = result.suggestions || [];

    resultEl.innerHTML = `
      <div style="border-top:1px solid #ece9df; margin-top:16px; padding-top:16px">
        <div class="stat-grid" style="grid-template-columns:1fr">
          <div class="stat-card">
            <p class="stat-label">Readiness score</p>
            <p class="stat-value">${result.score}/100</p>
          </div>
        </div>

        ${
          missingSkills.length > 0
            ? `<p style="font-weight:500; margin:0 0 8px">Missing skills</p>
               <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px">
                 ${missingSkills.map((s) => `<span class="badge">${escapeHtml(s)}</span>`).join("")}
               </div>`
            : ""
        }

        ${
          suggestions.length > 0
            ? `<p style="font-weight:500; margin:0 0 8px">Suggestions</p>
               ${suggestions
                 .map(
                   (s, i) => `
                 <div class="step-row">
                   <span class="step-num">${i + 1}</span>
                   <span>${escapeHtml(s)}</span>
                 </div>`
                 )
                 .join("")}`
            : ""
        }
      </div>
    `;
  }
}
