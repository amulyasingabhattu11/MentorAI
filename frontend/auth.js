// auth.js — mirrors frontend/src/AuthContext.jsx.
// React's Context/useState becomes a plain object backed by localStorage;
// "re-rendering on auth change" becomes "call render() again after login/logout".

const auth = {
  getUser() {
    const raw = localStorage.getItem("mentorai_user");
    return raw ? JSON.parse(raw) : null;
  },

  login(token, user) {
    localStorage.setItem("mentorai_token", token);
    localStorage.setItem("mentorai_user", JSON.stringify(user));
  },

  // used after a profile edit, when we already have a token and just need
  // to refresh the cached user object (name/email/goal/career_roadmap)
  updateUser(user) {
    localStorage.setItem("mentorai_user", JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem("mentorai_token");
    localStorage.removeItem("mentorai_user");
  },
};
