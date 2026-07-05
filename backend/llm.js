// llm.js — Groq calls + prompts

const { DOMAIN_PROFILES, detectDomain } = require("./db");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// Prompts are deliberately domain-agnostic — the user's actual goal (UPSC,
// NEET, MBA, software engineering, or anything else) is injected at request
// time via `buildUserContent()` below, instead of assuming "CS student" the
// way earlier versions did. This is what lets the same mentor work for any
// field the user is actually pursuing.
const ROADMAP_SIGNAL_INSTRUCTION =
  ' Also include "roadmap_signal": {"status": "mastered" | "struggling" | "none", ' +
  '"topic": "short 2-5 word topic name, matching roadmap wording if you can infer it, else empty string"}. ' +
  'Set status to "mastered" ONLY if the student clearly demonstrates strong understanding of a ' +
  'specific topic (e.g. answers correctly, explains it back well, says they already know it). ' +
  'Set status to "struggling" ONLY if the student clearly shows confusion or repeated difficulty ' +
  'with a specific topic. Otherwise use "none" with an empty topic. Default to "none" — most ' +
  "single questions don't show enough evidence either way.";

const MODE_PROMPTS = {
  career:
    "You are a career mentor. The student will tell you their goal/field and a question. " +
    "Tailor everything to THEIR stated goal/field — do not assume software engineering unless " +
    "that is what they said. Respond ONLY with a JSON object (no markdown, no code fences) in " +
    'this exact shape: {"summary": "1-2 sentence overview", "steps": ["step 1", "step 2", "step 3"], ' +
    '"resources": ["resource or topic to look up", "..."]}. ' +
    "Keep steps concrete and actionable, 3-5 items. Keep resources as topic/resource names relevant " +
    "to the student's actual field, not fake links." +
    ROADMAP_SIGNAL_INSTRUCTION,

  academic:
    "You are an academic mentor helping a student understand a concept or solve a doubt in " +
    "THEIR field of study (which may be technical, a competitive exam subject, medicine, " +
    "commerce/finance, or anything else — use whatever field/goal the student mentions). " +
    "Respond ONLY with a JSON object (no markdown, no code fences) in this exact shape: " +
    '{"summary": "clear 1-2 sentence explanation of the core idea", ' +
    '"steps": ["a worked breakdown, step by step"], ' +
    '"resources": ["related concept or topic to study next"]}. ' +
    "Be precise and correct; do not oversimplify to the point of being wrong." +
    ROADMAP_SIGNAL_INSTRUCTION,

  // Code Review is intentionally programming-specific — it's a dedicated
  // feature for reviewing/debugging code, not a general study mode. It's
  // also not tied to roadmap topics, so no roadmap_signal here.
  code:
    "You are a coding mentor. The student wants HINTS, not full solutions or full code. " +
    "Respond ONLY with a JSON object (no markdown, no code fences) in this exact shape: " +
    '{"summary": "restate the problem/bug in one line", ' +
    '"steps": ["a guiding hint, not a full solution", "another hint that narrows it down"], ' +
    '"resources": ["relevant concept, data structure, or pattern to review"]}. ' +
    "Never output a complete working solution, only progressively revealing hints.",
};

const RESUME_SYSTEM_PROMPT =
  "You are an ATS and career-readiness reviewer for a student/professional resume. Given raw " +
  "resume text and an optional target role, respond ONLY with a JSON object (no markdown, no " +
  "code fences) in this exact shape: " +
  '{"score": <integer 0-100 ATS/readiness score>, ' +
  '"missing_skills": ["skill relevant to the target role that is absent"], ' +
  '"suggestions": ["specific, actionable suggestion to improve the resume"]}. ' +
  "Judge relevance against the target role itself, whatever field it is in (engineering, " +
  "government exams, medicine, finance, design, etc.) rather than assuming a tech role. " +
  "Base the score on clarity, quantified impact, relevant skills coverage, and formatting cues " +
  "you can infer from plain text. Give 4-6 suggestions.";

const ROADMAP_SYSTEM_PROMPT =
  "You are a mentor creating a step-by-step roadmap for a student's stated goal. The goal may " +
  "be technical (e.g. software engineering), a competitive exam (e.g. UPSC, NEET, banking), " +
  "higher education (e.g. MBA, CA), or anything else — infer the field from the goal text " +
  "itself and tailor every stage to it. Respond ONLY with a JSON object (no markdown, no code " +
  'fences) in this exact shape: {"roadmap": ["stage 1", "stage 2", "stage 3", "stage 4"]}. ' +
  "Keep each stage short (3-6 words), ordered chronologically from where a beginner would " +
  "start through to achieving the goal, 5-8 stages total. Make them specific and actionable, " +
  "and specific to the field implied by the goal.";

