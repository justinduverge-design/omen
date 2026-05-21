"use strict";

const express = require("express");
const config = require("../config");
const {
  getHealthStatus,
  getOmenOfTheWeekMock,
  getPlatformStatus,
} = require("../services/systemContracts");
const {
  authenticateOmenRequest,
  getLiveOmenForUser,
} = require("../services/omen");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json(getHealthStatus());
});

router.get("/session", async (req, res) => {
  const unauthenticated = {
    authenticated: false,
    user: null,
    contract_version: "session.v1",
  };

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.json(unauthenticated);
  }

  try {
    const user = await authenticateOmenRequest(authHeader);
    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || null,
      },
      contract_version: "session.v1",
    });
  } catch (_e) {
    return res.json(unauthenticated);
  }
});

router.get("/omen-of-the-week", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || req.query.preview === "mock") {
      return res.json(getOmenOfTheWeekMock());
    }

    const user = await authenticateOmenRequest(authHeader);
    return res.json(await getLiveOmenForUser(user.id));
  } catch (e) {
    if (e.status === 401) {
      return res.status(401).json({ error: e.message });
    }
    return next(e);
  }
});

router.get("/platform-status", (_req, res) => {
  res.json(getPlatformStatus(config));
});

module.exports = router;
