// routes/mentor.js — mirrors backend/routes/mentor.py

const express = require("express");
const { createMentorSession, listMentorSessions, sessionToDict } = require("../db");
const { askMentor } = require("../llm");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const VALID_MODES = new Set(["career", "academic", "code"]);

router.post("/ask", requireAuth, async (req, res) => {
  const userId = req.userId;
  const body = req.body || {};
  const mode = body.mode || "career";
  const question = (body.question || "").trim();

  if (!VALID_MODES.has(mode)) {
    return res.status(400).json({ error: `mode must be one of ${JSON.stringify([...VALID_MODES].sort())}` });
  }
  if (!question) {
    return res.status(400).json({ error: "question is required" });
  }

  const result = await askMentor(mode, question);

  const session = createMentorSession({
    userId,
    mode,
    question,
    summary: result.summary,
    steps: result.steps,
    resources: result.resources,
  });

  res.status(200).json(sessionToDict(session));
});

router.get("/history", requireAuth, (req, res) => {
  const userId = req.userId;
  const mode = req.query.mode;
  const rows = listMentorSessions(userId, mode);
  res.status(200).json(rows.map(sessionToDict));
});

module.exports = router;
