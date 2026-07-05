// routes/suggestions.js — Mentor insight -> notification -> approve/dismiss.
// Nothing here ever mutates a roadmap on its own; approve/:id is the only
// path that does, and only because the user explicitly clicked it.

const express = require("express");
const {
  listPendingSuggestions,
  approveSuggestion,
  dismissSuggestion,
  suggestionToDict,
  roadmapToDict,
} = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /suggestions — list pending notifications for the logged-in user
router.get("/", requireAuth, (req, res) => {
  const suggestions = listPendingSuggestions(req.userId).map(suggestionToDict);
  res.status(200).json(suggestions);
});

// POST /suggestions/:id/approve — apply the suggestion's roadmap mutation
router.post("/:id/approve", requireAuth, (req, res) => {
  const suggestionId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(suggestionId)) {
    return res.status(400).json({ error: "invalid suggestion id" });
  }

  const result = approveSuggestion(req.userId, suggestionId);
  if (!result) {
    return res.status(404).json({ error: "suggestion not found or already resolved" });
  }

  res.status(200).json({
    suggestion: suggestionToDict(result.suggestion),
    roadmap: roadmapToDict(result.roadmap),
  });
});

// POST /suggestions/:id/dismiss — discard without applying anything
router.post("/:id/dismiss", requireAuth, (req, res) => {
  const suggestionId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(suggestionId)) {
    return res.status(400).json({ error: "invalid suggestion id" });
  }

  const suggestion = dismissSuggestion(req.userId, suggestionId);
  if (!suggestion) {
    return res.status(404).json({ error: "suggestion not found or already resolved" });
  }

  res.status(200).json({ dismissed: true });
});

module.exports = router;
