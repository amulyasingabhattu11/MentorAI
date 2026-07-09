// app.js — MentorAI frontend: hash router + vanilla JS pages.
// New in this version: redesigned dashboard with right sidebar, Career Roadmap page,
// updated History with search/filter, updated sidebar with icons, new pages
// (Code Review, Resources, Achievements, Settings).

// ---- theme ----
(function initTheme() {
  const saved = localStorage.getItem("mentorai_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
})();

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const next = isDark ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("mentorai_theme", next);
  return next;
}

const root = document.getElementById("root");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatRelativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---- SVG icons ----
const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  mentor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M9 12l2 2 4-4"/></svg>`,
  roadmap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  progress: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  resources: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  achievements: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  signout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>`,
  resume: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.4 18.4 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
};

// ---- routing ----

const ROUTES = ["/", "/mentor", "/roadmap", "/code-review", "/progress", "/history", "/resources", "/achievements", "/settings", "/resume", "/profile", "/login"];

function currentRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const mentorMatch = hash.match(/^\/mentor\/(\d+)$/);
  if (mentorMatch) return { path: "/mentor", conversationId: Number(mentorMatch[1]) };
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

  if (path !== "/login" && !user) { navigate("/login"); return; }
  if (path === "/login" && user) { navigate("/"); return; }
  if (path === "/login") { renderAuthPage(); return; }

  renderProtectedShell(path, conversationId);
}

// ---- shell + sidebar ----

function renderProtectedShell(path, conversationId) {
  const user = auth.getUser();

  function initials(name) {
    return (name || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "?";
  }

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  const NAV = [
    { path: "/", label: "Dashboard", icon: "dashboard" },
    { path: "/mentor", label: "AI Mentor", icon: "mentor" },
    { path: "/roadmap", label: "Career Roadmap", icon: "roadmap" },
    { path: "/code-review", label: "Code Review", icon: "code" },
    { path: "/progress", label: "Progress", icon: "progress" },
    { path: "/history", label: "History", icon: "history" },
    { path: "/resume", label: "Resume Review", icon: "resume" },
    { path: "/resources", label: "Resources", icon: "resources" },
    { path: "/achievements", label: "Achievements", icon: "achievements" },
    { path: "/settings", label: "Settings", icon: "settings" },
  ];

  root.innerHTML = `
    <div class="app-shell">
      <div class="sidebar">
        <div class="brand">MentorAI</div>

        ${NAV.map(n => `
          <a href="#${n.path}" class="nav-link ${path === n.path ? "active" : ""}">
            ${ICONS[n.icon]} ${n.label}
          </a>
        `).join("")}

        <div class="sidebar-bottom">
          <button id="theme-toggle-btn" class="nav-link" style="cursor:pointer">
            ${isDark ? ICONS.sun + " Light Mode" : ICONS.moon + " Dark Mode"}
          </button>
          <button id="logout-btn" class="nav-link" style="cursor:pointer; color:var(--danger)">
            ${ICONS.signout} Sign Out
          </button>
        </div>
      </div>
      <div id="main-outlet"></div>
    </div>
  `;

  document.getElementById("logout-btn").addEventListener("click", () => {
    auth.logout();
    navigate("/login");
  });

  document.getElementById("theme-toggle-btn").addEventListener("click", (e) => {
    const next = toggleTheme();
    const isDarkNow = next === "dark";
    e.currentTarget.innerHTML = isDarkNow ? ICONS.sun + " Light Mode" : ICONS.moon + " Dark Mode";
  });

  const outlet = document.getElementById("main-outlet");
  if (path === "/")             renderDashboardPage(outlet);
  else if (path === "/mentor")  renderMentorPage(outlet, conversationId);
  else if (path === "/roadmap") renderRoadmapPage(outlet);
  else if (path === "/code-review") renderCodeReviewPage(outlet);
  else if (path === "/progress") renderProgressPage(outlet);
  else if (path === "/history") renderHistoryPage(outlet);
  else if (path === "/resources") renderResourcesPage(outlet);
  else if (path === "/achievements") renderAchievementsPage(outlet);
  else if (path === "/settings") renderSettingsPage(outlet);
  else if (path === "/resume")  renderResumePage(outlet);
  else if (path === "/profile") renderProfilePage(outlet);
}

// ---- Auth ----

function renderAuthPage() {
  let mode = "login";

  function paint() {
    root.innerHTML = `
      <div class="auth-shell">
        <div class="auth-card">
          <div class="brand" style="margin-bottom:4px; color:var(--accent)">MentorAI</div>
          <p style="color:var(--text-muted); font-size:13px; margin-top:0; margin-bottom:20px">
            ${mode === "login" ? "Log in to continue your journey" : "Create your student account"}
          </p>
          <form id="auth-form">
            ${mode === "signup" ? `<div class="field"><label>Name</label><input id="auth-name" required /></div>` : ""}
            <div class="field"><label>Email</label><input id="auth-email" type="email" required /></div>
            <div class="field password-field">
              <label>Password</label>
              <div class="password-input-wrap">
                <input id="auth-password" type="password" required minlength="6" />
                <button type="button" id="auth-password-toggle" class="password-toggle" aria-label="Show password" tabindex="-1">
                  ${ICONS.eye}
                </button>
              </div>
            </div>
            <p class="error-text" id="auth-error" style="display:none"></p>
            <button type="submit" id="auth-submit" style="width:100%; margin-top:8px">
              ${mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>
          <p style="font-size:13px; margin-top:16px; text-align:center">
            ${mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <a href="#" id="auth-toggle" style="color:var(--accent)">${mode === "login" ? "Sign up" : "Log in"}</a>
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

    const pwInput = document.getElementById("auth-password");
    const pwToggle = document.getElementById("auth-password-toggle");
    pwToggle.addEventListener("click", () => {
      const isHidden = pwInput.type === "password";
      pwInput.type = isHidden ? "text" : "password";
      pwToggle.innerHTML = isHidden ? ICONS.eyeOff : ICONS.eye;
      pwToggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    });
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

// ---- Dashboard ----

async function renderDashboardPage(outlet) {
  const user = auth.getUser();
  const greeting = greetingByHour();

  outlet.innerHTML = `
    <div class="main-with-sidebar">
      <div class="main-content">
        <div class="dash-greeting">
          <p class="dash-greeting-time">${escapeHtml(greeting)}, ${escapeHtml(user ? user.name.split(" ")[0] : "")} !</p>
          <p class="dash-greeting-sub">Ready to continue your learning journey?</p>
          <p class="dash-greeting-date">${formatDate()}</p>
        </div>

        <div class="ai-input-card">
          <p class="ai-input-title">What would you like to learn today?</p>
          <textarea class="ai-input-textarea" id="dash-ai-input" rows="2" placeholder="Describe your goal, doubt, or coding problem..."></textarea>
          <div class="ai-input-row">
            <div class="ai-mode-tags">
              <button class="ai-mode-tag selected" data-mode="career">Career</button>
              <button class="ai-mode-tag" data-mode="academic">Subject</button>
              <button class="ai-mode-tag" data-mode="code">Code</button>
            </div>
            <button class="ai-generate-btn" id="dash-generate-btn">Generate Guidance</button>
          </div>
        </div>

        <div class="section-header">
          <p class="section-title">Quick Actions</p>
        </div>
        <div class="quick-actions-grid" style="margin-bottom:24px">
          <a href="#/roadmap" class="quick-action-card">
            <div class="quick-action-icon qa-orange">🗺️</div>
            <p class="quick-action-name">Career Roadmap</p>
            <p class="quick-action-desc">Get personalized learning path</p>
          </a>
          <a href="#/mentor" class="quick-action-card" id="qa-subject">
            <div class="quick-action-icon qa-blue">📚</div>
            <p class="quick-action-name">Subject Help</p>
            <p class="quick-action-desc">Get AI tutoring on any topic</p>
          </a>
          <a href="#/code-review" class="quick-action-card">
            <div class="quick-action-icon qa-green">💻</div>
            <p class="quick-action-name">Code Review</p>
            <p class="quick-action-desc">Analyze and improve your code</p>
          </a>
          <a href="#/mentor" class="quick-action-card" id="qa-interview">
            <div class="quick-action-icon qa-yellow">🎯</div>
            <p class="quick-action-name">Interview Prep</p>
            <p class="quick-action-desc">Practice mock interviews</p>
          </a>
        </div>

        <div class="section-header">
          <p class="section-title">Continue Learning</p>
          <a href="#/history" class="section-link">View all</a>
        </div>
        <div id="continue-learning-section">
          <div class="continue-grid">
            <div class="continue-card" style="opacity:0.5">
              <p class="continue-card-title">Loading…</p>
            </div>
          </div>
        </div>

        <p class="error-text" id="dash-error" style="display:none"></p>
      </div>

      <div class="right-sidebar" id="dash-right-sidebar">
        <div class="rsb-widget">
          <p class="rsb-title">Overall Progress</p>
          <div class="progress-circle-wrap">
            <svg class="progress-circle-svg" viewBox="0 0 90 90">
              <circle class="progress-circle-track" cx="45" cy="45" r="36"/>
              <circle class="progress-circle-fill" id="progress-circle" cx="45" cy="45" r="36"
                stroke-dasharray="226" stroke-dashoffset="226"/>
            </svg>
            <p class="progress-pct" id="dash-pct">0%</p>
            <p class="progress-circle-label" id="dash-pct-label">completed</p>
          </div>
          <div class="rsb-stats-row">
            <div class="rsb-stat">
              <p class="rsb-stat-value" id="dash-streak">–</p>
              <p class="rsb-stat-label">Day Streak</p>
            </div>
            <div class="rsb-stat">
              <p class="rsb-stat-value" id="dash-hours">–</p>
              <p class="rsb-stat-label">Study hrs</p>
            </div>
          </div>
        </div>

        <div class="rsb-widget">
          <p class="rsb-title" id="dash-goals-title">Daily Goals</p>
          <p class="daily-goals-progress" id="dash-goals-progress"></p>
          <div class="daily-goals-list" id="dash-goals-list">
            <div style="color:var(--text-faint); font-size:12px">Loading…</div>
          </div>
        </div>

        <div class="rsb-widget">
          <p class="rsb-title">Recent Activity</p>
          <div class="activity-feed" id="dash-activity">
            <div style="color:var(--text-faint); font-size:12px">Loading…</div>
          </div>
        </div>

        <div class="rsb-widget">
          <p class="rsb-title">Upcoming</p>
          <div id="dash-upcoming">
            <div class="upcoming-item">
              <p class="upcoming-item-title">Review your roadmap</p>
              <p class="upcoming-item-sub">Check your career roadmap progress</p>
            </div>
            <div class="upcoming-item">
              <p class="upcoming-item-title">Resume update</p>
              <p class="upcoming-item-sub">Upload latest resume for feedback</p>
            </div>
          </div>
        </div>

        <div class="rsb-widget">
          <p class="rsb-title">Achievements</p>
          <div class="achievements-list" id="dash-achievements">
            <div style="color:var(--text-faint); font-size:12px">Loading…</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Mode tag selection
  let selectedMode = "career";
  outlet.querySelectorAll(".ai-mode-tag").forEach(btn => {
    btn.addEventListener("click", () => {
      outlet.querySelectorAll(".ai-mode-tag").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedMode = btn.dataset.mode;
    });
  });

  // Generate guidance button
  document.getElementById("dash-generate-btn").addEventListener("click", async () => {
    const question = document.getElementById("dash-ai-input").value.trim();
    if (!question) return;
    const btn = document.getElementById("dash-generate-btn");
    btn.disabled = true;
    btn.textContent = "Thinking…";
    try {
      const session = await api.askMentor(selectedMode, question);
      navigate(`/mentor/${session.conversation_id}`);
    } catch (e) {
      const errorEl = document.getElementById("dash-error");
      errorEl.textContent = e.message;
      errorEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Generate Guidance";
    }
  });

  // Load progress stats for right sidebar
  try {
    const data = await api.progressStats();

    // Overall progress circle
    const pct = data.roadmap.overall_percent;
    const circumference = 226;
    const offset = circumference - (pct / 100) * circumference;
    const circle = document.getElementById("progress-circle");
    if (circle) {
      circle.style.strokeDashoffset = offset;
    }
    const pctEl = document.getElementById("dash-pct");
    if (pctEl) pctEl.textContent = pct + "%";
    const labelEl = document.getElementById("dash-pct-label");
    if (labelEl) labelEl.textContent = "completed";

    // Streak / hours
    const streakEl = document.getElementById("dash-streak");
    if (streakEl) streakEl.textContent = data.day_streak;
    const hoursEl = document.getElementById("dash-hours");
    if (hoursEl) hoursEl.textContent = data.hours_this_week + "h";

    // Daily goals
    const goals = data.daily_goals || [];
    const doneCount = goals.filter(g => g.done).length;
    const goalsTitleEl = document.getElementById("dash-goals-title");
    if (goalsTitleEl) goalsTitleEl.textContent = `Daily Goals`;
    const goalsProgressEl = document.getElementById("dash-goals-progress");
    if (goalsProgressEl) goalsProgressEl.textContent = `${doneCount}/${goals.length} completed`;
    const goalsList = document.getElementById("dash-goals-list");
    if (goalsList) {
      goalsList.innerHTML = goals.length === 0
        ? `<p style="color:var(--text-faint);font-size:12px">No goals yet</p>`
        : goals.map(g => `
          <div class="daily-goal-item ${g.done ? "done" : ""}">
            <div class="daily-goal-check">${g.done ? ICONS.check : ""}</div>
            <span>${escapeHtml(g.label)}</span>
          </div>
        `).join("");
    }

    // Recent activity
    const activity = data.recent_activity || [];
    const actEl = document.getElementById("dash-activity");
    if (actEl) {
      if (activity.length === 0) {
        actEl.innerHTML = `<p style="color:var(--text-faint);font-size:12px">No activity yet. Start a session!</p>`;
      } else {
        actEl.innerHTML = activity.map(a => `
          <div class="activity-item">
            <div class="activity-dot ${a.type === "code_review" ? "activity-dot-green" : ""}"></div>
            <span class="activity-text">${escapeHtml(a.title)}</span>
          </div>
        `).join("");
      }
    }

    // Achievements
    const xp = data.total_xp || 0;
    const achEl = document.getElementById("dash-achievements");
    if (achEl) {
      const earned = [
        xp >= 10 && "First Session",
        xp >= 50 && "Rising Star",
        xp >= 100 && "Dedicated",
        data.day_streak >= 3 && "3-Day Streak",
        data.day_streak >= 7 && "Week Warrior",
      ].filter(Boolean);
      achEl.innerHTML = earned.length === 0
        ? `<p style="color:var(--text-faint);font-size:12px">Complete sessions to earn badges</p>`
        : earned.map(a => `<span class="achievement-badge">${escapeHtml(a)}</span>`).join("");
    }
  } catch (e) {
    // Stats failed — show error but don't crash the page
    const errEl = document.getElementById("dash-error");
    if (errEl) { errEl.textContent = "Could not load stats: " + e.message; errEl.style.display = "block"; }
  }

  // Load recent conversations for Continue Learning
  try {
    const conversations = await api.mentorHistory();
    const continueEl = document.getElementById("continue-learning-section");
    if (continueEl) {
      if (conversations.length === 0) {
        continueEl.innerHTML = `<p style="color:var(--text-muted);font-size:13px">No sessions yet. Ask your mentor something to get started!</p>`;
      } else {
        const recent = conversations.slice(0, 4);
        continueEl.innerHTML = `
          <div class="continue-grid">
            ${recent.map(c => {
              const modeColors = { career: "#f97316", academic: "#3b82f6", code: "#22c55e" };
              const modeNames = { career: "Career Path", academic: "Academics", code: "Code Skills" };
              const color = modeColors[c.mode] || "#8b5cf6";
              return `
                <a href="#/mentor/${c.conversation_id}" class="continue-card" style="text-decoration:none;color:inherit">
                  <p class="continue-card-title">${escapeHtml(c.title.length > 50 ? c.title.slice(0, 50) + "…" : c.title)}</p>
                  <p class="continue-card-sub">Last: ${escapeHtml(c.last_message.length > 40 ? c.last_message.slice(0, 40) + "…" : c.last_message)}</p>
                  <div class="mini-progress-bar">
                    <div class="mini-progress-fill" style="width:${Math.min(100, 30 + c.turn_count * 10)}%; background:${color}"></div>
                  </div>
                </a>
              `;
            }).join("")}
          </div>
        `;
      }
    }
  } catch {}
}

// ---- Career Roadmap ----

async function renderRoadmapPage(outlet) {
  outlet.innerHTML = `
    <div class="main-with-sidebar">
      <div class="main-content">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
          <div>
            <h2 style="font-weight:700;margin:0 0 2px;font-size:22px">Career Roadmap</h2>
            <p style="color:var(--text-muted);font-size:13px;margin:0">Your personalized path — generated by MentorAI</p>
          </div>
          <button id="new-roadmap-btn" class="button-accent" style="display:flex;align-items:center;gap:6px;padding:8px 16px">
            ${ICONS.plus} New Roadmap
          </button>
        </div>
        <p class="error-text" id="roadmap-error" style="display:none"></p>
        <div id="roadmap-suggestions"></div>
        <div id="roadmap-body">
          <p style="color:var(--text-muted);font-size:14px">Loading…</p>
        </div>
      </div>

      <div class="right-sidebar">
        <div class="rsb-widget">
          <p class="rsb-title">Overall Progress</p>
          <div class="progress-circle-wrap">
            <svg class="progress-circle-svg" viewBox="0 0 90 90">
              <circle class="progress-circle-track" cx="45" cy="45" r="36"/>
              <circle class="progress-circle-fill" id="roadmap-progress-circle" cx="45" cy="45" r="36"
                stroke-dasharray="226" stroke-dashoffset="226"/>
            </svg>
            <p class="progress-pct" id="roadmap-pct">0%</p>
            <p class="progress-circle-label">Week 0 of track</p>
          </div>
          <div class="rsb-stats-row">
            <div class="rsb-stat">
              <p class="rsb-stat-value" id="rsb-streak">–</p>
              <p class="rsb-stat-label">Day Streak</p>
            </div>
            <div class="rsb-stat">
              <p class="rsb-stat-value" id="rsb-hours">–</p>
              <p class="rsb-stat-label">Study hrs</p>
            </div>
          </div>
        </div>

        <div class="rsb-widget">
          <p class="rsb-title">Daily Goals</p>
          <p class="daily-goals-progress" id="rsb-goals-progress"></p>
          <div class="daily-goals-list" id="rsb-goals-list">
            <div style="color:var(--text-faint);font-size:12px">Loading…</div>
          </div>
        </div>

        <div class="rsb-widget">
          <p class="rsb-title">Upcoming Interview Prep</p>
          <div>
            <div class="upcoming-item">
              <p class="upcoming-item-title">Mock System Design</p>
              <p class="upcoming-item-sub">Practice system design patterns</p>
            </div>
            <div class="upcoming-item">
              <p class="upcoming-item-title">DSA sprint (Graphs)</p>
              <p class="upcoming-item-sub">Focus on graph traversal algorithms</p>
            </div>
          </div>
        </div>

        <div class="rsb-widget">
          <p class="rsb-title">Recent Achievements</p>
          <div class="achievements-list" id="rsb-achievements">
            <div style="color:var(--text-faint);font-size:12px">Complete steps to earn badges</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load progress stats for right sidebar
  try {
    const data = await api.progressStats();
    const goals = data.daily_goals || [];
    const doneCount = goals.filter(g => g.done).length;

    const goalsProgressEl = document.getElementById("rsb-goals-progress");
    if (goalsProgressEl) goalsProgressEl.textContent = `${doneCount}/${goals.length} completed`;
    const goalsList = document.getElementById("rsb-goals-list");
    if (goalsList) {
      goalsList.innerHTML = goals.map(g => `
        <div class="daily-goal-item ${g.done ? "done" : ""}">
          <div class="daily-goal-check">${g.done ? ICONS.check : ""}</div>
          <span>${escapeHtml(g.label)}</span>
        </div>
      `).join("");
    }
    const streakEl = document.getElementById("rsb-streak");
    if (streakEl) streakEl.textContent = data.day_streak;
    const hoursEl = document.getElementById("rsb-hours");
    if (hoursEl) hoursEl.textContent = data.hours_this_week + "h";
    const xp = data.total_xp || 0;
    const achEl = document.getElementById("rsb-achievements");
    if (achEl) {
      const earned = [
        xp >= 10 && "First Session",
        xp >= 50 && "Rising Star",
        data.day_streak >= 3 && "3-Day Streak",
      ].filter(Boolean);
      achEl.innerHTML = earned.length === 0
        ? `<div style="color:var(--text-faint);font-size:12px">Complete steps to earn badges</div>`
        : earned.map(a => `<span class="achievement-badge">${escapeHtml(a)}</span>`).join("");
    }
  } catch {}

  // Load roadmaps
  let roadmaps = [];
  try {
    roadmaps = await api.listRoadmaps();
    paintRoadmapBody(roadmaps);
  } catch (e) {
    const errEl = document.getElementById("roadmap-error");
    if (errEl) { errEl.textContent = e.message; errEl.style.display = "block"; }
    document.getElementById("roadmap-body").innerHTML = "";
  }

  // Load pending Mentor-driven roadmap suggestions (notifications). These
  // never change anything by themselves — only Approve does.
  try {
    const suggestions = await api.listSuggestions();
    paintSuggestions(suggestions);
  } catch {
    // Suggestions are a nice-to-have; a failure here shouldn't block the roadmap itself.
  }

  function suggestionCopy(type) {
    if (type === "mark_done") return { icon: "✅", label: "Mark step complete" };
    if (type === "reprioritize") return { icon: "⏫", label: "Prioritize this step" };
    return { icon: "➕", label: "Add roadmap step" };
  }

  function paintSuggestions(suggestions) {
    const el = document.getElementById("roadmap-suggestions");
    if (!el) return;

    if (!suggestions || suggestions.length === 0) {
      el.innerHTML = "";
      return;
    }

    el.innerHTML = `
      <div class="card" style="margin-bottom:20px;border-left:3px solid var(--accent)">
        <p class="card-title" style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
          🔔 Mentor suggestions
        </p>
        <p class="card-subtitle" style="margin-top:0;margin-bottom:12px">Based on your recent conversations — nothing changes until you approve.</p>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${suggestions.map(s => {
            const copy = suggestionCopy(s.type);
            return `
              <div class="suggestion-card" data-suggestion-id="${s.id}"
                   style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
                <p style="margin:0;font-size:13px;flex:1;min-width:200px">${escapeHtml(s.reasoning)}</p>
                <div style="display:flex;gap:8px;flex-shrink:0">
                  <button class="button-accent suggestion-approve-btn" style="padding:6px 12px;font-size:12px;white-space:nowrap">
                    ${copy.icon} ${copy.label}
                  </button>
                  <button class="button-secondary suggestion-dismiss-btn" style="padding:6px 12px;font-size:12px">
                    Dismiss
                  </button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    el.querySelectorAll(".suggestion-card").forEach(card => {
      const id = Number(card.dataset.suggestionId);

      card.querySelector(".suggestion-approve-btn").addEventListener("click", async (e) => {
        e.target.disabled = true;
        e.target.textContent = "Applying…";
        try {
          const result = await api.approveSuggestion(id);
          // Refresh the roadmap this suggestion touched so the change is visible immediately.
          const idx = roadmaps.findIndex(r => r.id === result.roadmap.id);
          if (idx !== -1) roadmaps[idx] = result.roadmap;
          paintRoadmapDetail(result.roadmap, roadmaps);
          // Keep the cached profile (career_roadmap text) in sync too, so the
          // Profile page reflects the approved change without a manual edit.
          if (result.user) auth.updateUser(result.user);
          const remaining = await api.listSuggestions();
          paintSuggestions(remaining);
        } catch (err) {
          const errEl = document.getElementById("roadmap-error");
          if (errEl) { errEl.textContent = err.message; errEl.style.display = "block"; }
        }
      });

      card.querySelector(".suggestion-dismiss-btn").addEventListener("click", async (e) => {
        e.target.disabled = true;
        try {
          await api.dismissSuggestion(id);
          const remaining = await api.listSuggestions();
          paintSuggestions(remaining);
        } catch (err) {
          const errEl = document.getElementById("roadmap-error");
          if (errEl) { errEl.textContent = err.message; errEl.style.display = "block"; }
        }
      });
    });
  }

  document.getElementById("new-roadmap-btn").addEventListener("click", () => showCreateRoadmapModal(roadmaps));

  function paintRoadmapBody(list) {
    const body = document.getElementById("roadmap-body");
    if (!body) return;

    if (list.length === 0) {
      body.innerHTML = `
        <div class="roadmap-empty">
          <div class="roadmap-empty-icon">🗺️</div>
          <h3 class="roadmap-empty-title">Select a roadmap</h3>
          <p class="roadmap-empty-sub">Choose an existing roadmap or create a new one to get started on your learning path.</p>
          <button id="create-first-roadmap-btn" class="button-accent" style="padding:10px 24px">
            Create New Roadmap
          </button>
        </div>
      `;
      document.getElementById("create-first-roadmap-btn").addEventListener("click", () => showCreateRoadmapModal(list));
    } else {
      // Show first roadmap selected by default
      paintRoadmapDetail(list[0], list);
    }
  }

  function paintRoadmapDetail(roadmap, list) {
    const body = document.getElementById("roadmap-body");
    if (!body) return;

    const pct = roadmap.overall_percent || 0;
    const circumference = 226;
    const offset = circumference - (pct / 100) * circumference;

    // Update right sidebar circle
    const circle = document.getElementById("roadmap-progress-circle");
    if (circle) { circle.style.strokeDashoffset = offset; }
    const pctEl = document.getElementById("roadmap-pct");
    if (pctEl) pctEl.textContent = pct + "%";

    // Multiple roadmaps: show selector tabs
    const selectorHtml = list.length > 1 ? `
      <div class="roadmap-list" style="margin-bottom:20px">
        ${list.map(r => `
          <div class="roadmap-list-item ${r.id === roadmap.id ? "active" : ""}" data-roadmap-id="${r.id}">
            <div>
              <p class="roadmap-list-title">${escapeHtml(r.title)}</p>
              <p class="roadmap-list-sub">${r.steps.length} steps · ${r.overall_percent}% done</p>
            </div>
            <span class="badge">${r.overall_percent}%</span>
          </div>
        `).join("")}
      </div>
    ` : "";

    const stepsHtml = (roadmap.steps || []).map((step, idx) => {
      let statusClass = "";
      let statusBadge = "";
      if (step.completed) {
        statusClass = "step-completed";
        statusBadge = `<span class="roadmap-step-status-badge step-done-badge">Completed</span>`;
      } else if (idx === (roadmap.steps || []).findIndex(s => !s.completed)) {
        statusClass = "step-current";
        statusBadge = `<span class="roadmap-step-status-badge step-in-progress">In Progress</span>`;
      }

      return `
        <div class="roadmap-step-card ${statusClass}" data-step-idx="${idx}" data-roadmap-id="${roadmap.id}" data-completed="${step.completed}">
          <div class="roadmap-step-num">${step.completed ? ICONS.check : idx + 1}</div>
          <div class="roadmap-step-info">
            <p class="roadmap-step-name">${escapeHtml(step.label)}</p>
            <p class="roadmap-step-sub">${step.subtopics || 5} subtopics</p>
          </div>
          ${statusBadge}
        </div>
      `;
    }).join("");

    body.innerHTML = `
      ${selectorHtml}
      <div class="roadmap-overall-bar">
        <div class="roadmap-overall-bar-label">
          <span>Progress</span>
          <span>${pct}% complete · ${roadmap.steps.filter(s => s.completed).length} of ${roadmap.steps.length} done</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>

      <div class="roadmap-header">
        <div>
          <p class="roadmap-track-label">Current Track</p>
          <p class="roadmap-track-title">${escapeHtml(roadmap.title)}</p>
        </div>
        <button class="button-secondary" id="delete-roadmap-btn" style="font-size:12px;padding:6px 12px;color:var(--danger)">
          Delete
        </button>
      </div>

      <div class="roadmap-steps-list" id="roadmap-steps">
        ${stepsHtml}
      </div>
    `;

    // Selector click
    body.querySelectorAll(".roadmap-list-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = Number(item.dataset.roadmapId);
        const selected = list.find(r => r.id === id);
        if (selected) paintRoadmapDetail(selected, list);
      });
    });

    // Step click → toggle completion
    body.querySelectorAll(".roadmap-step-card").forEach(card => {
      card.addEventListener("click", async () => {
        const stepIdx = Number(card.dataset.stepIdx);
        const roadmapId = Number(card.dataset.roadmapId);
        const currentCompleted = card.dataset.completed === "true";
        try {
          const updated = await api.updateRoadmapStep(roadmapId, stepIdx, !currentCompleted);
          // Replace in list
          const idx = list.findIndex(r => r.id === roadmapId);
          if (idx !== -1) list[idx] = updated;
          paintRoadmapDetail(updated, list);
        } catch (e) {
          const errEl = document.getElementById("roadmap-error");
          if (errEl) { errEl.textContent = e.message; errEl.style.display = "block"; }
        }
      });
    });

    // Delete roadmap
    const deleteBtn = document.getElementById("delete-roadmap-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Delete this roadmap? This can't be undone.")) return;
        try {
          await api.deleteRoadmap(roadmap.id);
          const updated = list.filter(r => r.id !== roadmap.id);
          roadmaps = updated;
          paintRoadmapBody(updated);
        } catch (e) {
          const errEl = document.getElementById("roadmap-error");
          if (errEl) { errEl.textContent = e.message; errEl.style.display = "block"; }
        }
      });
    }
  }

  function showCreateRoadmapModal(existingList) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-card">
        <h3 class="modal-title">Create New Roadmap</h3>
        <p class="modal-sub">Enter your career goal and we'll generate a personalized step-by-step roadmap using AI.</p>
        <div class="field">
          <label>Career Goal</label>
          <input id="modal-goal-input" placeholder="e.g. Software Engineer, Data Scientist, ML Engineer" />
        </div>
        <p class="error-text" id="modal-error" style="display:none"></p>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button id="modal-create-btn" class="button-accent" style="flex:1">Generate Roadmap</button>
          <button id="modal-cancel-btn" class="button-secondary">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#modal-cancel-btn").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector("#modal-create-btn").addEventListener("click", async () => {
      const goal = overlay.querySelector("#modal-goal-input").value.trim();
      if (!goal) return;
      const createBtn = overlay.querySelector("#modal-create-btn");
      const errEl = overlay.querySelector("#modal-error");
      createBtn.disabled = true;
      createBtn.textContent = "Generating…";
      errEl.style.display = "none";
      try {
        const newRoadmap = await api.createRoadmap(goal, goal);
        overlay.remove();
        const updated = [newRoadmap, ...existingList];
        roadmaps = updated;
        paintRoadmapDetail(newRoadmap, updated);
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = "block";
        createBtn.disabled = false;
        createBtn.textContent = "Generate Roadmap";
      }
    });
  }
}

