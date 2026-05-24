/**
 * ════════════════════════════════════════════════════════════════
 * Slops Saloon Fantasy Football MVP (Corvus)
 * Prompt Loader — corvus_prompt_loader.js
 * ════════════════════════════════════════════════════════════════
 * Reads prompt templates from the /Blueprints/prompts directory and injects
 * runtime values before passing them to the Anthropic API.
 *
 * This replaces the hardcoded template strings in corvus_agents.js.
 * Prompts are now version-controlled markdown files that can be
 * edited without touching application code.
 *
 * Usage in corvus_agents.js:
 *   const { buildManagerPrompt, buildUserPrompt } = require("./corvus_prompt_loader");
 *   const systemPrompt = buildManagerPrompt({ vorpBlock, scarcityBlock, calibText, scoring, record, dataSource });
 *   const userPrompt   = buildUserPrompt({ week, signals, scoring, record });
 * ════════════════════════════════════════════════════════════════
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ── PROMPT FILE PATHS ────────────────────────────────────────────
const PROMPTS_DIR    = path.join(__dirname, "..", "Blueprints", "prompts");
const MANAGER_MD     = path.join(PROMPTS_DIR, "manager_agent.md");
const SUB_AGENTS_MD  = path.join(PROMPTS_DIR, "sub_agents.md");

// ── CACHE ─────────────────────────────────────────────────────────
// Prompts are read from disk once at startup and cached in memory.
// In production this means a deploy is required to update prompts.
// Set PROMPT_HOT_RELOAD=true in .env to re-read on every call
// (useful during active tuning, not recommended in production).
const HOT_RELOAD = process.env.PROMPT_HOT_RELOAD === "true";
const cache = {};

function readPromptFile(filePath) {
  if (!HOT_RELOAD && cache[filePath]) return cache[filePath];
  try {
    const content    = fs.readFileSync(filePath, "utf8");
    cache[filePath]  = content;
    return content;
  } catch (e) {
    console.error(`[PromptLoader] Failed to read ${filePath}: ${e.message}`);
    return null;
  }
}

/* ════════════════════════════════════════════════════════════════
   EXTRACT SYSTEM PROMPT FROM MARKDOWN
   The system prompt lives inside the first ``` code block
   under the "## System Prompt" heading in manager_agent.md.
   This function extracts it cleanly.
════════════════════════════════════════════════════════════════ */
function extractSection(markdown, heading) {
  if (!markdown) return null;
  // Find the heading
  const headingIdx = markdown.indexOf(`## ${heading}`);
  if (headingIdx === -1) return null;
  // Find the first code block after the heading
  const afterHeading = markdown.slice(headingIdx);
  const codeStart    = afterHeading.indexOf("```\n");
  if (codeStart === -1) return null;
  const contentStart = codeStart + 4; // skip the opening ```\n
  const codeEnd      = afterHeading.indexOf("\n```", contentStart);
  if (codeEnd === -1) return null;
  return afterHeading.slice(contentStart, codeEnd).trim();
}

/* ════════════════════════════════════════════════════════════════
   BUILD MANAGER AGENT SYSTEM PROMPT
   Reads manager_agent.md, extracts the system prompt template,
   and injects all runtime values.
════════════════════════════════════════════════════════════════ */
function buildManagerPrompt({
  vorpBlock    = "VORP data unavailable",
  scarcityBlock = "Scarcity data unavailable",
  calibText    = "",
  scoring      = "PPR",
  record       = "N/A",
  dataSource   = "cloud",
}) {
  const markdown = readPromptFile(MANAGER_MD);
  let template   = extractSection(markdown, "System Prompt");

  // Fallback to hardcoded prompt if file read fails
  if (!template) {
    console.warn("[PromptLoader] manager_agent.md not found — using hardcoded fallback prompt");
    return buildFallbackManagerPrompt({ vorpBlock, scarcityBlock, calibText, scoring, record, dataSource });
  }

  // Inject runtime values — replace all {{PLACEHOLDER}} tokens
  return template
    .replace("{{VORP_BLOCK}}",      vorpBlock)
    .replace("{{SCARCITY_BLOCK}}",  scarcityBlock)
    .replace("{{CALIBRATION_BLOCK}}", calibText
      ? `HISTORICAL CALIBRATION:\n${calibText}`
      : "(No calibration data yet — this improves after the first Tuesday scoring run)")
    .replace(/{{SCORING}}/g,    scoring)
    .replace(/{{RECORD}}/g,     record)
    .replace(/{{DATA_SOURCE}}/g, dataSource);
}

