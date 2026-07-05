// db.js — JSON-file persistence. Same data shape as original, with roadmap support added.

const fs = require("fs");
const path = require("path");
require("dotenv").config();

const DATA_FILE = path.join(__dirname, process.env.DATABASE_FILE || "mentorai.db.json");

function nowIso() {
  return new Date().toISOString();
}

function load() {
  const defaultState = () => ({
    users: [],
    mentorSessions: [],
    resumeReviews: [],
    roadmaps: [],
    nextId: { users: 1, mentorSessions: 1, resumeReviews: 1, roadmaps: 1 },
  });

  if (!fs.existsSync(DATA_FILE)) {
    return defaultState();
  }

  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt JSON — start fresh rather than crashing
    return defaultState();
  }

  // Defensive migration: patch missing fields without touching existing data.
  // Each guard is independent so a partially-migrated file is handled correctly.
  if (!Array.isArray(parsed.users)) parsed.users = [];
  if (!Array.isArray(parsed.mentorSessions)) parsed.mentorSessions = [];
  if (!Array.isArray(parsed.resumeReviews)) parsed.resumeReviews = [];
  if (!Array.isArray(parsed.roadmaps)) parsed.roadmaps = [];

  if (!parsed.nextId || typeof parsed.nextId !== "object") {
    parsed.nextId = { users: 1, mentorSessions: 1, resumeReviews: 1, roadmaps: 1 };
  } else {
    if (!parsed.nextId.users) parsed.nextId.users = 1;
    if (!parsed.nextId.mentorSessions) parsed.nextId.mentorSessions = 1;
    if (!parsed.nextId.resumeReviews) parsed.nextId.resumeReviews = 1;
    if (!parsed.nextId.roadmaps) parsed.nextId.roadmaps = 1;
  }

  return parsed;
}

function save(state) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

let state = load();

// ---- migration: backfill conversation_id ----
function migrateMissingConversationIds() {
  let changed = false;
  for (const s of state.mentorSessions) {
    if (s.conversation_id === undefined || s.conversation_id === null) {
      s.conversation_id = s.id;
      changed = true;
    }
  }
  if (changed) save(state);
}
migrateMissingConversationIds();

function nextId(collection) {
  const id = state.nextId[collection]++;
  save(state);
  return id;
}

// ---- users ----

function findUserByEmail(email) {
  return state.users.find((u) => u.email === email) || null;
}

function findUserById(id) {
  return state.users.find((u) => u.id === id) || null;
}

function createUser({ name, email, passwordHash }) {
  const user = {
    id: nextId("users"),
    name,
    email,
    password_hash: passwordHash,
    goal: "",
    career_roadmap: "",
    created_at: nowIso(),
  };
  state.users.push(user);
  save(state);
  return user;
}

function updateUserProfile(userId, { goal, careerRoadmap }) {
  const user = findUserById(userId);
  if (!user) return null;
  if (goal !== undefined) user.goal = goal;
  if (careerRoadmap !== undefined) user.career_roadmap = careerRoadmap;
  save(state);
  return user;
}

function userToDict(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    goal: user.goal || "",
    career_roadmap: user.career_roadmap || "",
  };
}

// ---- mentor sessions ----

function createMentorSession({ userId, mode, question, summary, steps, resources, conversationId }) {
  const id = nextId("mentorSessions");
  const session = {
    id,
    conversation_id: conversationId || id,
    user_id: userId,
    mode,
    question,
    summary: summary || "",
    steps: steps || [],
    resources: resources || [],
    created_at: nowIso(),
  };
  state.mentorSessions.push(session);
  save(state);
  return session;
}

function listMentorSessions(userId, mode) {
  let rows = state.mentorSessions.filter((s) => s.user_id === userId);
  if (mode) rows = rows.filter((s) => s.mode === mode);
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 50);
}

function deleteConversation(userId, conversationId) {
  const before = state.mentorSessions.length;
  state.mentorSessions = state.mentorSessions.filter(
    (s) => !(s.conversation_id === conversationId && s.user_id === userId)
  );
  const deleted = state.mentorSessions.length < before;
  if (deleted) save(state);
  return deleted;
}

