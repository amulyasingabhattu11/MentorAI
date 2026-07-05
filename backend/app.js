// app.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");

require("./db"); // creates tables on require

const authRoutes = require("./routes/auth");
const mentorRoutes = require("./routes/mentor");
const resumeRoutes = require("./routes/resume");
const dashboardRoutes = require("./routes/dashboard");
const roadmapRoutes = require("./routes/roadmap");
const suggestionsRoutes = require("./routes/suggestions");
const resourcesRoutes = require("./routes/resources");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/mentor", mentorRoutes);
app.use("/resume", resumeRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/roadmap", roadmapRoutes);
app.use("/suggestions", suggestionsRoutes);
app.use("/resources", resourcesRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`MentorAI backend running on http://localhost:${PORT}`);
});

module.exports = app;