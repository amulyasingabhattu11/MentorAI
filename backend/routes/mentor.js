// routes/mentor.js — mirrors backend/routes/mentor.py

const express = require("express");
const {
  createMentorSession,
  listConversations,
  getConversationTurns,
  deleteConversation,
  sessionToDict,
} = require("../db");
const { askMentor, generateRoadmap } = require("../llm");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const VALID_MODES = new Set(["career", "academic", "code"]);

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

  const result = await askMentor(mode, question, history);

  const session = createMentorSession({
    userId,
    mode,
    question,
    summary: result.summary,
    steps: result.steps,
    resources: result.resources,
    conversationId: conversationId || undefined,
  });

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