// ---- Code Review ----

function renderCodeReviewPage(outlet) {
  outlet.innerHTML = `
    <div class="main">
      <h2 style="font-weight:700;margin-bottom:4px">Code Review</h2>
      <p style="color:var(--text-muted);font-size:14px;margin-top:0 0 20px">Get AI-powered hints and feedback on your code</p>

      <div class="code-review-tip">
        💡 The code mentor gives you <strong>guided hints</strong>, not full solutions — helping you learn to debug and think independently.
      </div>

      <div class="card">
        <p class="card-title">Submit your code question</p>
        <p class="card-subtitle">Describe your bug, error, or what you're trying to implement</p>
        <textarea id="code-question" rows="4" placeholder="e.g. My binary search returns -1 even when the element exists. Here's my code: ..."></textarea>
        <div style="display:flex;justify-content:flex-end;margin-top:10px">
          <button id="code-ask-btn" class="button-accent">Get Code Hints</button>
        </div>
        <p class="error-text" id="code-error" style="display:none"></p>
      </div>

      <div class="card" style="margin-top:16px">
        <p class="card-title">Recent Code Reviews</p>
        <p class="card-subtitle">Your past code mentoring sessions</p>
        <div id="code-history-list">
          <p style="color:var(--text-muted);font-size:13px">Loading…</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById("code-ask-btn").addEventListener("click", async () => {
    const question = document.getElementById("code-question").value.trim();
    if (!question) return;
    const btn = document.getElementById("code-ask-btn");
    const errEl = document.getElementById("code-error");
    btn.disabled = true;
    btn.textContent = "Thinking…";
    errEl.style.display = "none";
    try {
      const session = await api.askMentor("code", question);
      navigate(`/mentor/${session.conversation_id}`);
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Get Code Hints";
    }
  });

  // Load code history
  api.mentorHistory("code").then(conversations => {
    const listEl = document.getElementById("code-history-list");
    if (!listEl) return;
    if (conversations.length === 0) {
      listEl.innerHTML = `<p style="color:var(--text-muted);font-size:13px">No code review sessions yet.</p>`;
      return;
    }
    listEl.innerHTML = conversations.slice(0, 6).map(c => `
      <div style="border-bottom:1px solid var(--border);padding:10px 0">
        <a href="#/mentor/${c.conversation_id}" style="text-decoration:none;color:inherit">
          <p style="font-size:13.5px;font-weight:500;margin:0 0 3px">${escapeHtml(c.title.length > 80 ? c.title.slice(0, 80) + "…" : c.title)}</p>
          <p style="font-size:12px;color:var(--text-muted);margin:0">${c.turn_count} message${c.turn_count !== 1 ? "s" : ""} · ${formatRelativeTime(c.updated_at)}</p>
        </a>
      </div>
    `).join("");
  }).catch(() => {});
}

// ---- History ----

async function renderHistoryPage(outlet) {
  let activeTab = "all";
  let searchQuery = "";
  let allConversations = [];

  outlet.innerHTML = `
    <div class="main">
      <h2 style="font-weight:700;margin-bottom:4px">History</h2>
      <p style="color:var(--text-muted);font-size:14px;margin-top:0;margin-bottom:20px">Browse your past chats, code reviews, and roadmaps</p>

      <div class="history-search-bar">
        <div class="history-search-icon">${ICONS.search}</div>
        <input id="history-search" placeholder="Search history..." />
      </div>

      <div class="history-tabs">
        <button class="history-tab active" data-tab="all">All</button>
        <button class="history-tab" data-tab="career">Chats</button>
        <button class="history-tab" data-tab="code">Reviews</button>
        <button class="history-tab" data-tab="academic">Academic</button>
      </div>

      <p class="error-text" id="history-error" style="display:none"></p>

      <div>
        <p class="history-section-label">Recent Activity</p>
        <div class="card" id="history-list">
          <p style="color:var(--text-muted);font-size:14px">Loading…</p>
        </div>
      </div>
    </div>
  `;

  // Tabs
  outlet.querySelectorAll(".history-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      outlet.querySelectorAll(".history-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeTab = tab.dataset.tab;
      paintList();
    });
  });

  // Search
  document.getElementById("history-search").addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase();
    paintList();
  });

  try {
    allConversations = await api.mentorHistory();
    paintList();
  } catch (e) {
    const errEl = document.getElementById("history-error");
    errEl.textContent = e.message;
    errEl.style.display = "block";
  }

  function paintList() {
    const listEl = document.getElementById("history-list");
    if (!listEl) return;

    let filtered = allConversations;
    if (activeTab !== "all") filtered = filtered.filter(c => c.mode === activeTab);
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchQuery) ||
        c.last_message.toLowerCase().includes(searchQuery)
      );
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `<p style="color:var(--text-muted);font-size:14px">No sessions found.</p>`;
      return;
    }

    listEl.innerHTML = filtered.map(c => `
      <div class="history-item" data-conversation-id="${c.conversation_id}">
        <button class="history-delete-btn" data-conversation-id="${c.conversation_id}" title="Delete" aria-label="Delete">
          ${ICONS.trash}
        </button>
        <a href="#/mentor/${c.conversation_id}" class="history-item-link">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span class="badge">${escapeHtml(c.mode)}</span>
            ${c.turn_count > 1 ? `<span class="badge badge-muted">${c.turn_count} msgs</span>` : ""}
            <span style="font-size:11px;color:var(--text-faint);margin-left:auto">${formatRelativeTime(c.updated_at)}</span>
          </div>
          <p class="history-item-title">${escapeHtml(c.title.length > 90 ? c.title.slice(0, 90) + "…" : c.title)}</p>
          <p class="history-item-preview">${escapeHtml(c.last_message)}</p>
        </a>
      </div>
    `).join("");

    listEl.querySelectorAll(".history-delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => handleDelete(e, btn.dataset.conversationId));
    });
  }

  async function handleDelete(e, conversationId) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this conversation? This can't be undone.")) return;

    const errEl = document.getElementById("history-error");
    errEl.style.display = "none";

    const itemEl = document.querySelector(`.history-item[data-conversation-id="${conversationId}"]`);
    if (itemEl) itemEl.style.opacity = "0.5";

    const numericId = Number(conversationId);
    if (!Number.isFinite(numericId)) {
      errEl.textContent = "Invalid conversation id";
      errEl.style.display = "block";
      if (itemEl) itemEl.style.opacity = "1";
      return;
    }

    try {
      await api.deleteConversation(numericId);
      allConversations = await api.mentorHistory();
      paintList();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
      if (itemEl) itemEl.style.opacity = "1";
    }
  }
}

// ---- Resources ----

// Icons cycle for whatever resources come back — the LLM doesn't pick these,
// they're just visual variety since resource names vary per user/goal.
const RESOURCE_ICONS = ["📖", "🎯", "🎓", "💡", "🚀", "🧠", "🔧", "📊"];

async function renderResourcesPage(outlet) {
  outlet.innerHTML = `
    <div class="main">
      <h2 style="font-weight:700;margin-bottom:4px">Resources</h2>
      <p style="color:var(--text-muted);font-size:14px;margin-top:0;margin-bottom:4px" id="resources-subtitle">Loading personalized resources…</p>
      <p style="color:var(--text-faint);font-size:12px;margin-top:0;margin-bottom:20px">
        ✨ AI-curated based on your goal — not live web search results.
      </p>

      <div id="resources-body">
        <p style="color:var(--text-muted);font-size:14px">Loading…</p>
      </div>

      <div class="card" style="margin-top:20px">
        <p class="card-title">Ask for more</p>
        <p class="card-subtitle">Chat with your AI mentor for resources tailored to a specific question</p>
        <div style="display:flex;gap:8px">
          <a href="#/mentor"><button class="button-accent">Ask AI Mentor</button></a>
          <a href="#/roadmap"><button class="button-secondary">View Roadmap</button></a>
        </div>
      </div>
    </div>
  `;

  const subtitleEl = document.getElementById("resources-subtitle");
  const bodyEl = document.getElementById("resources-body");

  try {
    const data = await api.getGoalResources();
    const resources = data.resources || [];

    subtitleEl.textContent = data.goal
      ? `Curated for your goal: "${data.goal}"`
      : "Set a goal (via AI Mentor or your Profile) to get resources tailored to you";

    bodyEl.innerHTML = resources.length === 0
      ? `<p style="color:var(--text-muted);font-size:14px">No resources yet — ask the AI Mentor a question to get started.</p>`
      : `<div class="resources-grid">
          ${resources.map((r, i) => `
            <div class="resource-card">
              <div class="resource-icon">${RESOURCE_ICONS[i % RESOURCE_ICONS.length]}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <p class="resource-name" style="margin:0">${escapeHtml(r.name)}</p>
                <span class="badge ${r.tag === "Paid" ? "badge-orange" : "badge-green"}" style="font-size:10px">${escapeHtml(r.tag || "Free")}</span>
              </div>
              <p class="resource-desc">${escapeHtml(r.desc || "")}</p>
            </div>
          `).join("")}
        </div>`;
  } catch (e) {
    subtitleEl.textContent = "";
    bodyEl.innerHTML = `<p class="error-text">${escapeHtml(e.message)}</p>`;
  }
}

// ---- Achievements ----

async function renderAchievementsPage(outlet) {
  outlet.innerHTML = `
    <div class="main">
      <h2 style="font-weight:700;margin-bottom:4px">Achievements</h2>
      <p style="color:var(--text-muted);font-size:14px;margin-top:0;margin-bottom:24px">Track your milestones and badges</p>
      <div id="achievements-body">
        <p style="color:var(--text-muted)">Loading…</p>
      </div>
    </div>
  `;

  try {
    const data = await api.progressStats();
    const xp = data.total_xp || 0;
    const streak = data.day_streak || 0;

    const ACHIEVEMENTS = [
      { icon: "🚀", name: "First Session", desc: "Complete your first mentor session", earned: xp >= 10 },
      { icon: "⭐", name: "Rising Star", desc: "Earn 50+ XP", earned: xp >= 50 },
      { icon: "💎", name: "Dedicated", desc: "Earn 100+ XP", earned: xp >= 100 },
      { icon: "🔥", name: "3-Day Streak", desc: "Study 3 days in a row", earned: streak >= 3 },
      { icon: "⚡", name: "Week Warrior", desc: "Study 7 days in a row", earned: streak >= 7 },
      { icon: "🎯", name: "Goal Setter", desc: "Set a career goal in your profile", earned: false },
      { icon: "🗺️", name: "Road Mapper", desc: "Create your first career roadmap", earned: false },
      { icon: "💻", name: "Code Reviewer", desc: "Complete a code review session", earned: false },
      { icon: "📝", name: "Resume Ready", desc: "Get your resume reviewed by AI", earned: false },
    ];

    const body = document.getElementById("achievements-body");
    const earned = ACHIEVEMENTS.filter(a => a.earned);
    const locked = ACHIEVEMENTS.filter(a => !a.earned);

    body.innerHTML = `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="background:var(--accent-soft-bg);border-radius:12px;padding:12px 20px;display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">🏆</span>
            <div>
              <p style="font-size:22px;font-weight:700;margin:0;color:var(--accent)">${earned.length}</p>
              <p style="font-size:12px;color:var(--text-muted);margin:0">Badges earned</p>
            </div>
          </div>
          <div style="background:var(--stat-bg);border-radius:12px;padding:12px 20px;display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">⚡</span>
            <div>
              <p style="font-size:22px;font-weight:700;margin:0">${xp}</p>
              <p style="font-size:12px;color:var(--text-muted);margin:0">Total XP</p>
            </div>
          </div>
          <div style="background:var(--stat-bg);border-radius:12px;padding:12px 20px;display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">🔥</span>
            <div>
              <p style="font-size:22px;font-weight:700;margin:0">${streak}</p>
              <p style="font-size:12px;color:var(--text-muted);margin:0">Day streak</p>
            </div>
          </div>
        </div>
      </div>

      ${earned.length > 0 ? `
        <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-faint);margin-bottom:12px">Earned</p>
        <div class="achievements-grid" style="margin-bottom:28px">
          ${earned.map(a => `
            <div class="achievement-card">
              <div class="achievement-icon">${a.icon}</div>
              <p class="achievement-name">${escapeHtml(a.name)}</p>
              <p class="achievement-desc">${escapeHtml(a.desc)}</p>
            </div>
          `).join("")}
        </div>
      ` : ""}

      <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-faint);margin-bottom:12px">Locked</p>
      <div class="achievements-grid">
        ${locked.map(a => `
          <div class="achievement-card locked">
            <div class="achievement-icon">${a.icon}</div>
            <p class="achievement-name">${escapeHtml(a.name)}</p>
            <p class="achievement-desc">${escapeHtml(a.desc)}</p>
          </div>
        `).join("")}
      </div>
    `;
  } catch (e) {
    document.getElementById("achievements-body").innerHTML = `<p class="error-text">${escapeHtml(e.message)}</p>`;
  }
}

// ---- Settings ----

function renderSettingsPage(outlet) {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const user = auth.getUser();

  outlet.innerHTML = `
    <div class="main">
      <h2 style="font-weight:700;margin-bottom:4px">Settings</h2>
      <p style="color:var(--text-muted);font-size:14px;margin-top:0;margin-bottom:24px">Manage your preferences and account</p>

      <div class="settings-section">
        <p class="settings-section-title">Appearance</p>
        <div class="settings-row">
          <div>
            <p class="settings-row-label">Dark Mode</p>
            <p class="settings-row-sub">Switch between light and dark theme</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="dark-mode-toggle" ${isDark ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <p class="settings-section-title">Account</p>
        <div class="settings-row">
          <div>
            <p class="settings-row-label">Name</p>
            <p class="settings-row-sub">${escapeHtml(user ? user.name : "–")}</p>
          </div>
          <a href="#/profile"><button class="button-secondary" style="font-size:12px;padding:6px 12px">Edit Profile</button></a>
        </div>
        <div class="settings-row">
          <div>
            <p class="settings-row-label">Email</p>
            <p class="settings-row-sub">${escapeHtml(user ? user.email : "–")}</p>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <p class="settings-section-title">About</p>
        <div class="settings-row">
          <div>
            <p class="settings-row-label">MentorAI Version</p>
            <p class="settings-row-sub">v2.0.0 — AI-powered student mentor platform</p>
          </div>
        </div>
      </div>

      <div style="margin-top:8px">
        <button id="settings-logout-btn" style="background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger);padding:10px 20px;border-radius:8px">
          Sign Out
        </button>
      </div>
    </div>
  `;

  document.getElementById("dark-mode-toggle").addEventListener("change", (e) => {
    const theme = e.target.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mentorai_theme", theme);
  });

  document.getElementById("settings-logout-btn").addEventListener("click", () => {
    auth.logout();
    navigate("/login");
  });
}

// ---- Mentor ----

function renderMentorPage(outlet, conversationId) {
  if (conversationId) renderMentorThread(outlet, conversationId);
  else renderNewMentorChat(outlet);
}

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
        <h2 style="font-weight:700;margin-bottom:4px">AI Mentor</h2>
        <p style="color:var(--text-muted);font-size:14px;margin-top:0;margin-bottom:20px">Get personalized guidance from your AI mentor</p>

        <div class="mode-grid">
          ${MODES.map(m_ => `
            <button data-mode="${m_.id}" class="mode-card ${mode === m_.id ? "selected" : ""}" style="background:var(--card-bg);color:inherit">
              <p class="mode-title">${m_.title}</p>
              <p class="mode-desc">${m_.desc}</p>
            </button>
          `).join("")}
        </div>

        <div class="card">
          <textarea id="mentor-question" rows="3" placeholder="${escapeHtml(placeholderFor(mode))}"></textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:8px">
            <button id="mentor-ask-btn" class="button-accent">Ask</button>
          </div>
          <p class="error-text" id="mentor-error" style="display:none"></p>
        </div>
      </div>
    `;

    outlet.querySelectorAll(".mode-card").forEach(btn => {
      btn.addEventListener("click", () => { mode = btn.dataset.mode; paint(); });
    });
    document.getElementById("mentor-ask-btn").addEventListener("click", handleAsk);
  }

  async function handleAsk() {
    const question = document.getElementById("mentor-question").value.trim();
    if (!question) return;
    const btn = document.getElementById("mentor-ask-btn");
    const errEl = document.getElementById("mentor-error");
    errEl.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Thinking…";
    try {
      const session = await api.askMentor(mode, question);
      navigate(`/mentor/${session.conversation_id}`);
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Ask";
    }
  }

  paint();
}