// Domain-aware fallback roadmaps, used only when the Groq API call fails
// (e.g. missing/invalid API key, network error). Built from the same
// DOMAIN_PROFILES used by the Progress page, so a UPSC goal that fails over
// still gets UPSC-shaped stages instead of a generic software roadmap.
function fallbackRoadmapFor(goal) {
  const domain = detectDomain([goal || ""]);
  const profile = DOMAIN_PROFILES[domain] || DOMAIN_PROFILES.tech;
  const stageVerbs = ["Foundations of", "Core concepts in", "Practice", "Mock tests / projects for", "Advanced"];
  const stages = profile.topics.slice(0, 5).map((t, idx) => `${stageVerbs[idx] || "Deep dive into"} ${t.label}`);
  stages.push("Final revision & readiness check");
  return stages;
}

async function callGroqMessages(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const resp = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Groq request failed with ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const raw = data.choices[0].message.content;
  return JSON.parse(raw);
}

async function callGroq(systemPrompt, userContent) {
  return callGroqMessages([
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ]);
}

// Prefixes the student's question with their stated goal/field (when known)
// so every mode — not just roadmap generation — is grounded in what they're
// actually studying, instead of the model guessing "software engineering".
function buildUserContent(question, goal) {
  if (!goal) return question;
  return `Student's stated goal/field: ${goal}\n\nQuestion: ${question}`;
}

async function askMentor(mode, question, history = [], goal = "") {
  const systemPrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.career;

  const messages = [{ role: "system", content: systemPrompt }];
  for (const turn of history) {
    messages.push({ role: "user", content: turn.question });
    messages.push({
      role: "assistant",
      content: JSON.stringify({ summary: turn.summary, steps: turn.steps, resources: turn.resources }),
    });
  }
  // Only inject the goal on modes where it isn't a pure code hint (code mode
  // is about the pasted code/bug, not the student's broader field).
  const finalQuestion = mode === "code" ? question : buildUserContent(question, goal);
  messages.push({ role: "user", content: finalQuestion });

  let result;
  try {
    result = await callGroqMessages(messages);
  } catch (e) {
    result = {
      summary: "The mentor is temporarily unavailable, here is a placeholder response.",
      steps: ["Check GROQ_API_KEY is set on the server", `Error: ${e.message}`],
      resources: [],
    };
  }
  result.summary = result.summary ?? "";
  result.steps = result.steps ?? [];
  result.resources = result.resources ?? [];
  const signal = result.roadmap_signal;
  result.roadmap_signal =
    signal && typeof signal === "object" && ["mastered", "struggling", "none"].includes(signal.status)
      ? { status: signal.status, topic: (signal.topic || "").trim() }
      : { status: "none", topic: "" };
  return result;
}

async function analyzeResume(resumeText, targetRole) {
  const userContent = `Target role: ${targetRole || "Not specified"}\n\nResume text:\n${resumeText.slice(0, 6000)}`;
  let result;
  try {
    result = await callGroq(RESUME_SYSTEM_PROMPT, userContent);
  } catch (e) {
    result = {
      score: 0,
      missing_skills: [],
      suggestions: [`Resume analysis unavailable: ${e.message}`],
    };
  }
  result.score = result.score ?? 0;
  result.missing_skills = result.missing_skills ?? [];
  result.suggestions = result.suggestions ?? [];
  return result;
}

// Returns the roadmap as an array of step label strings (used by the new roadmap route).
async function generateRoadmapSteps(goal) {
  let result;
  try {
    result = await callGroq(ROADMAP_SYSTEM_PROMPT, goal);
  } catch (e) {
    result = { roadmap: fallbackRoadmapFor(goal) };
  }
  const stages = Array.isArray(result.roadmap) ? result.roadmap.filter(Boolean) : [];
  return stages.length > 0 ? stages : fallbackRoadmapFor(goal);
}

// Legacy: kept for backward compat with the old /mentor/roadmap route (returns a string).
async function generateRoadmap(goal) {
  const steps = await generateRoadmapSteps(goal);
  return steps.join(" -> ");
}

module.exports = { askMentor, analyzeResume, generateRoadmap, generateRoadmapSteps };