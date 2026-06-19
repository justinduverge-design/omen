"use strict";

const express = require("express");
const { buildDemoModeResponse } = require("../services/demoMode");

const router = express.Router();

router.get("/", (_req, res) => {
  res.json(buildDemoModeResponse());
});

module.exports = router;
