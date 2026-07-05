// routes/resources.js — AI-curated learning resources based on the user's goal.
//
// This is NOT a live/real-time web search — it's the mentor LLM generating a
// relevant list from the user's stated goal. A genuine real-time version
// (live search results) would need a separate search API (e.g. Bing/Serper/
// YouTube Data API) and its own API key; this route is the scoped-down,
// no-new-infra version of that ask. The frontend labels this "AI-curated"
// so it isn't presented as something it's not.

const express = require("express");
const { findUserById } = require("../db");
const { generateGoalResources } = require("../llm");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /resources — resources tailored to the logged-in user's goal.
// Falls back to a generic set (via generateGoalResources's own fallback)
// when the user hasn't set a goal yet or the Groq call fails.
router.get("/", requireAuth, async (req, res) => {
  const user = findUserById(req.userId);
  const goal = (user && user.goal) || "";
  const resources = await generateGoalResources(goal);
  res.status(200).json({ goal, resources });
});

module.exports = router;