function listConversations(userId, mode) {
  let rows = state.mentorSessions.filter((s) => s.user_id === userId);
  if (mode) rows = rows.filter((s) => s.mode === mode);

  const byConversation = new Map();
  for (const s of rows) {
    if (!byConversation.has(s.conversation_id)) byConversation.set(s.conversation_id, []);
    byConversation.get(s.conversation_id).push(s);
  }

  const conversations = [];
  for (const [conversationId, turns] of byConversation) {
    turns.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    const first = turns[0];
    const last = turns[turns.length - 1];
    conversations.push({
      conversation_id: conversationId,
      mode: first.mode,
      title: first.question,
      last_message: last.summary,
      turn_count: turns.length,
      created_at: first.created_at,
      updated_at: last.created_at,
    });
  }

  return conversations.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)).slice(0, 50);
}

function getConversationTurns(userId, conversationId) {
  const rows = state.mentorSessions.filter(
    (s) => s.conversation_id === conversationId && s.user_id === userId
  );
  if (rows.length === 0) return null;
  return rows.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

function sessionToDict(s) {
  return {
    id: s.id,
    conversation_id: s.conversation_id,
    mode: s.mode,
    question: s.question,
    summary: s.summary,
    steps: s.steps,
    resources: s.resources,
    created_at: s.created_at,
  };
}

// ---- resume reviews ----

function createResumeReview({ userId, targetRole, score, missingSkills, suggestions }) {
  const review = {
    id: nextId("resumeReviews"),
    user_id: userId,
    target_role: targetRole || "",
    score: score || 0,
    missing_skills: missingSkills || [],
    suggestions: suggestions || [],
    created_at: nowIso(),
  };
  state.resumeReviews.push(review);
  save(state);
  return review;
}

function listResumeReviews(userId) {
  return state.resumeReviews
    .filter((r) => r.user_id === userId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 20);
}

function reviewToDict(r) {
  return {
    id: r.id,
    target_role: r.target_role,
    score: r.score,
    missing_skills: r.missing_skills,
    suggestions: r.suggestions,
    created_at: r.created_at,
  };
}

// ---- roadmaps ----
// Each roadmap has a title (e.g. "Software Engineer"), a goal string, and an
// ordered array of steps. Each step has { label, subtopics (count), completed }.

function createRoadmap(userId, { title, goal, steps }) {
  const id = nextId("roadmaps");
  const roadmap = {
    id,
    user_id: userId,
    title: title || goal || "My Roadmap",
    goal: goal || "",
    steps: (steps || []).map((label, idx) => ({
      idx,
      label,
      subtopics: Math.floor(Math.random() * 8) + 3, // decorative count
      completed: false,
    })),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  state.roadmaps.push(roadmap);
  save(state);
  return roadmap;
}

function listRoadmaps(userId) {
  return state.roadmaps
    .filter((r) => r.user_id === userId)
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

function getRoadmap(userId, roadmapId) {
  return state.roadmaps.find((r) => r.id === roadmapId && r.user_id === userId) || null;
}

function updateRoadmapStep(userId, roadmapId, stepIdx, completed) {
  const roadmap = getRoadmap(userId, roadmapId);
  if (!roadmap) return null;
  const step = roadmap.steps[stepIdx];
  if (!step) return null;
  step.completed = completed;
  roadmap.updated_at = nowIso();
  save(state);
  return roadmap;
}

function deleteRoadmap(userId, roadmapId) {
  const before = state.roadmaps.length;
  state.roadmaps = state.roadmaps.filter(
    (r) => !(r.id === roadmapId && r.user_id === userId)
  );
  const deleted = state.roadmaps.length < before;
  if (deleted) save(state);
  return deleted;
}

function roadmapToDict(r) {
  const total = r.steps.length;
  const done = r.steps.filter((s) => s.completed).length;
  const overallPercent = total > 0 ? Math.round((done / total) * 100) : 0;
  return {
    id: r.id,
    title: r.title,
    goal: r.goal,
    steps: r.steps,
    overall_percent: overallPercent,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

// ---- dashboard aggregates ----

function dashboardStats(userId) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const allSessions = state.mentorSessions.filter((s) => s.user_id === userId);
  const sessionsThisWeek = allSessions.filter((s) => new Date(s.created_at).getTime() >= weekAgo).length;
  const topicsCovered = new Set(allSessions.map((s) => s.mode)).size;
  const reviews = state.resumeReviews
    .filter((r) => r.user_id === userId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const latestResumeScore = reviews.length > 0 ? reviews[0].score : null;

  return {
    sessions_this_week: sessionsThisWeek,
    total_sessions: allSessions.length,
    topics_covered: topicsCovered,
    latest_resume_score: latestResumeScore,
  };
}

// ---- progress page aggregates ----

const TOPIC_KEYWORDS = [
  { label: "Data Structures", keywords: ["data structure", "array", "linked list", "stack", "queue", "tree", "graph", "hash"] },
  { label: "Algorithms", keywords: ["algorithm", "sorting", "search", "dynamic programming", "recursion", "complexity", "big o"] },
  { label: "System Design", keywords: ["system design", "scalability", "microservice", "architecture", "load balancer", "distributed"] },
  { label: "Database Design", keywords: ["database", "sql", "schema", "normalization", "index", "query", "nosql"] },
  { label: "Web Development", keywords: ["web", "frontend", "backend", "react", "html", "css", "javascript", "api", "rest"] },
];

const SKILL_KEYWORDS = [
  { label: "DSA", keywords: ["data structure", "algorithm", "array", "tree", "graph", "recursion"] },
  { label: "Databases", keywords: ["database", "sql", "schema", "query", "nosql"] },
  { label: "DevOps", keywords: ["devops", "ci/cd", "docker", "kubernetes", "deployment", "cloud"] },
  { label: "Frontend", keywords: ["frontend", "react", "css", "html", "ui", "component"] },
  { label: "Backend", keywords: ["backend", "api", "server", "node", "express", "endpoint"] },
];

function scoreAgainst(sessions, groups, baseline) {
  return groups.map((g, idx) => {
    const matches = sessions.filter((s) => {
      const text = `${s.question} ${s.summary}`.toLowerCase();
      return g.keywords.some((k) => text.includes(k));
    }).length;
    const value = matches === 0 ? baseline[idx] : Math.min(100, 25 + matches * 15);
    return { label: g.label, value };
  });
}

function dayKey(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}

function progressStats(userId) {
  const sessions = state.mentorSessions.filter((s) => s.user_id === userId);
  const reviews = state.resumeReviews.filter((r) => r.user_id === userId);

  const activeDays = new Set(sessions.map((s) => dayKey(s.created_at)));
  let streak = 0;
  const cursor = new Date();
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const studyHours = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = sessions.filter((s) => dayKey(s.created_at) === key).length;
    studyHours.push({ day: dayLabels[d.getDay()], hours: Math.round(count * 0.3 * 10) / 10 });
  }
  const hoursThisWeek = Math.round(studyHours.reduce((sum, d) => sum + d.hours, 0) * 10) / 10;

  const totalXp = sessions.length * 10 + reviews.length * 20;
  const level = Math.floor(totalXp / 100) + 1;

  const topics = scoreAgainst(sessions, TOPIC_KEYWORDS, [20, 15, 10, 15, 25]);
  const skills = scoreAgainst(sessions, SKILL_KEYWORDS, [15, 10, 5, 20, 15]);

  const user = findUserById(userId);
  const raw = (user && user.career_roadmap) || "";
  let stepLabels = raw
    .split(/\n|->/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (stepLabels.length === 0) {
    stepLabels = ["Programming Basics", "Data Structures", "System Design", "Cloud Computing"];
  }
  const overallPercent = Math.min(100, Math.round((totalXp / 500) * 100));
  const doneCount = Math.floor((overallPercent / 100) * stepLabels.length);
  const steps = stepLabels.map((label, idx) => ({
    label,
    status: idx < doneCount ? "done" : idx === doneCount ? "current" : "todo",
  }));

  // recent activity from conversations
  const recentConversations = listConversations(userId, null).slice(0, 5).map((c) => ({
    type: c.mode === "code" ? "code_review" : "chat",
    title: c.title.length > 60 ? c.title.slice(0, 60) + "…" : c.title,
    mode: c.mode,
    created_at: c.created_at,
  }));

  // daily goals (derived from today's activity)
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => dayKey(s.created_at) === todayKey).length;
  const dailyGoals = [
    { label: "Complete DSA problem", done: totalXp >= 10 },
    { label: "Review JavaScript concepts", done: todaySessions >= 1 },
    { label: "Practice coding problems", done: todaySessions >= 2 },
  ];

  return {
    day_streak: streak,
    hours_this_week: hoursThisWeek,
    total_xp: totalXp,
    level,
    study_hours: studyHours,
    skills,
    topics,
    roadmap: { overall_percent: overallPercent, steps },
    recent_activity: recentConversations,
    daily_goals: dailyGoals,
  };
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserProfile,
  userToDict,
  createMentorSession,
  listMentorSessions,
  listConversations,
  getConversationTurns,
  deleteConversation,
  sessionToDict,
  createResumeReview,
  listResumeReviews,
  reviewToDict,
  createRoadmap,
  listRoadmaps,
  getRoadmap,
  updateRoadmapStep,
  deleteRoadmap,
  roadmapToDict,
  dashboardStats,
  progressStats,
};
