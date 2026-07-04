// routes/resume.js — mirrors backend/routes/resume.py

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { createResumeReview, listResumeReviews, reviewToDict } = require("../db");
const { analyzeResume } = require("../llm");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

async function extractText(file) {
  const filename = (file.originalname || "").toLowerCase();
  if (filename.endsWith(".pdf")) {
    const parsed = await pdfParse(file.buffer);
    return parsed.text || "";
  }
  // Fallback: treat as plain text
  return file.buffer.toString("utf-8");
}

router.post("/analyze", requireAuth, upload.single("file"), async (req, res) => {
  const userId = req.userId;

  if (!req.file) {
    return res.status(400).json({ error: "attach a resume file under the 'file' field" });
  }

  const targetRole = (req.body && req.body.target_role) || "";

  let text;
  try {
    text = await extractText(req.file);
  } catch (e) {
    return res.status(400).json({ error: `could not read file: ${e.message}` });
  }

  if (!text.trim()) {
    return res.status(400).json({ error: "no extractable text found in this file" });
  }

  const result = await analyzeResume(text, targetRole);

  const review = createResumeReview({
    userId,
    targetRole,
    score: result.score,
    missingSkills: result.missing_skills,
    suggestions: result.suggestions,
  });

  res.status(200).json(reviewToDict(review));
});

router.get("/history", requireAuth, (req, res) => {
  const userId = req.userId;
  const rows = listResumeReviews(userId);
  res.status(200).json(rows.map(reviewToDict));
});

module.exports = router;
