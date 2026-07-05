// api.js — all API calls to the MentorAI backend

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

  askMentor: (mode, question, conversationId) =>
    fetch(`${BASE_URL}/mentor/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ mode, question, conversation_id: conversationId || undefined }),
    }).then(handle),

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

  getConversation: (conversationId) =>
    fetch(`${BASE_URL}/mentor/conversations/${conversationId}`, {
      headers: { ...authHeaders() },
    }).then(handle),

  dashboardStats: () =>
    fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { ...authHeaders() },
    }).then(handle),

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

  // ---- Career Roadmap ----

  listRoadmaps: () =>
    fetch(`${BASE_URL}/roadmap/list`, {
      headers: { ...authHeaders() },
    }).then(handle),

  getRoadmap: (id) =>
    fetch(`${BASE_URL}/roadmap/${id}`, {
      headers: { ...authHeaders() },
    }).then(handle),

  createRoadmap: (goal, title) =>
    fetch(`${BASE_URL}/roadmap/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ goal, title }),
    }).then(handle),

  updateRoadmapStep: (roadmapId, stepIdx, completed) =>
    fetch(`${BASE_URL}/roadmap/${roadmapId}/step/${stepIdx}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ completed }),
    }).then(handle),

  deleteRoadmap: (id) =>
    fetch(`${BASE_URL}/roadmap/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    }).then(handle),
};
