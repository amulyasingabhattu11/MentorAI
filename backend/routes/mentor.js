// routes/mentor.js — mirrors backend/routes/mentor.py

const express = require("express");
const {
  createMentorSession,
  listConversations,
  getConversationTurns,
  deleteConversation,
  sessionToDict,
  findUserById,
  listRoadmaps,
  listPendingSuggestions,
  createRoadmapSuggestion,
} = require("../db");
const { askMentor, generateRoadmap } = require("../llm");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const VALID_MODES = new Set(["career", "academic", "code"]);

// Fuzzy-matches a free-text topic (from the mentor's roadmap_signal) against
// a roadmap's step labels — case-insensitive, either direction substring, or
// shared significant words. Returns the matching step index, or -1.
function matchStepIndex(topic, steps) {
  if (!topic) return -1;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const topicNorm = norm(topic);
  if (!topicNorm) return -1;
  const topicWords = new Set(topicNorm.split(/\s+/).filter((w) => w.length > 2));

  let bestIdx = -1;
  let bestScore = 0;
  steps.forEach((step, idx) => {
    const labelNorm = norm(step.label);
    if (!labelNorm) return;
    let score = 0;
    if (labelNorm.includes(topicNorm) || topicNorm.includes(labelNorm)) score += 2;
    const labelWords = labelNorm.split(/\s+/).filter((w) => w.length > 2);
    score += labelWords.filter((w) => topicWords.has(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });
  return bestScore > 0 ? bestIdx : -1;
}

// Reacts to the mentor's roadmap_signal by queuing a pending suggestion —
// never applying anything automatically. Skips quietly if there's no active
// roadmap, no clear signal, or an identical suggestion is already pending
// (so one topic re-discussed across turns doesn't spam notifications).
function maybeQueueRoadmapSuggestion(userId, question, summary, signal) {
  // --- DEBUG LOGGING (kept intentionally, per earlier request) --------
  console.log("[roadmap-signal] raw signal from LLM:", signal);

  if (!signal || signal.status === "none" || !signal.topic) {
    console.log("[roadmap-signal] skipped: no usable signal (status='none', missing, or empty topic).");
    return;
  }

  const roadmaps = listRoadmaps(userId);
  if (roadmaps.length === 0) {
    console.log("[roadmap-signal] skipped: user has no roadmap yet. Create one first on the Career Roadmap page.");
    return;
  }
  const roadmap = roadmaps[0]; // most recently updated (listRoadmaps is sorted)

  const alreadyPending = listPendingSuggestions(userId).some(
    (s) => s.roadmap_id === roadmap.id && s.payload && s.payload.topic === signal.topic
  );
  if (alreadyPending) {
    console.log(`[roadmap-signal] skipped: an identical pending suggestion for topic "${signal.topic}" already exists.`);
    return;
  }

  const stepIdx = matchStepIndex(signal.topic, roadmap.steps);
  const reasoningBase = `Based on your recent question ("${question.slice(0, 80)}${question.length > 80 ? "…" : ""}")`;

  if (signal.status === "mastered" && stepIdx !== -1 && !roadmap.steps[stepIdx].completed) {
    createRoadmapSuggestion(userId, roadmap.id, {
      type: "mark_done",
      reasoning: `${reasoningBase}, it looks like you've got a solid handle on "${roadmap.steps[stepIdx].label}". Mark this roadmap step as done?`,
      payload: { stepIdx, topic: signal.topic },
    });
    console.log(`[roadmap-signal] queued "mark_done" suggestion for step "${roadmap.steps[stepIdx].label}".`);
  } else if (signal.status === "struggling") {
    if (stepIdx !== -1) {
      createRoadmapSuggestion(userId, roadmap.id, {
        type: "reprioritize",
        reasoning: `${reasoningBase}, you seem to be finding "${roadmap.steps[stepIdx].label}" tricky. Move it up to be your next focus?`,
        payload: { stepIdx, topic: signal.topic },
      });
      console.log(`[roadmap-signal] queued "reprioritize" suggestion for step "${roadmap.steps[stepIdx].label}".`);
    } else {
      const firstIncompleteIdx = roadmap.steps.findIndex((s) => !s.completed);
      const afterIdx = firstIncompleteIdx === -1 ? roadmap.steps.length - 1 : Math.max(firstIncompleteIdx - 1, -1);
      createRoadmapSuggestion(userId, roadmap.id, {
        type: "add_step",
        reasoning: `${reasoningBase}, you seem to be finding "${signal.topic}" tricky. Add a dedicated roadmap step for it?`,
        payload: { afterIdx, label: `Review: ${signal.topic}`, topic: signal.topic },
      });
      console.log(`[roadmap-signal] queued "add_step" suggestion for topic "${signal.topic}".`);
    }
  } else {
    console.log(`[roadmap-signal] signal status "${signal.status}" with matched stepIdx=${stepIdx} did not meet any condition to create a suggestion (e.g. step already completed).`);
  }
}

router.post("/ask", requireAuth, async (req, res) => {
  const userId = req.userId;
  const body = req.body || {};
  const question = (body.question || "").trim();

  if (!question) {
    return res.status(400).json({ error: "question is required" });
  }

  const rawConversationId = body.conversation_id;
  const conversationId =
    rawConversationId !== undefined && rawConversationId !== null && rawConversationId !== ""
      ? Number(rawConversationId)
      : null;

  let mode = body.mode || "career";
  let history = [];

  if (conversationId) {
    const existingTurns = getConversationTurns(userId, conversationId);
    if (!existingTurns) {
      return res.status(404).json({ error: "conversation not found" });
    }
    mode = existingTurns[0].mode;
    history = existingTurns.map((t) => ({
      question: t.question,
      summary: t.summary,
      steps: t.steps,
      resources: t.resources,
    }));
  }

  if (!VALID_MODES.has(mode)) {
    return res.status(400).json({ error: `mode must be one of ${JSON.stringify([...VALID_MODES].sort())}` });
  }

  const user = findUserById(userId);
  const result = await askMentor(mode, question, history, (user && user.goal) || "");

  const session = createMentorSession({
    userId,
    mode,
    question,
    summary: result.summary,
    steps: result.steps,
    resources: result.resources,
    conversationId: conversationId || undefined,
    roleTitle: result.role_title,
    signalStatus: result.roadmap_signal && result.roadmap_signal.status,
    signalTopic: result.roadmap_signal && result.roadmap_signal.topic,
  });

  if (mode !== "code") {
    maybeQueueRoadmapSuggestion(userId, question, result.summary, result.roadmap_signal);
  }

  res.status(200).json(sessionToDict(session));
});

router.get("/history", requireAuth, (req, res) => {
  const userId = req.userId;
  const mode = req.query.mode;
  const conversations = listConversations(userId, mode);
  res.status(200).json(conversations);
});

router.get("/conversations/:id", requireAuth, (req, res) => {
  const userId = req.userId;
  const conversationId = Number.parseInt(req.params.id, 10);

  if (!Number.isFinite(conversationId)) {
    return res.status(400).json({ error: "invalid conversation id" });
  }

  const turns = getConversationTurns(userId, conversationId);
  if (!turns) {
    return res.status(404).json({ error: "conversation not found" });
  }

  res.status(200).json(turns.map(sessionToDict));
});

router.delete("/conversations/:id", requireAuth, (req, res) => {
  const userId = req.userId;
  const conversationId = Number.parseInt(req.params.id, 10);

  if (!Number.isFinite(conversationId)) {
    return res.status(400).json({ error: "invalid conversation id" });
  }

  const deleted = deleteConversation(userId, conversationId);
  if (!deleted) {
    return res.status(404).json({ error: "conversation not found" });
  }

  res.status(200).json({ deleted: true });
});

router.post("/roadmap", requireAuth, async (req, res) => {
  const body = req.body || {};
  const goal = (body.goal || "").trim();

  if (!goal) {
    return res.status(400).json({ error: "goal is required" });
  }

  const roadmap = await generateRoadmap(goal);
  res.status(200).json({ roadmap });
});

module.exports = router;