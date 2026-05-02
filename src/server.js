"use strict";

const express = require("express");
const app     = express();

app.use(express.json());

// Health check — direct route, no router dependency
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "ssffmvp-api", uptime: process.uptime() });
});

// Root
app.get("/", (req, res) => {
  res.json({ service: "Slops Saloon Fantasy Football MVP", status: "live" });
});

// Mount API routes
try {
  const apiRoutes = require("./ssffmvp_api_v2");
  app.use("/api", apiRoutes);
} catch (e) {
  console.error("API routes failed to load:", e.message);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SSFFMVP API is live on port ${PORT}`));
