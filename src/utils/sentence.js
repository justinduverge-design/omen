"use strict";

// A sentence that ends on a name already ending in a full stop ("Brian Thomas Jr.") must not end in "..".
function endSentence(text) {
  return typeof text === "string" ? text.replace(/\.\.$/, ".") : text;
}

module.exports = { endSentence };