async function renderMentorThread(outlet, conversationId) {
  outlet.innerHTML = `
    <div class="main">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h2 style="font-weight:700;margin:0">Conversation</h2>
        <a href="#/mentor"><button class="button-secondary">New chat</button></a>
      </div>
      <p class="error-text" id="thread-error" style="display:none"></p>
      <div id="thread-messages"><p style="color:var(--text-muted);font-size:14px">Loading…</p></div>
      <div class="card" id="thread-reply-card" style="display:none">
        <textarea id="thread-reply" rows="2" placeholder="Continue the conversation…"></textarea>
        <div style="display:flex;justify-content:flex-end;margin-top:8px">
          <button id="thread-reply-btn" class="button-accent">Send</button>
        </div>
      </div>
    </div>
  `;

  let turns = [];
  try {
    turns = await api.getConversation(conversationId);
  } catch (e) {
    document.getElementById("thread-error").textContent = e.message;
    document.getElementById("thread-error").style.display = "block";
    return;
  }

  paintThread();
  document.getElementById("thread-reply-card").style.display = "block";
  document.getElementById("thread-reply-btn").addEventListener("click", handleReply);
  document.getElementById("thread-reply").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); }
  });

  function paintThread() {
    const messagesEl = document.getElementById("thread-messages");
    messagesEl.innerHTML = turns.map((t, idx) => renderTurn(t, idx === turns.length - 1)).join("");
    const lastTurn = turns[turns.length - 1];
    if (lastTurn && lastTurn.mode === "career") renderCareerActions(lastTurn, `career-actions-${lastTurn.id}`);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderTurn(t, isLast) {
    const steps = t.steps || [];
    const resources = t.resources || [];
    return `
      <div class="chat-turn">
        <div class="chat-bubble chat-bubble-user">
          <p style="margin:0;font-size:14px;white-space:pre-wrap">${escapeHtml(t.question)}</p>
        </div>
        <div class="chat-bubble chat-bubble-assistant">
          <span class="badge">${escapeHtml(t.mode)}</span>
          <p style="font-weight:500;margin:8px 0 4px">Summary</p>
          <p style="font-size:14px;color:var(--text);margin:0 0 12px">${escapeHtml(t.summary)}</p>
          ${steps.length > 0 ? `
            <p style="font-weight:500;margin:0 0 8px">Steps</p>
            ${steps.map((s, i) => `<div class="step-row"><span class="step-num">${i + 1}</span><span>${escapeHtml(s)}</span></div>`).join("")}
          ` : ""}
          ${resources.length > 0 ? `
            <p style="font-weight:500;margin:12px 0 8px">Look into</p>
            <ul style="margin:0;padding-left:18px;font-size:14px">
              ${resources.map(r => `<li>${escapeHtml(r)}</li>`).join("")}
            </ul>
          ` : ""}
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
    const errEl = document.getElementById("thread-error");
    errEl.style.display = "none";
    btn.disabled = true;
    textarea.disabled = true;
    btn.textContent = "Thinking…";
    try {
      const newTurn = await api.askMentor(null, question, conversationId);
      turns.push(newTurn);
      textarea.value = "";
      paintThread();
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = "block";
    } finally {
      btn.disabled = false;
      textarea.disabled = false;
      btn.textContent = "Send";
      document.getElementById("thread-reply")?.focus();
    }
  }
}

function renderCareerActions(turn, elementId) {
  // Only the role/job title should ever become the goal (e.g. "Data Scientist"),
  // never the raw question text — otherwise asking things like "I'm struggling
  // with recursion" would set THAT sentence as the goal. role_title comes from
  // the mentor LLM (see ROLE_TITLE_INSTRUCTION in backend/llm.js) and is empty
  // when no clear role could be identified from the conversation yet.
  const roleTitle = (turn.role_title || "").trim();
  const goalText = roleTitle; // no raw-question fallback — see note above
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
        ${roadmapSaved
          ? `<p class="success-text">Roadmap generated — view it on your <a href="#/roadmap">Career Roadmap</a> page.</p>`
          : goalSet
          ? `<p class="success-text" style="margin:0 0 10px">Goal set ✓ — "${escapeHtml(goalText)}"</p>
             <button id="generate-roadmap-btn" type="button" class="button-accent" ${generatingRoadmap ? "disabled" : ""}>
               ${generatingRoadmap ? "Generating roadmap…" : "Generate roadmap"}
             </button>`
          : goalText
          ? `<button id="set-goal-btn" type="button" class="button-secondary" ${settingGoal ? "disabled" : ""}>
               ${settingGoal ? "Setting…" : `Set "${escapeHtml(goalText)}" as goal`}
             </button>`
          : `<p style="color:var(--text-faint);font-size:12px;margin:0">Keep chatting — once a clear role comes up, you'll be able to set it as your goal here.</p>`
        }
      </div>
    `;
    document.getElementById("set-goal-btn")?.addEventListener("click", handleSetGoal);
    document.getElementById("generate-roadmap-btn")?.addEventListener("click", handleGenerateRoadmap);
  }

  async function handleSetGoal() {
    settingGoal = true; actionError = ""; paintActions();
    try {
      const currentUser = auth.getUser();
      const data = await api.updateProfile(goalText, currentUser.career_roadmap || "");
      auth.updateUser(data.user);
      goalSet = true;
    } catch (e) { actionError = e.message; }
    finally { settingGoal = false; paintActions(); }
  }

  async function handleGenerateRoadmap() {
    generatingRoadmap = true; actionError = ""; paintActions();
    try {
      // Creates a REAL structured roadmap (steps you can check off, tracked
      // on the Career Roadmap page) via /roadmap/create — the same endpoint
      // the Career Roadmap page itself uses. Both paths now lead to one
      // consistent roadmap system, and the backend keeps the profile's
      // goal/career_roadmap text fields in sync automatically.
      const roadmap = await api.createRoadmap(goalText, goalText);
      auth.updateUser({
        ...auth.getUser(),
        goal: goalText,
        career_roadmap: roadmap.steps.map((s) => s.label).join(" -> "),
      });
      roadmapSaved = true;
    } catch (e) { actionError = e.message; }
    finally { generatingRoadmap = false; paintActions(); }
  }

  paintActions();
}

// ---- Progress ----

function progressStatCard(icon, value, label, colorClass) {
  return `
    <div class="progress-stat-card">
      <div class="progress-stat-icon ${colorClass}">${icon}</div>
      <div>
        <p class="progress-stat-value">${escapeHtml(String(value))}</p>
        <p class="progress-stat-label">${escapeHtml(label)}</p>
      </div>
    </div>
  `;
}

function barChartHtml(days) {
  const max = Math.max(1, ...days.map(d => d.hours));
  return `
    <div class="bar-chart">
      ${days.map(d => `
        <div class="bar-col">
          <div class="bar-track">
            <div class="bar-fill" style="height:${Math.max(4, (d.hours / max) * 100)}%"></div>
          </div>
          <span class="bar-label">${escapeHtml(d.day)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function radarChartSvg(skills, size = 240) {
  const center = size / 2;
  const maxR = center - 40;
  const n = skills.length;
  const angleFor = i => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointAt = (i, value) => {
    const r = (value / 100) * maxR;
    const a = angleFor(i);
    return [center + r * Math.cos(a), center + r * Math.sin(a)];
  };

  let gridRings = "";
  for (let lvl = 1; lvl <= 4; lvl++) {
    const r = (maxR * lvl) / 4;
    const pts = skills.map((_, i) => {
      const a = angleFor(i);
      return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`;
    }).join(" ");
    gridRings += `<polygon points="${pts}" class="radar-grid" />`;
  }

  const axisLines = skills.map((_, i) => {
    const [x, y] = pointAt(i, 100);
    return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="radar-axis" />`;
  }).join("");

  const dataPts = skills.map((s, i) => pointAt(i, s.value).join(",")).join(" ");
  const labels = skills.map((s, i) => {
    const [x, y] = pointAt(i, 122);
    return `<text x="${x}" y="${y}" class="radar-label" text-anchor="middle" dominant-baseline="middle">${escapeHtml(s.label)}</text>`;
  }).join("");

  return `
    <svg viewBox="0 0 ${size} ${size}" class="radar-svg">
      ${gridRings}${axisLines}
      <polygon points="${dataPts}" class="radar-data" />
      ${labels}
    </svg>
  `;
}

function topicRow(label, value) {
  return `
    <div class="topic-row">
      <div class="topic-row-header"><span>${escapeHtml(label)}</span><span>${value}%</span></div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${value}%"></div>
      </div>
    </div>
  `;
}

function roadmapStep(label, status) {
  const icon = status === "done" ? "✓" : status === "current" ? "●" : "○";
  return `
    <div class="roadmap-step roadmap-step-${status}">
      <span class="roadmap-step-icon">${icon}</span>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

async function renderProgressPage(outlet) {
  outlet.innerHTML = `
    <div class="main">
      <h2 style="font-weight:700;margin-bottom:2px">Your Progress</h2>
      <p style="color:var(--text-muted);font-size:14px;margin-top:0">Track your learning journey and achievements</p>
      <p class="error-text" id="progress-error" style="display:none"></p>
      <div id="progress-body"><p style="color:var(--text-muted);font-size:14px">Loading…</p></div>
    </div>
  `;

  try {
    const data = await api.progressStats();
    const body = document.getElementById("progress-body");
    body.innerHTML = `
      <div class="progress-stat-grid">
        ${progressStatCard("🔥", data.day_streak, "Day Streak", "icon-orange")}
        ${progressStatCard("⏱️", `${data.hours_this_week}h`, "This Week", "icon-blue")}
        ${progressStatCard("⚡", data.total_xp, "Total XP", "icon-purple")}
        ${progressStatCard("⭐", data.level, "Current Level", "icon-green")}
      </div>

      <div class="progress-charts-grid">
        <div class="card">
          <p class="card-title">Study Hours</p>
          <p class="card-subtitle">Your learning activity over time</p>
          ${barChartHtml(data.study_hours)}
        </div>
        <div class="card" style="display:flex;flex-direction:column;align-items:center">
          <p class="card-title" style="align-self:flex-start">Skills Radar</p>
          <p class="card-subtitle" style="align-self:flex-start">Your competency across areas</p>
          ${radarChartSvg(data.skills)}
        </div>
      </div>

      <div class="progress-lower-grid">
        <div class="card">
          <p class="card-title">Topic Progress</p>
          <p class="card-subtitle">Your learning progress by topic</p>
          ${data.topics.map(t => topicRow(t.label, t.value)).join("")}
        </div>
        <div class="card">
          <p class="card-title">Current Roadmap</p>
          ${data.roadmap.steps.length === 0 ? `
            <p class="card-subtitle">No roadmap created yet</p>
            <div style="text-align:center;padding:20px 0">
              <div style="font-size:32px;margin-bottom:10px">🗺️</div>
              <p style="font-size:13px;color:var(--text-muted);margin:0 0 14px">
                Create a career roadmap to track your learning path here.
              </p>
              <a href="#/roadmap"><button class="button-accent" style="font-size:13px;padding:7px 18px">Create Roadmap</button></a>
            </div>
          ` : `
            <p class="card-subtitle">Overall Progress — ${data.roadmap.overall_percent}%</p>
            <div class="progress-bar-track" style="margin-bottom:16px">
              <div class="progress-bar-fill" style="width:${data.roadmap.overall_percent}%"></div>
            </div>
            ${data.roadmap.steps.map(s => roadmapStep(s.label, s.status)).join("")}
          `}
        </div>
      </div>
    `;
  } catch (e) {
    document.getElementById("progress-error").textContent = e.message;
    document.getElementById("progress-error").style.display = "block";
    document.getElementById("progress-body").innerHTML = "";
  }
}

// ---- Resume ----

function renderResumePage(outlet) {
  let file = null;

  outlet.innerHTML = `
    <div class="main">
      <h2 style="font-weight:700;margin-bottom:4px">Resume Review</h2>
      <p style="color:var(--text-muted);font-size:14px;margin-top:0;margin-bottom:20px">Get AI-powered feedback on your resume</p>
      <div class="card">
        <div class="field">
          <label>Target role (optional)</label>
          <input id="resume-role" placeholder="e.g. SDE, Data Analyst, AI Engineer" />
        </div>
        <div class="field">
          <label>Resume file (PDF or text)</label>
          <input id="resume-file" type="file" accept=".pdf,.txt" />
        </div>
        <button id="resume-analyze-btn" class="button-accent" disabled>Analyze resume</button>
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

  analyzeBtn.addEventListener("click", async () => {
    if (!file) return;
    const targetRole = document.getElementById("resume-role").value;
    const errEl = document.getElementById("resume-error");
    errEl.style.display = "none";
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing…";
    try {
      const result = await api.analyzeResume(file, targetRole);
      renderResult(result);
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = "block";
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = "Analyze resume";
    }
  });

  function renderResult(result) {
    const resultEl = document.getElementById("resume-result");
    const missingSkills = result.missing_skills || [];
    const suggestions = result.suggestions || [];
    resultEl.innerHTML = `
      <div style="border-top:1px solid var(--border);margin-top:16px;padding-top:16px">
        <div class="stat-grid" style="grid-template-columns:1fr">
          <div class="stat-card">
            <p class="stat-label">Readiness score</p>
            <p class="stat-value">${result.score}/100</p>
          </div>
        </div>
        ${missingSkills.length > 0 ? `
          <p style="font-weight:500;margin:0 0 8px">Missing skills</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
            ${missingSkills.map(s => `<span class="badge">${escapeHtml(s)}</span>`).join("")}
          </div>
        ` : ""}
        ${suggestions.length > 0 ? `
          <p style="font-weight:500;margin:0 0 8px">Suggestions</p>
          ${suggestions.map((s, i) => `
            <div class="step-row">
              <span class="step-num">${i + 1}</span>
              <span>${escapeHtml(s)}</span>
            </div>
          `).join("")}
        ` : ""}
      </div>
    `;
  }
}

// ---- Profile ----

function renderProfilePage(outlet) {
  let user = auth.getUser();
  let editing = false;
  let saving = false;
  let error = "";

  function initials(name) {
    return (name || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "?";
  }

  // Splits the plain "Step 1 -> Step 2 -> Step 3" text into an array of
  // trimmed step labels. Accepts both "->" and the unicode arrow "→".
  function parseRoadmapSteps(text) {
    return (text || "")
      .split(/->|→/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Renders the career roadmap as a winding "road" with a numbered stop at
  // each milestone, instead of a flat text string.
  function renderRoadmapRoad(steps) {
    if (steps.length === 0) return "";

    const stepW = 170;
    const width = Math.max(640, stepW * steps.length + 80);
    // Height must fit both the "above" labels (odd steps) and the "below"
    // labels (even steps). 220 was too short for the below-labels, which
    // pushed them past the bottom of the viewBox and made them invisible.
    const height = 300;
    const midY = height / 2;
    const amp = 60;
    const startX = 70;

    const points = steps.map((label, i) => ({
      x: startX + i * stepW,
      y: i % 2 === 0 ? midY - amp : midY + amp,
      label,
    }));

    // Build a smooth wavy road through all points using cubic beziers.
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      path += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const markers = points
      .map((p, i) => {
        // Below-labels used a +60 offset which, combined with the old
        // height of 220, put them past the bottom edge of the SVG (clipped
        // and invisible). +40 keeps the label (40px tall) fully inside the
        // now-taller viewBox with room to spare.
        const labelY = p.y === midY - amp ? p.y - 44 : p.y + 40;
        return `
          <g class="road-marker">
            <circle cx="${p.x}" cy="${p.y}" r="22" style="fill:var(--accent);stroke:var(--card-bg);stroke-width:4" />
            <text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central" style="fill:var(--button-text,#fff);font-size:15px;font-weight:700">${i + 1}</text>
            <foreignObject x="${p.x - 70}" y="${labelY}" width="140" height="40">
              <div xmlns="http://www.w3.org/1999/xhtml" title="${escapeHtml(p.label)}"
                   style="font-size:12px;line-height:1.3;text-align:center;color:var(--text);font-family:inherit;
                          overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                ${escapeHtml(p.label)}
              </div>
            </foreignObject>
          </g>
        `;
      })
      .join("");

    return `
      <div style="overflow-x:auto;overflow-y:hidden;margin:8px 0 4px;-webkit-overflow-scrolling:touch">
        <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block;min-width:${width}px">
          <path d="${path}" fill="none" style="stroke:var(--border);stroke-width:14;stroke-linecap:round" />
          <path d="${path}" fill="none" style="stroke:var(--accent);stroke-width:3;stroke-dasharray:2 10;stroke-linecap:round;opacity:0.6" />
          ${markers}
        </svg>
      </div>
    `;
  }

  function fieldView(label, value, placeholder) {
    return `
      <div class="profile-field">
        <p class="profile-label">${escapeHtml(label)}</p>
        ${value
          ? `<p class="profile-value">${escapeHtml(value)}</p>`
          : `<p class="profile-value empty">${escapeHtml(placeholder)}</p>`
        }
      </div>
    `;
  }

  function paint() {
    outlet.innerHTML = `
      <div class="main">
        <h2 style="font-weight:700;margin-bottom:4px">Profile</h2>
        <div class="card profile-page-card">
          <div class="profile-avatar profile-avatar-lg">${escapeHtml(initials(user.name))}</div>
          ${!editing ? `
            <p class="profile-name-lg">${escapeHtml(user.name)}</p>
            <p class="profile-email-lg">${escapeHtml(user.email)}</p>
            ${fieldView("Goal", user.goal, "No goal set yet")}
            <div class="profile-field">
              <p class="profile-label">Career roadmap</p>
              ${user.career_roadmap
                ? renderRoadmapRoad(parseRoadmapSteps(user.career_roadmap))
                : `<p class="profile-value empty">No roadmap set yet</p>`
              }
            </div>
            <button id="profile-edit-btn" class="button-secondary" type="button">Edit profile</button>
          ` : `
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
            <div style="display:flex;gap:8px">
              <button id="profile-save-btn" class="button-accent" type="button" ${saving ? "disabled" : ""}>${saving ? "Saving…" : "Save"}</button>
              <button id="profile-cancel-btn" class="button-secondary" type="button" ${saving ? "disabled" : ""}>Cancel</button>
            </div>
          `}
        </div>
      </div>
    `;

    document.getElementById("profile-edit-btn")?.addEventListener("click", () => { editing = true; error = ""; paint(); });
    document.getElementById("profile-cancel-btn")?.addEventListener("click", () => { editing = false; error = ""; paint(); });
    document.getElementById("profile-save-btn")?.addEventListener("click", handleSave);
  }

  async function handleSave() {
    const goal = document.getElementById("profile-goal-input").value.trim();
    const roadmap = document.getElementById("profile-roadmap-input").value.trim();
    saving = true; error = ""; paint();
    try {
      const data = await api.updateProfile(goal, roadmap);
      user = data.user;
      auth.updateUser(user);
      editing = false;
    } catch (e) { error = e.message; }
    finally { saving = false; paint(); }
  }

  paint();
}