#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nativeConnectRoots = [
  path.join(root, "mobile/ios/OmenIOS/OmenIOS/App/Connect"),
  path.join(root, "mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/connect"),
];

// These identifiers and user-facing phrases belonged to the retired native desktop-helper
// fallback. The public web guide has a separate lifecycle; this gate covers shipping app sources.
const forbidden = [
  "unsupportedOnMobile",
  "UnsupportedOnMobile",
  "checkingEspnConnection",
  "SIGN_IN_FELL_BACK",
  "espnSetupURL",
  "Open ESPN setup",
  "I connected ESPN",
  "desktop helper",
  "finish on a computer",
];

function nativeSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return nativeSourceFiles(full);
    return entry.isFile() && (entry.name.endsWith(".swift") || entry.name.endsWith(".kt")) ? [full] : [];
  });
}

const findings = [];
for (const directory of nativeConnectRoots) {
 for (const file of nativeSourceFiles(directory)) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const phrase of forbidden) {
      if (line.includes(phrase)) {
        findings.push(`${path.relative(root, file)}:${index + 1}: retired native path: ${phrase}`);
      }
    }
  });
 }
}

if (findings.length) {
  console.error(findings.join("\n"));
  console.error("Retired production UI must be deleted, not retained as a fallback.");
  process.exit(1);
}

console.log("retired native path check: PASS");