/* ════════════════════════════════════════════════════════════════
   BUILD USER PROMPT
   Reads the user prompt template from manager_agent.md and
   injects the week number and all six agent signals.
════════════════════════════════════════════════════════════════ */
function buildUserPrompt({
  week    = "N/A",
  signals = {},
  scoring = "PPR",
  record  = "N/A",
}) {
  const markdown = readPromptFile(MANAGER_MD);
  let template   = extractSection(markdown, "User Prompt Template");

  if (!template) {
    console.warn("[PromptLoader] User prompt template not found — using hardcoded fallback");
    return buildFallbackUserPrompt({ week, signals, scoring, record });
  }

  return template
    .replace("{{WEEK}}",            String(week))
    .replace("{{WEATHER_SIGNAL}}",  signals.weather   || "N/A")
    .replace("{{TRAVEL_SIGNAL}}",   signals.travel    || "N/A")
    .replace("{{GAMETIME_SIGNAL}}", signals.gametime  || "N/A")
    .replace("{{ROSTER_SIGNAL}}",   signals.roster    || "N/A")
    .replace("{{PERF_SIGNAL}}",     signals.perf      || "N/A")
    .replace("{{MATCHUP_SIGNAL}}",  signals.matchup   || "N/A")
    .replace(/{{SCORING}}/g,        scoring)
    .replace(/{{RECORD}}/g,         record);
}

/* ════════════════════════════════════════════════════════════════
   BUILD SUB-AGENT PROMPT
   Reads sub_agents.md and extracts the prompt for a given agent.
   Used when you want to run sub-agents as actual AI calls
   rather than hardcoded string returns.
════════════════════════════════════════════════════════════════ */
function buildSubAgentPrompt(agentName, variables = {}) {
  const markdown = readPromptFile(SUB_AGENTS_MD);
  if (!markdown) return null;

  // Find the agent's prompt section
  const agentHeadings = {
    weather:  "Agent 1 — Weather Agent",
    travel:   "Agent 2 — Travel Agent",
    gametime: "Agent 3 — Game Time Agent",
    roster:   "Agent 4 — Roster Agent",
    perf:     "Agent 5 — Performance Agent",
    matchup:  "Agent 6 — Matchup Agent",
  };

  const heading  = agentHeadings[agentName];
  if (!heading) throw new Error(`Unknown agent: ${agentName}`);

  const headingIdx = markdown.indexOf(`## ${heading}`);
  if (headingIdx === -1) return null;

  // Extract from this heading to the next ## heading
  const section    = markdown.slice(headingIdx);
  const nextH2     = section.indexOf("\n## ", 4);
  const sectionStr = nextH2 > -1 ? section.slice(0, nextH2) : section;

  // Find the prompt code block within this section
  const codeStart = sectionStr.indexOf("```\n");
  if (codeStart === -1) return null;
  const contentStart = codeStart + 4;
  const codeEnd      = sectionStr.indexOf("\n```", contentStart);
  if (codeEnd === -1) return null;

  let prompt = sectionStr.slice(contentStart, codeEnd).trim();

  // Replace all {{VARIABLE}} tokens with provided values
  for (const [key, val] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, "g");
    prompt = prompt.replace(placeholder, String(val ?? "N/A"));
  }

  return prompt;
}

/* ════════════════════════════════════════════════════════════════
   PROMPT METADATA
   Returns version and last-tuned date from the markdown frontmatter.
   Useful for logging which prompt version produced each move.
════════════════════════════════════════════════════════════════ */
function getPromptMetadata() {
  const markdown = readPromptFile(MANAGER_MD);
  if (!markdown) return { version: "unknown", lastTuned: "unknown" };

  const versionMatch  = markdown.match(/\*\*Version:\*\*\s*([\d.]+)/);
  const lastTunedMatch= markdown.match(/\*\*Last tuned:\*\*\s*(\S+)/);

  return {
    version:   versionMatch?.[1]   || "unknown",
    lastTuned: lastTunedMatch?.[1] || "unknown",
    hotReload: HOT_RELOAD,
  };
}

