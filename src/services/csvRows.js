"use strict";

// RFC-4180-style CSV reading for nflverse files: quoted fields may hold commas and doubled quotes.
// Same rules as matchupService's `_parseCsvLine` (proven against nflverse), as a reusable module.

function parseCsvLine(line = "") {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function parseCsv(csvText, { required = [] } = {}) {
  const lines = String(csvText || "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  for (const column of required) {
    if (!headers.includes(column)) throw new Error(`missing required column: ${column}`);
  }
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, i) => { row[header] = values[i] == null ? "" : values[i].trim(); });
    return row;
  });
}

module.exports = { parseCsv, parseCsvLine };
