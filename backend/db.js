// db.js — lightweight JSON-file persistence (mirrors backend/models.py from the Flask version,
// but avoids a native database dependency, since better-sqlite3 needs a C++ build step that
// isn't guaranteed to work on every judging/grading machine. Same data shape, same API surface,
// just backed by a JSON file on disk + plain Node fs, in keeping with the bootcamp's JS/JSON scope.)

const fs = require("fs");
const path = require("path");
require("dotenv").config();

const DATA_FILE = path.join(__dirname, process.env.DATABASE_FILE || "mentorai.db.json");

function nowIso() {
  return new Date().toISOString();
}

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    return { users: [], mentorSessions: [], resumeReviews: [], nextId: { users: 1, mentorSessions: 1, resumeReviews: 1 } };
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return { users: [], mentorSessions: [], resumeReviews: [], nextId: { users: 1, mentorSessions: 1, resumeReviews: 1 } };
  }
}

function save(state) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

let state = load();

// ---- migration: backfill conversation_id for turns saved before threading
// was added. Older rows in mentorai.db.json predate this field entirely, so
// group-by-conversation would otherwise key them under `undefined`. This
// runs once per process start and persists the fix to disk.
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
// Each row is a single turn. Turns that belong to the same thread share a
// conversation_id. A brand-new conversation's root turn uses its own id as
// the conversation_id (so no separate id sequence/table is needed).

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

// Flat list of turns (kept for any internal/back-compat use).
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
// Grouped-by-thread list for the History page: one row per conversation,
// showing the opening question as the title and the latest reply as a preview.
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

// All turns of a single thread, in chronological order. Returns null if the
// conversation doesn't exist or doesn't belong to this user (so the route
// can 404 instead of leaking another user's thread).
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
  dashboardStats,
};