/* ════════════════════════════════════════════════════════════════
   HARDCODED FALLBACKS
   Used only if the markdown files cannot be read.
   These mirror the original prompts from corvus_agents.js exactly.
════════════════════════════════════════════════════════════════ */
function buildFallbackManagerPrompt({ vorpBlock, scarcityBlock, calibText, scoring, record, dataSource }) {
  return `You are the Slops Saloon Fantasy Football MVP Manager Agent — an elite fantasy football GM AI.

CRITICAL INSTRUCTION — READ BEFORE REASONING:
You will receive two MATH-FACT blocks below. These are calculated from real statistical data.
You MUST base your confidence score on the math before applying narrative reasoning.
Do NOT contradict a positive VORP grade with a low confidence score without explicit positional justification.
Do NOT ignore a CRITICAL scarcity bonus — add it to your base confidence.

${vorpBlock}

${scarcityBlock}

${calibText ? `HISTORICAL CALIBRATION:\n${calibText}` : ""}

OUTPUT FORMAT — return ONLY valid JSON, no markdown:
{
  "moveType":       string,
  "headline":       string,
  "targetPlayer":   string,
  "targetPosition": string,
  "confidence":     number,
  "vorpGrade":      string,
  "scarcityBonus":  number,
  "reasoning":      string,
  "shortVerdict":   string,
  "dataSource":     "${dataSource}"
}

SCORING FORMAT: ${scoring}
TEAM RECORD: ${record}`;
}

function buildFallbackUserPrompt({ week, signals, scoring, record }) {
  return `AGENT INTELLIGENCE REPORT — Week ${week}:
WEATHER:     ${signals.weather   || "N/A"}
TRAVEL:      ${signals.travel    || "N/A"}
GAME TIME:   ${signals.gametime  || "N/A"}
ROSTER:      ${signals.roster    || "N/A"}
PERFORMANCE: ${signals.perf      || "N/A"}
MATCHUP:     ${signals.matchup   || "N/A"}

SCORING FORMAT: ${scoring}
TEAM RECORD:    ${record}

Using the MATH-FACT blocks in your system prompt alongside these agent signals,
generate the single best move for this GM this week.`;
}

/* ════════════════════════════════════════════════════════════════
   EXPORTS
════════════════════════════════════════════════════════════════ */
module.exports = {
  buildManagerPrompt,
  buildUserPrompt,
  buildSubAgentPrompt,
  getPromptMetadata,
};

/*
  ════════════════════════════════════════════════════════════════
  HOW TO WIRE INTO corvus_agents.js
  ════════════════════════════════════════════════════════════════

  1. Add at the top of corvus_agents.js:

     const {
       buildManagerPrompt,
       buildUserPrompt,
       getPromptMetadata,
     } = require("./corvus_prompt_loader");

  2. Replace the hardcoded systemPrompt block in runAgentPipeline():

     // BEFORE:
     const systemPrompt = `You are the Slops Saloon Fantasy Football MVP Manager Agent...`;

     // AFTER:
     const systemPrompt = buildManagerPrompt({
       vorpBlock,
       scarcityBlock,
       calibText,
       scoring,
       record,
       dataSource,
     });

  3. Replace the hardcoded userPrompt:

     // BEFORE:
     const userPrompt = `AGENT INTELLIGENCE REPORT — Week ${week}:...`;

     // AFTER:
     const userPrompt = buildUserPrompt({ week, signals, scoring, record });

  4. Log the prompt version with each move (optional but recommended):

     const meta = getPromptMetadata();
     log.info(`Prompt version: ${meta.version} (tuned: ${meta.lastTuned})`);

  ════════════════════════════════════════════════════════════════
  FOLDER STRUCTURE AFTER ADDING THESE FILES
  ════════════════════════════════════════════════════════════════

  slops-saloon/
  ├── src/
  │   ├── corvus_agents.js
  │   ├── corvus_api_v2.js
  │   ├── corvus_tuesday_cron.js
  │   ├── corvus_gdpr.js
  │   └── corvus_prompt_loader.js    ← this file
  ├── Blueprints/
  │   └── prompts/
  │       ├── manager_agent.md        ← Manager Agent system + user prompts
  │       ├── sub_agents.md           ← All 6 sub-agent prompt templates
  │       └── PROMPTS_CHANGELOG.md    ← Required edit log
  ├── client/
  │   └── Corvus_v2_full.jsx
  └── ...

  ════════════════════════════════════════════════════════════════
  ENVIRONMENT VARIABLES
  ════════════════════════════════════════════════════════════════

  # Add to .env:
  PROMPT_HOT_RELOAD=false   # set to true during active prompt tuning only
*/
