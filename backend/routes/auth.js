// routes/auth.js — mirrors backend/routes/auth.py

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { findUserByEmail, createUser, userToDict } = require("../db");

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET_KEY || "dev-secret-change-me", {
    expiresIn: "7d",
  });
}

router.post("/signup", (req, res) => {
  const body = req.body || {};
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }

  if (findUserByEmail(email)) {
    return res.status(409).json({ error: "an account with this email already exists" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = createUser({ name, email, passwordHash });
  const token = signToken(user.id);

  res.status(201).json({ token, user: userToDict(user) });
});

router.post("/login", (req, res) => {
  const body = req.body || {};
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  const user = findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "invalid email or password" });
  }

  const token = signToken(user.id);
  res.status(200).json({ token, user: userToDict(user) });
});

module.exports = router;
