// api.js — mirrors frontend/src/api.js (same endpoints, same shapes), plain fetch instead of
// import.meta.env: since there's no build step, the API base URL is just a plain constant.
// Change this if your backend runs somewhere other than localhost:5000.

const BASE_URL = window.MENTORAI_API_URL || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("mentorai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed with ${res.status}`);
  }
  return data;
}

const api = {
  signup: (name, email, password) =>
    fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    }).then(handle),

  login: (email, password) =>
    fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(handle),

  // conversationId is optional: omit it to start a new thread, pass it to
  // reply within an existing one.
  askMentor: (mode, question, conversationId) =>
    fetch(`${BASE_URL}/mentor/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ mode, question, conversation_id: conversationId || undefined }),
    }).then(handle),

  // now returns one row per conversation: { conversation_id, mode, title,
  // last_message, turn_count, created_at, updated_at }
  mentorHistory: (mode) =>
    fetch(`${BASE_URL}/mentor/history${mode ? `?mode=${mode}` : ""}`, {
      headers: { ...authHeaders() },
    }).then(handle),
  deleteConversation: (conversationId) => {
    const id = Number(conversationId);
    if (!Number.isFinite(id)) {
      return Promise.reject(new Error("Invalid conversation id"));
    }
    return fetch(`${BASE_URL}/mentor/conversations/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    }).then(handle);
  },
  // full ordered list of turns for one thread
  getConversation: (conversationId) =>
    fetch(`${BASE_URL}/mentor/conversations/${conversationId}`, {
      headers: { ...authHeaders() },
    }).then(handle),

  dashboardStats: () =>
    fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { ...authHeaders() },
    }).then(handle),

  // powers the Progress page: streak, XP/level, study-hours chart, skills
  // radar, topic progress, and roadmap step status
  progressStats: () =>
    fetch(`${BASE_URL}/dashboard/progress`, {
      headers: { ...authHeaders() },
    }).then(handle),

  analyzeResume: (file, targetRole) => {
    const form = new FormData();
    form.append("file", file);
    form.append("target_role", targetRole || "");
    return fetch(`${BASE_URL}/resume/analyze`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: form,
    }).then(handle);
  },

  resumeHistory: () =>
    fetch(`${BASE_URL}/resume/history`, {
      headers: { ...authHeaders() },
    }).then(handle),

  me: () =>
    fetch(`${BASE_URL}/auth/me`, {
      headers: { ...authHeaders() },
    }).then(handle),

  updateProfile: (goal, careerRoadmap) =>
    fetch(`${BASE_URL}/auth/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ goal, career_roadmap: careerRoadmap }),
    }).then(handle),
  
  generateRoadmap: (goal) =>
    fetch(`${BASE_URL}/mentor/roadmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ goal }),
    }).then(handle),
};