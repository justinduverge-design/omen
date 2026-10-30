"use strict";

// STANDARDS card F: the script header check accepts a leading comment after the usual preamble
// and refuses a script that starts with code.

const assert = require("node:assert/strict");
const test = require("node:test");

const { hasHeader, isScript } = require("../scripts/checks/script-headers");

test("a leading comment after shebang, strict mode, set and imports is a header", () => {
  assert.ok(hasHeader("#!/usr/bin/env node\n// Does a thing.\n"));
  assert.ok(hasHeader('#!/usr/bin/env node\n"use strict";\n\n/**\n * Does a thing.\n */\n'));
  assert.ok(hasHeader("#!/usr/bin/env bash\nset -Eeuo pipefail\n# Does a thing.\n"));
  assert.ok(hasHeader('import json\nfrom pathlib import Path\n"""Does a thing."""\n'));
  assert.ok(hasHeader('#!/bin/sh\n# --help prints this and exits.\ncase "$1" in\n'));
});

test("code before any comment is not a header", () => {
  assert.ok(!hasHeader("#!/usr/bin/env bash\nset -eu\nHOST=x\n# late comment\n"));
  assert.ok(!hasHeader('"use strict";\nconst fs = require("fs");\nfunction main() {}\n'));
  assert.ok(!hasHeader(""));
});

test("scripts are known extensions or extensionless files with a shebang", () => {
  assert.ok(isScript("scripts/a.mjs", ""));
  assert.ok(isScript("ops/x/omen-football-run", "#!/bin/sh\n"));
  assert.ok(!isScript("ops/x/omen-football.timer", "[Unit]\n"));
  assert.ok(!isScript("ops/x/README", "Notes\n"));
});
