// routes/dashboard.js — mirrors backend/routes/dashboard.py

const express = require("express");
const { dashboardStats, progressStats } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/stats", requireAuth, (req, res) => {
  res.status(200).json(dashboardStats(req.userId));
});

// Powers the new Progress page: streak, XP/level, weekly study-hours chart,
// skills radar, topic progress bars, and roadmap step status.
router.get("/progress", requireAuth, (req, res) => {
  res.status(200).json(progressStats(req.userId));
});

module.exports = router;