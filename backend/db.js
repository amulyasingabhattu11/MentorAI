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
    roadmapSuggestions: [],
    nextId: { users: 1, mentorSessions: 1, resumeReviews: 1, roadmaps: 1, roadmapSuggestions: 1 },
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
  if (!Array.isArray(parsed.roadmapSuggestions)) parsed.roadmapSuggestions = [];

  if (!parsed.nextId || typeof parsed.nextId !== "object") {
    parsed.nextId = { users: 1, mentorSessions: 1, resumeReviews: 1, roadmaps: 1, roadmapSuggestions: 1 };
  } else {
    if (!parsed.nextId.users) parsed.nextId.users = 1;
    if (!parsed.nextId.mentorSessions) parsed.nextId.mentorSessions = 1;
    if (!parsed.nextId.resumeReviews) parsed.nextId.resumeReviews = 1;
    if (!parsed.nextId.roadmaps) parsed.nextId.roadmaps = 1;
    if (!parsed.nextId.roadmapSuggestions) parsed.nextId.roadmapSuggestions = 1;
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

function createMentorSession({
  userId,
  mode,
  question,
  summary,
  steps,
  resources,
  conversationId,
  roleTitle,
  signalStatus,
  signalTopic,
}) {
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
    role_title: roleTitle || "",
    // Mentor's own judgment of this session, from the LLM's roadmap_signal
    // ("mastered" | "struggling" | "none") — used by scoreAgainst() to build
    // real Topic Progress / Skills numbers instead of keyword counting.
    signal_status: signalStatus || "none",
    signal_topic: signalTopic || "",
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
    role_title: s.role_title || "",
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

// Inserts a new step right after `afterIdx` (used when a roadmap suggestion
// to add a remedial step is approved). Re-indexes all steps afterward.
function insertRoadmapStep(userId, roadmapId, afterIdx, label) {
  const roadmap = getRoadmap(userId, roadmapId);
  if (!roadmap) return null;
  const insertAt = Math.min(Math.max(afterIdx + 1, 0), roadmap.steps.length);
  roadmap.steps.splice(insertAt, 0, {
    idx: insertAt,
    label,
    subtopics: Math.floor(Math.random() * 8) + 3,
    completed: false,
  });
  roadmap.steps.forEach((s, i) => { s.idx = i; });
  roadmap.updated_at = nowIso();
  save(state);
  return roadmap;
}

// Moves a step to be the very next incomplete step (used when a roadmap
// suggestion recommends prioritizing something the user is struggling with).
function reprioritizeRoadmapStep(userId, roadmapId, stepIdx) {
  const roadmap = getRoadmap(userId, roadmapId);
  if (!roadmap) return null;
  const [step] = roadmap.steps.splice(stepIdx, 1);
  if (!step) return null;
  const firstIncompleteIdx = roadmap.steps.findIndex((s) => !s.completed);
  const insertAt = firstIncompleteIdx === -1 ? 0 : firstIncompleteIdx;
  roadmap.steps.splice(insertAt, 0, step);
  roadmap.steps.forEach((s, i) => { s.idx = i; });
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

// ---- roadmap suggestions (Mentor insight -> notification -> approve/dismiss) ----
// A suggestion is never applied automatically. It just sits here as a pending
// notification until the user explicitly approves or dismisses it.
//
// type: "mark_done"    payload: { stepIdx }
//       "add_step"     payload: { afterIdx, label }
//       "reprioritize" payload: { stepIdx }

function createRoadmapSuggestion(userId, roadmapId, { type, reasoning, payload }) {
  const id = nextId("roadmapSuggestions");
  const suggestion = {
    id,
    user_id: userId,
    roadmap_id: roadmapId,
    type,
    reasoning: reasoning || "",
    payload: payload || {},
    status: "pending", // pending | approved | dismissed
    created_at: nowIso(),
  };
  state.roadmapSuggestions.push(suggestion);
  save(state);
  return suggestion;
}

function listPendingSuggestions(userId) {
  return state.roadmapSuggestions
    .filter((s) => s.user_id === userId && s.status === "pending")
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

function getSuggestion(userId, suggestionId) {
  return state.roadmapSuggestions.find((s) => s.id === suggestionId && s.user_id === userId) || null;
}

// Applies the suggestion's mutation to its roadmap and marks it resolved.
// Also keeps the user's profile career_roadmap text field in sync, since
// the Profile page reads from there rather than re-deriving it from the
// roadmap on every render.
// Returns { suggestion, roadmap, user } or null if not found/already resolved.
function approveSuggestion(userId, suggestionId) {
  const suggestion = getSuggestion(userId, suggestionId);
  if (!suggestion || suggestion.status !== "pending") return null;

  let roadmap = null;
  const { type, payload } = suggestion;
  if (type === "mark_done") {
    roadmap = updateRoadmapStep(userId, suggestion.roadmap_id, payload.stepIdx, true);
  } else if (type === "add_step") {
    roadmap = insertRoadmapStep(userId, suggestion.roadmap_id, payload.afterIdx, payload.label);
  } else if (type === "reprioritize") {
    roadmap = reprioritizeRoadmapStep(userId, suggestion.roadmap_id, payload.stepIdx);
  }

  if (!roadmap) return null;
  suggestion.status = "approved";

  const careerRoadmapText = roadmap.steps.map((s) => s.label).join(" -> ");
  const user = updateUserProfile(userId, { careerRoadmap: careerRoadmapText });

  save(state);
  return { suggestion, roadmap, user };
}

function dismissSuggestion(userId, suggestionId) {
  const suggestion = getSuggestion(userId, suggestionId);
  if (!suggestion || suggestion.status !== "pending") return null;
  suggestion.status = "dismissed";
  save(state);
  return suggestion;
}

function suggestionToDict(s) {
  return {
    id: s.id,
    roadmap_id: s.roadmap_id,
    type: s.type,
    reasoning: s.reasoning,
    payload: s.payload,
    status: s.status,
    created_at: s.created_at,
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

// ---- keyword banks grouped by goal domain ----

const DOMAIN_PROFILES = {
  // Software / tech (default)
  tech: {
    topics: [
      { label: "Data Structures", keywords: ["data structure", "array", "linked list", "stack", "queue", "tree", "graph", "hash"] },
      { label: "Algorithms", keywords: ["algorithm", "sorting", "search", "dynamic programming", "recursion", "complexity", "big o"] },
      { label: "System Design", keywords: ["system design", "scalability", "microservice", "architecture", "load balancer", "distributed"] },
      { label: "Database Design", keywords: ["database", "sql", "schema", "normalization", "index", "query", "nosql"] },
      { label: "Web Development", keywords: ["web", "frontend", "backend", "react", "html", "css", "javascript", "api", "rest"] },
    ],
    skills: [
      { label: "DSA", keywords: ["data structure", "algorithm", "array", "tree", "graph", "recursion"] },
      { label: "Databases", keywords: ["database", "sql", "schema", "query", "nosql"] },
      { label: "DevOps", keywords: ["devops", "ci/cd", "docker", "kubernetes", "deployment", "cloud"] },
      { label: "Frontend", keywords: ["frontend", "react", "css", "html", "ui", "component"] },
      { label: "Backend", keywords: ["backend", "api", "server", "node", "express", "endpoint"] },
    ],
  },
  // UPSC / civil services
  upsc: {
    topics: [
      { label: "History & Culture", keywords: ["history", "culture", "ancient", "medieval", "modern", "heritage", "art"] },
      { label: "Polity & Governance", keywords: ["polity", "constitution", "governance", "parliament", "judiciary", "policy", "law"] },
      { label: "Geography", keywords: ["geography", "climate", "soil", "river", "map", "environment", "disaster"] },
      { label: "Economy", keywords: ["economy", "gdp", "inflation", "budget", "trade", "fiscal", "monetary", "banking"] },
      { label: "Current Affairs", keywords: ["current", "news", "affair", "government", "scheme", "report", "index", "summit"] },
    ],
    skills: [
      { label: "History", keywords: ["history", "culture", "art", "heritage"] },
      { label: "Polity", keywords: ["polity", "constitution", "parliament", "judiciary"] },
      { label: "Geography", keywords: ["geography", "climate", "river", "disaster"] },
      { label: "Economy", keywords: ["economy", "budget", "trade", "fiscal"] },
      { label: "Current Affairs", keywords: ["current", "scheme", "report", "news"] },
    ],
  },
  // Medical / NEET / healthcare
  medical: {
    topics: [
      { label: "Anatomy", keywords: ["anatomy", "organ", "body", "muscle", "bone", "tissue", "cell"] },
      { label: "Physiology", keywords: ["physiology", "function", "metabolism", "hormone", "nervous", "cardiac"] },
      { label: "Biochemistry", keywords: ["biochemistry", "enzyme", "protein", "dna", "rna", "carbohydrate", "lipid"] },
      { label: "Pharmacology", keywords: ["pharmacology", "drug", "medicine", "dosage", "side effect", "treatment"] },
      { label: "Pathology", keywords: ["pathology", "disease", "infection", "cancer", "diagnosis", "syndrome"] },
    ],
    skills: [
      { label: "Anatomy", keywords: ["anatomy", "organ", "muscle", "bone"] },
      { label: "Physiology", keywords: ["physiology", "function", "metabolism"] },
      { label: "Biochemistry", keywords: ["biochemistry", "enzyme", "protein"] },
      { label: "Pharmacology", keywords: ["pharmacology", "drug", "medicine"] },
      { label: "Pathology", keywords: ["pathology", "disease", "infection"] },
    ],
  },
  // Finance / MBA / CA
  finance: {
    topics: [
      { label: "Accounting", keywords: ["accounting", "journal", "ledger", "balance sheet", "debit", "credit", "audit"] },
      { label: "Finance", keywords: ["finance", "investment", "stock", "bond", "capital", "return", "portfolio"] },
      { label: "Marketing", keywords: ["marketing", "brand", "customer", "segmentation", "pricing", "promotion"] },
      { label: "Management", keywords: ["management", "strategy", "leadership", "operations", "supply chain", "hr"] },
      { label: "Economics", keywords: ["economics", "demand", "supply", "market", "price", "elasticity", "gdp"] },
    ],
    skills: [
      { label: "Accounting", keywords: ["accounting", "audit", "ledger"] },
      { label: "Finance", keywords: ["finance", "investment", "stock"] },
      { label: "Marketing", keywords: ["marketing", "brand", "customer"] },
      { label: "Management", keywords: ["management", "strategy", "leadership"] },
      { label: "Economics", keywords: ["economics", "demand", "supply"] },
    ],
  },
};

/**
 * Pick the best-matching domain profile by scanning ALL available text about the user:
 * their goal, career_roadmap text, and recent session questions.
 * Falls back to "tech" when nothing matches.
 */
function detectDomain(textsArray) {
  const combined = (Array.isArray(textsArray) ? textsArray : [textsArray])
    .join(" ")
    .toLowerCase();
  if (/upsc|ias\b|ips\b|civil service|ifs\b|groups.*upsc|upsc.*groups|prelim|mains exam|general studies|crack.*group|crack.*upsc/.test(combined)) return "upsc";
  if (/neet|mbbs|medical|doctor|pharmacy|nursing|clinical/.test(combined)) return "medical";
  if (/\bmba\b|ca\b|cfa\b|cpa\b|finance|accounting|marketing|commerce|\bmanagement\b/.test(combined)) return "finance";
  return "tech";
}

// Does a piece of free text (a session's roadmap_signal topic, or a roadmap
// step label like "Master Data Structures") belong to this topic/skill group
// (e.g. "Data Structures")? Substring-or-shared-keyword fuzzy match.
function textMatchesGroup(text, group) {
  if (!text) return false;
  const t = text.toLowerCase();
  const label = group.label.toLowerCase();
  if (t.includes(label) || label.includes(t)) return true;
  return group.keywords.some((k) => t.includes(k) || k.includes(t));
}

// Scores each topic/skill group using ONLY real, intentional outcomes —
// never a bare keyword mention. Simply typing "array" or "sql" in a random
// question (even in Code Review, which isn't tied to any learning path at
// all) must NOT move the needle; that was the bug being fixed here.
//  - a COMPLETED roadmap step matching this topic -> strong credit (you
//    explicitly ticked it done yourself — the most trustworthy signal there
//    is, and now it's actually usable across the whole track)
//  - "mastered" mentor signal on a matching topic  -> strong credit (the
//    mentor judged you actually demonstrated understanding)
//  - "struggling" mentor signal on a matching topic -> small credit (genuine
//    engagement/difficulty with it, but no mastery yet)
//  - everything else (including plain keyword hits) -> no credit
// A topic with no real evidence stays at 0%, full stop.
function scoreAgainst(sessions, groups, completedStepLabels) {
  const completed = completedStepLabels || [];
  return groups.map((g) => {
    let score = 0;
    if (completed.some((label) => textMatchesGroup(label, g))) {
      score += 60;
    }
    for (const s of sessions) {
      const signalHit = textMatchesGroup(s.signal_topic, g);
      if (!signalHit) continue;
      if (s.signal_status === "mastered") {
        score += 30;
      } else if (s.signal_status === "struggling") {
        score += 10;
      }
    }
    return { label: g.label, value: Math.min(100, score) };
  });
}

function dayKey(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}

function progressStats(userId) {
  const sessions = state.mentorSessions.filter((s) => s.user_id === userId);
  const reviews = state.resumeReviews.filter((r) => r.user_id === userId);
  const user = findUserById(userId);
  const goal = (user && user.goal) || "";

  // ---- streak ----
  const activeDays = new Set(sessions.map((s) => dayKey(s.created_at)));
  let streak = 0;
  const cursor = new Date();
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // ---- study hours (last 7 days) ----
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

  // ---- XP / level ----
  const totalXp = sessions.length * 10 + reviews.length * 20;
  const level = Math.floor(totalXp / 100) + 1;

  // ---- current roadmap ----
  // Always prefer structured roadmaps (created via Career Roadmap page).
  // When none exist, return empty steps — the frontend shows a "create one" prompt.
  const userRoadmaps = listRoadmaps(userId);
  let overallPercent, steps;
  let latest = null;

  if (userRoadmaps.length > 0) {
    // Pick the roadmap updated most recently — this is the single source of
    // truth for "what is the user currently working towards".
    latest = userRoadmaps
      .slice()
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
    const dict = roadmapToDict(latest);
    overallPercent = dict.overall_percent;

    // Find the first incomplete step to mark as "current"
    const firstIncompleteIdx = dict.steps.findIndex((s) => !s.completed);
    steps = dict.steps.map((s, idx) => ({
      label: s.label,
      status: s.completed
        ? "done"
        : idx === firstIncompleteIdx
        ? "current"
        : "todo",
    }));
  } else {
    // No structured roadmap yet — signal the frontend to show an empty state.
    overallPercent = 0;
    steps = [];
  }

  // ---- domain detection ----
  // The ACTIVE ROADMAP is the single source of truth for "what is the user
  // studying right now" — it's the thing they explicitly created/edited on
  // the Career Roadmap page. We detect the domain from the roadmap's goal +
  // title + step labels first. Only when no roadmap exists do we fall back
  // to the user's onboarding `goal` text, and finally to recent session
  // questions. This fixes the bug where switching roadmaps (e.g. from a UPSC
  // goal to "Learn programming basics") left the Progress page permanently
  // stuck showing the old domain, because it used to read only the stale
  // `user.goal` field which never changed after signup.
  const roadmapText = latest
    ? [latest.goal, latest.title, ...latest.steps.map((s) => s.label)].join(" ")
    : "";
  const recentSessionText = sessions
    .slice(-10)
    .map((s) => `${s.question} ${s.summary}`)
    .join(" ");
  const domain = latest
    ? detectDomain([roadmapText])
    : detectDomain([goal, recentSessionText]);
  const profile = DOMAIN_PROFILES[domain];
  // Completed roadmap steps are the single most trustworthy signal a user
  // gives — an explicit, deliberate "I finished this" click — so they count
  // toward Topic Progress / Skills too, not just mentor-session signals.
  const completedStepLabels = latest
    ? latest.steps.filter((s) => s.completed).map((s) => s.label)
    : [];
  const topics = scoreAgainst(sessions, profile.topics, completedStepLabels);
  const skills = scoreAgainst(sessions, profile.skills, completedStepLabels);

  // ---- recent activity ----
  const recentConversations = listConversations(userId, null).slice(0, 5).map((c) => ({
    type: c.mode === "code" ? "code_review" : "chat",
    title: c.title.length > 60 ? c.title.slice(0, 60) + "…" : c.title,
    mode: c.mode,
    created_at: c.created_at,
  }));

  // ---- daily goals (domain-aware) ----
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => dayKey(s.created_at) === todayKey).length;

  const dailyGoalsByDomain = {
    upsc: [
      { label: "Read a Current Affairs article", done: todaySessions >= 1 },
      { label: "Revise one GS topic", done: todaySessions >= 2 },
      { label: "Attempt a mock question", done: totalXp >= 30 },
    ],
    medical: [
      { label: "Review anatomy concepts", done: todaySessions >= 1 },
      { label: "Study a clinical case", done: todaySessions >= 2 },
      { label: "Practice MCQs", done: totalXp >= 30 },
    ],
    finance: [
      { label: "Study a finance concept", done: todaySessions >= 1 },
      { label: "Solve a case study", done: todaySessions >= 2 },
      { label: "Review current affairs (economy)", done: totalXp >= 30 },
    ],
    tech: [
      { label: "Complete a coding problem", done: totalXp >= 10 },
      { label: "Study a concept with AI Mentor", done: todaySessions >= 1 },
      { label: "Practice 2+ problems", done: todaySessions >= 2 },
    ],
  };
  const dailyGoals = dailyGoalsByDomain[domain] || dailyGoalsByDomain.tech;

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
  insertRoadmapStep,
  reprioritizeRoadmapStep,
  deleteRoadmap,
  roadmapToDict,
  createRoadmapSuggestion,
  listPendingSuggestions,
  getSuggestion,
  approveSuggestion,
  dismissSuggestion,
  suggestionToDict,
  dashboardStats,
  progressStats,
  DOMAIN_PROFILES,
  detectDomain,
};