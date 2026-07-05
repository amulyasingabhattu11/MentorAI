// routes/roadmap.js — Career Roadmap CRUD with AI generation

const express = require("express");
const {
  createRoadmap,
  listRoadmaps,
  getRoadmap,
  updateRoadmapStep,
  deleteRoadmap,
  roadmapToDict,
} = require("../db");
const { generateRoadmapSteps } = require("../llm");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /roadmap/list — list all roadmaps for the logged-in user
router.get("/list", requireAuth, (req, res) => {
  const roadmaps = listRoadmaps(req.userId).map(roadmapToDict);
  res.status(200).json(roadmaps);
});

// POST /roadmap/create — generate and create a new roadmap from a goal
router.post("/create", requireAuth, async (req, res) => {
  const body = req.body || {};
  const goal = (body.goal || "").trim();
  const title = (body.title || "").trim();

  if (!goal) {
    return res.status(400).json({ error: "goal is required" });
  }

  const steps = await generateRoadmapSteps(goal);
  const roadmap = createRoadmap(req.userId, {
    title: title || goal,
    goal,
    steps,
  });

  res.status(201).json(roadmapToDict(roadmap));
});

// GET /roadmap/:id — get a single roadmap
router.get("/:id", requireAuth, (req, res) => {
  const roadmapId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(roadmapId)) {
    return res.status(400).json({ error: "invalid roadmap id" });
  }
  const roadmap = getRoadmap(req.userId, roadmapId);
  if (!roadmap) {
    return res.status(404).json({ error: "roadmap not found" });
  }
  res.status(200).json(roadmapToDict(roadmap));
});

// PATCH /roadmap/:id/step/:stepIdx — toggle a step's completion
router.patch("/:id/step/:stepIdx", requireAuth, (req, res) => {
  const roadmapId = Number.parseInt(req.params.id, 10);
  const stepIdx = Number.parseInt(req.params.stepIdx, 10);

  if (!Number.isFinite(roadmapId) || !Number.isFinite(stepIdx)) {
    return res.status(400).json({ error: "invalid id or step index" });
  }

  const body = req.body || {};
  if (typeof body.completed !== "boolean") {
    return res.status(400).json({ error: "completed must be a boolean" });
  }
  const completed = body.completed;

  const roadmap = updateRoadmapStep(req.userId, roadmapId, stepIdx, completed);
  if (!roadmap) {
    return res.status(404).json({ error: "roadmap or step not found" });
  }

  res.status(200).json(roadmapToDict(roadmap));
});

// DELETE /roadmap/:id — delete a roadmap
router.delete("/:id", requireAuth, (req, res) => {
  const roadmapId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(roadmapId)) {
    return res.status(400).json({ error: "invalid roadmap id" });
  }
  const deleted = deleteRoadmap(req.userId, roadmapId);
  if (!deleted) {
    return res.status(404).json({ error: "roadmap not found" });
  }
  res.status(200).json({ deleted: true });
});

module.exports = router;
