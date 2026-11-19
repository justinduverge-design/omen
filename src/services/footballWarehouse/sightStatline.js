"use strict";

// The stat-line layer is reserved for Sight v3; it is not wired into serving yet.
const SIGHT_VERSION = "v3";

module.exports = {
  SIGHT_VERSION,
  ...require("./sightStatlineConstants"),
  ...require("./sightStatlinePriors"),
  ...require("./sightStatlineProject"),
  ...require("./sightStatlineForecast"),
};
