// routes/dashboard.js — mirrors backend/routes/dashboard.py

const express = require("express");
const { dashboardStats } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/stats", requireAuth, (req, res) => {
  res.status(200).json(dashboardStats(req.userId));
});

module.exports = router;
