// llm.js — Groq calls + prompts (mirrors backend/llm.py from the Flask version)

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const MODE_PROMPTS = {
  career:
    "You are a career mentor for a CS student. Given the student's question, " +
    "respond ONLY with a JSON object (no markdown, no code fences) in this exact shape: " +
    '{"summary": "1-2 sentence overview", "steps": ["step 1", "step 2", "step 3"], ' +
    '"resources": ["resource or topic to look up", "..."]}. ' +
    "Keep steps concrete and actionable, 3-5 items. Keep resources as topic names, not fake links.",

  academic:
    "You are an academic mentor helping a CS student understand a concept or solve a doubt. " +
    "Respond ONLY with a JSON object (no markdown, no code fences) in this exact shape: " +
    '{"summary": "clear 1-2 sentence explanation of the core idea", ' +
    '"steps": ["a worked breakdown, step by step"], ' +
    '"resources": ["related concept or topic to study next"]}. ' +
    "Be precise and correct; do not oversimplify to the point of being wrong.",

  code:
    "You are a coding mentor. The student wants HINTS, not full solutions or full code. " +
    "Respond ONLY with a JSON object (no markdown, no code fences) in this exact shape: " +
    '{"summary": "restate the problem/bug in one line", ' +
    '"steps": ["a guiding hint, not a full solution", "another hint that narrows it down"], ' +
    '"resources": ["relevant concept, data structure, or pattern to review"]}. ' +
    "Never output a complete working solution, only progressively revealing hints.",
};

const RESUME_SYSTEM_PROMPT =
  "You are an ATS and career-readiness reviewer for a student resume. Given raw resume text " +
  "and an optional target role, respond ONLY with a JSON object (no markdown, no code fences) " +
  "in this exact shape: " +
  '{"score": <integer 0-100 ATS/readiness score>, ' +
  '"missing_skills": ["skill relevant to the target role that is absent"], ' +
  '"suggestions": ["specific, actionable suggestion to improve the resume"]}. ' +
  "Base the score on clarity, quantified impact, relevant skills coverage, and formatting cues " +
  "you can infer from plain text. Give 4-6 suggestions.";

const ROADMAP_SYSTEM_PROMPT =
  "You are a career mentor creating a step-by-step career roadmap for a CS student. " +
  "Given the student's goal, respond ONLY with a JSON object (no markdown, no code fences) " +
  'in this exact shape: {"roadmap": ["stage 1", "stage 2", "stage 3", "stage 4"]}. ' +
  "Keep each stage short (3-6 words), ordered chronologically from where a beginner would " +
  "start through to achieving the goal, 4-6 stages total.";

async function callGroq(systemPrompt, userContent) {
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
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
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

async function askMentor(mode, question) {
  const systemPrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.career;
  let result;
  try {
    result = await callGroq(systemPrompt, question);
  } catch (e) {
    // Fail soft so the demo never shows a raw 500 — still useful for grading
    result = {
      summary: "The mentor is temporarily unavailable, here is a placeholder response.",
      steps: ["Check GROQ_API_KEY is set on the server", `Error: ${e.message}`],
      resources: [],
    };
  }
  result.summary = result.summary ?? "";
  result.steps = result.steps ?? [];
  result.resources = result.resources ?? [];
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

async function generateRoadmap(goal) {
  let result;
  try {
    result = await callGroq(ROADMAP_SYSTEM_PROMPT, goal);
  } catch (e) {
    result = { roadmap: [`Roadmap unavailable: ${e.message}`] };
  }
  const stages = Array.isArray(result.roadmap) ? result.roadmap.filter(Boolean) : [];
  return stages.join(" -> ");
}

module.exports = { askMentor, analyzeResume, generateRoadmap };