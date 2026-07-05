// app.js — mirrors frontend/src/App.jsx + components/Sidebar.jsx + pages/*.jsx.
// No React, no JSX, no router library: a plain hash-based router, template strings for markup,
// and addEventListener for interactivity. Same routes, same behavior, same CSS classes.
//
// New in this version: the hash router understands "/mentor/:id" as a thread route,
// History lists conversations instead of raw turns, and the Mentor page is a real
// chat thread with a reply box instead of a single ask-and-done form.

const root = document.getElementById("root");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---- routing ----

const ROUTES = ["/", "/mentor", "/history", "/resume", "/profile", "/login"];

// Parses the hash into { path, conversationId }. "/mentor/123" maps to the
// "/mentor" page with conversationId = 123; everything else is unchanged.
function currentRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const mentorMatch = hash.match(/^\/mentor\/(\d+)$/);
  if (mentorMatch) {
    return { path: "/mentor", conversationId: Number(mentorMatch[1]) };
  }
  return { path: ROUTES.includes(hash) ? hash : "/", conversationId: null };
}

function navigate(path) {
  window.location.hash = path;
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

function render() {
  const { path, conversationId } = currentRoute();
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

  renderProtectedShell(path, conversationId);
}

// ---- shell + sidebar (mirrors App.jsx's ProtectedShell + components/Sidebar.jsx) ----

function renderProtectedShell(path, conversationId) {
  const user = auth.getUser();

  function initials(name) {
    return (
      (name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "?"
    );
  }

  root.innerHTML = `
    <div class="app-shell">
      <div class="sidebar">
        <div class="brand">MentorAI</div>
        ${navLink("/", "Dashboard", path)}
        ${navLink("/mentor", "Ask mentor", path)}
        ${navLink("/history", "History", path)}
        ${navLink("/resume", "Resume review", path)}
        <div style="margin-top:auto; padding-top:16px;">
          <a href="#/profile" class="sidebar-profile ${path === "/profile" ? "active" : ""}">
            <div class="profile-avatar">${escapeHtml(initials(user.name))}</div>
            <span class="sidebar-profile-name">${escapeHtml(user.name)}</span>
          </a>
          <button id="logout-btn" class="button-secondary" style="width:100%; margin-top:10px">Log out</button>
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
  else if (path === "/mentor") renderMentorPage(outlet, conversationId);
  else if (path === "/history") renderHistoryPage(outlet);
  else if (path === "/resume") renderResumePage(outlet);
  else if (path === "/profile") renderProfilePage(outlet);
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
// Dispatches between "start a new conversation" and "continue an existing thread".

function renderMentorPage(outlet, conversationId) {
  if (conversationId) {
    renderMentorThread(outlet, conversationId);
  } else {
    renderNewMentorChat(outlet);
  }
}

// -- new conversation: mode picker + first question. On success we hand off
//    to the thread view (via navigate), which is now the single source of
//    truth for rendering turns.

function renderNewMentorChat(outlet) {
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
      const session = await api.askMentor(mode, question);
      // hand off to the thread view for this brand-new conversation
      navigate(`/mentor/${session.conversation_id}`);
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Ask";
    }
  }

  paint();
}

// -- existing thread: loads all turns, renders them as a chat, and offers a
//    reply box that keeps appending to the same conversation_id.

async function renderMentorThread(outlet, conversationId) {
  outlet.innerHTML = `
    <div class="main">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px">
        <h2 style="font-weight:500; margin:0">Conversation</h2>
        <a href="#/mentor"><button class="button-secondary">New chat</button></a>
      </div>

      <p class="error-text" id="thread-error" style="display:none"></p>
      <div id="thread-messages"><p style="color:#6b6a63; font-size:14px">Loading…</p></div>

      <div class="card" id="thread-reply-card" style="display:none">
        <textarea id="thread-reply" rows="2" placeholder="Continue the conversation…"></textarea>
        <div style="display:flex; justify-content:flex-end; margin-top:8px">
          <button id="thread-reply-btn">Send</button>
        </div>
      </div>
    </div>
  `;

  let turns = [];
  try {
    turns = await api.getConversation(conversationId);
  } catch (e) {
    const errorEl = document.getElementById("thread-error");
    errorEl.textContent = e.message;
    errorEl.style.display = "block";
    return;
  }

  paintThread();
  document.getElementById("thread-reply-card").style.display = "block";
  document.getElementById("thread-reply-btn").addEventListener("click", handleReply);
  document.getElementById("thread-reply").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  });

  function paintThread() {
    const messagesEl = document.getElementById("thread-messages");
    messagesEl.innerHTML = turns.map((t, idx) => renderTurn(t, idx === turns.length - 1)).join("");

    // Quick "set as goal / generate roadmap" actions stay attached to the
    // most recent career-mode reply, same as the old single-shot page.
    const lastTurn = turns[turns.length - 1];
    if (lastTurn && lastTurn.mode === "career") {
      renderCareerActions(lastTurn, `career-actions-${lastTurn.id}`);
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderTurn(t, isLast) {
    const steps = t.steps || [];
    const resources = t.resources || [];

    return `
      <div class="chat-turn">
        <div class="chat-bubble chat-bubble-user">
          <p style="margin:0; font-size:14px; white-space:pre-wrap">${escapeHtml(t.question)}</p>
        </div>
        <div class="chat-bubble chat-bubble-assistant">
          <span class="badge">${escapeHtml(t.mode)}</span>
          <p style="font-weight:500; margin:8px 0 4px">Summary</p>
          <p style="font-size:14px; color:#3a392f; margin:0 0 12px">${escapeHtml(t.summary)}</p>

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

          ${t.mode === "career" && isLast ? `<div id="career-actions-${t.id}"></div>` : ""}
        </div>
      </div>
    `;
  }

  async function handleReply() {
    const textarea = document.getElementById("thread-reply");
    const question = textarea.value.trim();
    if (!question) return;

    const btn = document.getElementById("thread-reply-btn");
    const errorEl = document.getElementById("thread-error");
    errorEl.style.display = "none";
    btn.disabled = true;
    textarea.disabled = true;
    btn.textContent = "Thinking…";

    try {
      // mode is omitted here: the backend locks replies to the thread's
      // original mode regardless of what's sent
      const newTurn = await api.askMentor(null, question, conversationId);
      turns.push(newTurn);
      textarea.value = "";
      paintThread();
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.style.display = "block";
    } finally {
      btn.disabled = false;
      textarea.disabled = false;
      btn.textContent = "Send";
      document.getElementById("thread-reply")?.focus();
    }
  }
}

// ---- career mentor -> "Set as goal" -> "Generate roadmap" -> saved to profile ----
// elementId lets this be reused for whichever turn currently owns the action slot.

function renderCareerActions(turn, elementId) {
  const goalText = (turn.question || "").trim() || turn.summary;

  let goalSet = false;
  let settingGoal = false;
  let generatingRoadmap = false;
  let roadmapSaved = false;
  let actionError = "";

  function paintActions() {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerHTML = `
      <div class="career-actions">
        ${actionError ? `<p class="error-text" style="margin:0 0 8px">${escapeHtml(actionError)}</p>` : ""}

        ${
          roadmapSaved
            ? `<p class="success-text">Roadmap generated and saved to your <a href="#/profile">profile</a>.</p>`
            : goalSet
            ? `
              <p class="success-text" style="margin:0 0 10px">Goal set ✓ — "${escapeHtml(goalText)}"</p>
              <button id="generate-roadmap-btn" type="button" ${generatingRoadmap ? "disabled" : ""}>
                ${generatingRoadmap ? "Generating roadmap…" : "Generate roadmap"}
              </button>
            `
            : `
              <button id="set-goal-btn" type="button" class="button-secondary" ${settingGoal ? "disabled" : ""}>
                ${settingGoal ? "Setting…" : "Set as goal"}
              </button>
            `
        }
      </div>
    `;

    const setGoalBtn = document.getElementById("set-goal-btn");
    if (setGoalBtn) setGoalBtn.addEventListener("click", handleSetGoal);

    const generateBtn = document.getElementById("generate-roadmap-btn");
    if (generateBtn) generateBtn.addEventListener("click", handleGenerateRoadmap);
  }

  async function handleSetGoal() {
    settingGoal = true;
    actionError = "";
    paintActions();

    try {
      const currentUser = auth.getUser();
      const data = await api.updateProfile(goalText, currentUser.career_roadmap || "");
      auth.updateUser(data.user);
      goalSet = true;
    } catch (e) {
      actionError = e.message;
    } finally {
      settingGoal = false;
      paintActions();
    }
  }

  async function handleGenerateRoadmap() {
    generatingRoadmap = true;
    actionError = "";
    paintActions();

    try {
      const roadmapData = await api.generateRoadmap(goalText);
      const data = await api.updateProfile(goalText, roadmapData.roadmap);
      auth.updateUser(data.user);
      roadmapSaved = true;
    } catch (e) {
      actionError = e.message;
    } finally {
      generatingRoadmap = false;
      paintActions();
    }
  }

  paintActions();
}

// ---- pages/History.jsx ----
// Now lists conversations (one card per thread). Clicking one opens it in
// the Mentor page as a continuing chat.

// ---- pages/History.jsx ----
// Lists conversations, each with a delete (trash) button top-right and a
// click-through to continue the thread.

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
    const conversations = await api.mentorHistory();
    paintList(conversations);
  } catch (e) {
    const errorEl = document.getElementById("history-error");
    errorEl.textContent = e.message;
    errorEl.style.display = "block";
  }

  function paintList(conversations) {
    const listEl = document.getElementById("history-list");

    if (conversations.length === 0) {
      listEl.innerHTML = `<p style="color:#6b6a63; font-size:14px">No sessions yet. Ask your mentor something first.</p>`;
      return;
    }

    listEl.innerHTML = conversations
      .map(
        (c) => `
        <div class="history-item" data-conversation-id="${c.conversation_id}">
          <button class="history-delete-btn" data-conversation-id="${c.conversation_id}" title="Delete conversation" aria-label="Delete conversation">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
          </button>
          <a href="#/mentor/${c.conversation_id}" class="history-item-link">
            <span class="badge">${escapeHtml(c.mode)}</span>
            ${c.turn_count > 1 ? `<span class="badge badge-muted">${c.turn_count} messages</span>` : ""}
            <p style="font-weight:500; margin:4px 0">${escapeHtml(c.title)}</p>
            <p style="font-size:13px; color:#6b6a63; margin:0">${escapeHtml(c.last_message)}</p>
          </a>
        </div>`
      )
      .join("");

    listEl.querySelectorAll(".history-delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => handleDelete(e, btn.dataset.conversationId));
    });
  }

  async function handleDelete(e, conversationId) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Delete this conversation? This can't be undone.")) return;

    const errorEl = document.getElementById("history-error");
    errorEl.style.display = "none";

    const itemEl = document.querySelector(`.history-item[data-conversation-id="${conversationId}"]`);
    if (itemEl) itemEl.style.opacity = "0.5";

    const numericId = Number(conversationId);
    if (!Number.isFinite(numericId)) {
      errorEl.textContent = "Invalid conversation id";
      errorEl.style.display = "block";
      if (itemEl) itemEl.style.opacity = "1";
      return;
    }

    try {
      await api.deleteConversation(numericId);
      const conversations = await api.mentorHistory();
      paintList(conversations);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
      if (itemEl) itemEl.style.opacity = "1";
    }
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

// ---- pages/Profile.jsx ----
// Full profile view/edit lives in the main content area. The sidebar only shows
// the avatar + name (see renderProtectedShell), which link here.

function renderProfilePage(outlet) {
  let user = auth.getUser();
  let editing = false;
  let saving = false;
  let error = "";

  function initials(name) {
    return (
      (name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "?"
    );
  }

  function fieldView(label, value, placeholder) {
    return `
      <div class="profile-field">
        <p class="profile-label">${escapeHtml(label)}</p>
        ${
          value
            ? `<p class="profile-value">${escapeHtml(value)}</p>`
            : `<p class="profile-value empty">${escapeHtml(placeholder)}</p>`
        }
      </div>
    `;
  }

  function paint() {
    outlet.innerHTML = `
      <div class="main">
        <h2 style="font-weight:500">Profile</h2>

        <div class="card profile-page-card">
          <div class="profile-avatar profile-avatar-lg">${escapeHtml(initials(user.name))}</div>

          ${
            !editing
              ? `
            <p class="profile-name-lg">${escapeHtml(user.name)}</p>
            <p class="profile-email-lg">${escapeHtml(user.email)}</p>

            ${fieldView("Goal", user.goal, "No goal set yet")}
            ${fieldView("Career roadmap", user.career_roadmap, "No roadmap set yet")}

            <button id="profile-edit-btn" class="button-secondary" type="button">Edit profile</button>
          `
              : `
            <p class="profile-name-lg">${escapeHtml(user.name)}</p>
            <p class="profile-email-lg">${escapeHtml(user.email)}</p>

            <div class="field">
              <label>Goal</label>
              <input id="profile-goal-input" value="${escapeHtml(user.goal)}" placeholder="e.g. Land an SDE internship" />
            </div>

            <div class="field">
              <label>Career roadmap</label>
              <textarea id="profile-roadmap-input" rows="4" placeholder="e.g. DSA -> projects -> resume -> interviews">${escapeHtml(user.career_roadmap)}</textarea>
            </div>

            <p class="error-text" id="profile-error" style="display:${error ? "block" : "none"}">${escapeHtml(error)}</p>

            <div style="display:flex; gap:8px">
              <button id="profile-save-btn" type="button" ${saving ? "disabled" : ""}>${saving ? "Saving…" : "Save"}</button>
              <button id="profile-cancel-btn" type="button" class="button-secondary" ${saving ? "disabled" : ""}>Cancel</button>
            </div>
          `
          }
        </div>
      </div>
    `;

    const editBtn = document.getElementById("profile-edit-btn");
    if (editBtn) editBtn.addEventListener("click", () => {
      editing = true;
      error = "";
      paint();
    });

    const cancelBtn = document.getElementById("profile-cancel-btn");
    if (cancelBtn) cancelBtn.addEventListener("click", () => {
      editing = false;
      error = "";
      paint();
    });

    const saveBtn = document.getElementById("profile-save-btn");
    if (saveBtn) saveBtn.addEventListener("click", handleSave);
  }

  async function handleSave() {
    const goal = document.getElementById("profile-goal-input").value.trim();
    const roadmap = document.getElementById("profile-roadmap-input").value.trim();

    saving = true;
    error = "";
    paint();

    try {
      const data = await api.updateProfile(goal, roadmap);
      user = data.user;
      auth.updateUser(user);
      editing = false;
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
      paint();
    }
  }

  paint();
}