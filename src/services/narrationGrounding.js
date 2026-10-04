"use strict";

/**
 * Grounding validator for LLM-phrased narration.
 *
 * Omen's v1 thesis: the model may PHRASE reasons that the deterministic engine
 * already produced, but must never ADD reasons. This module is the gate. Text
 * is accepted only when every number, name-like token and stat claim in it can
 * be traced to the facts payload that was handed to the model. Anything else is
 * rejected and callers fall back to their deterministic text.
 *
 * Pure and synchronous: no I/O, no model calls.
 */

const DEFAULT_MAX_WORDS = 50;
const DEFAULT_MAX_SENTENCES = 2;
const DEFAULT_MAX_CHARS = 400;

// Function words and neutral analyst vocabulary a rephrasing may use. Only
// consulted for capitalized tokens (sentence starters), so it stays short.
const COMMON_WORDS = new Set((
  "a an and are as at be because but by can for from has have he her him his if in into is it its " +
  "more most no not of on one only or our over she so than that the their them then there these they " +
  "this to up we while with you your will would should could may might also both either each still " +
  "start starting starts sit bench benching benched keep put play playing move moving swap swapping " +
  "pick add drop hold lineup roster slot week projected projection projections points point pts " +
  "edge gap lead leads ahead behind higher lower better stronger weaker bigger smaller clear close " +
  "meaningful small modest solid risk risky safe safer confidence confident medium high low " +
  "questionable doubtful out active injured injury status available unavailable matchup matchups " +
  "data source sources signal signals provider providers expected value delta difference " +
  "omen based using given here since when where which who what why how however overall " +
  "expect expects likely unlikely though although instead rather just simply plainly " +
  "waiver pickup trade accept decline neutral live mock deterministic " +
  "adds gives brings offers provides makes keeps leaves lets helps means shows reflects favors " +
  "recommend recommends recommended strong healthy best good great top another any all other some " +
  "many much key main primary reason move choice call option player players role those these " +
  "gets get got ranks lines line up down about around across after before during without within " +
  "sitting starting benching choosing choose trust go going stay staying lean leaning " +
  "i'd i'll i'm id ill im we'd we'll you'd you'll let's lets it's its that's thats there's " +
  "if when since given considering consider look looking note noting go with plan stick sticking " +
  "bet backing back favor favoring prefer preferring take taking use using rely relying " +
  "projected-higher higher-projected pass passing okay ok yes no do does don't dont can't cant"
).split(/\s+/));

// Stat/usage claims a small model likes to invent. Each is rejected unless the
// same phrase already appears in the facts.
const STAT_TERMS = Object.freeze([
  "target share", "targets", "snap", "snaps", "snap count", "carries", "touches", "touchdown",
  "touchdowns", "yards", "yardage", "receptions", "red zone", "red-zone", "air yards", "routes",
  "usage", "volume", "workload", "opportunity share", "completion", "interceptions", "sacks",
  "weather", "wind", "rain", "snow", "dome", "revenge game", "bye", "streak", "trending",
  "last week", "last game", "past games", "career", "season-long", "per game", "ppr",
  "defense ranks", "ranked", "rank", "game script", "pace", "offensive line", "coach", "coaching",
  "depth chart", "contract", "rookie", "veteran",
  // Unsupported "reason" language: each is a claim the engine never made, so it
  // is allowed only when the same phrase is already in the facts.
  "dominant", "dominating", "lately", "recently", "recent form", "form", "momentum", "hot", "cold",
  "great matchup", "good matchup", "easy matchup", "plus matchup", "soft matchup", "tough matchup",
  "favorable", "unfavorable", "soft defense", "weak defense", "poor defense", "bad defense",
  "tough defense", "stout", "elite", "upside", "ceiling", "floor", "boom", "bust", "breakout",
  "locked in", "locked-in", "must-start", "must start", "must-sit", "smash", "smash spot",
  "workhorse", "bellcow", "lead back", "featured", "explosive", "efficient", "efficiency",
  "rested", "fresh legs", "hot streak", "cold streak", "points allowed", "shootout", "blowout",
  "garbage time", "target", "red-hot", "on fire", "league-winner", "league winner", "sleeper pick",
]);

const POSITION_TAGS = new Set(["QB", "RB", "WR", "TE", "K", "DEF", "DST", "FLEX", "IR"]);

const NUMBER_WORDS = Object.freeze([
  "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "twenty", "thirty", "forty", "fifty", "hundred", "dozen", "half", "double", "triple",
]);

const BANNED_PATTERNS = Object.freeze([
  { code: "guarantee", re: /\b(guarantee[ds]?|guaranteeing|lock(?:ed)?\s+in|can'?t\s+miss|sure\s+thing|no[- ]brainer|certain(?:ly)?|definitely|surely)\b/i },
  {
    code: "beats_projections",
    re: /\b(beat|beats|beating|outperform\w*|outsmart\w*|more\s+accurate\s+than|better\s+than|improv\w+\s+on|ahead\s+of)\s+(?:the\s+|all\s+|any\s+)?(?:provider\s+|consensus\s+|expert\s+)?(?:projections?|consensus|experts?|analysts?|sleeper|espn|yahoo)\b/i,
  },
  { code: "own_prediction", re: /\b(?:omen|we|our\s+model|the\s+model|ai|our\s+algorithm)\s+(?:predicts?|forecasts?|projects?|simulates?|believes?|thinks?)\b|\bour\s+(?:prediction|forecast|model|algorithm|projection)\b/i },
  { code: "numeric_confidence", re: /\d+(?:\.\d+)?\s*%|\bout\s+of\s+(?:100|10)\b|\b(?:confidence|chance|probability|odds|likelihood)\b[^.!?]{0,40}\d|\d[^.!?]{0,20}\b(?:confidence|chance|probability|odds|likelihood)\b/i },
]);

function stripToken(token) {
  return String(token)
    .toLowerCase()
    .replace(/['’]s$/, "")
    .replace(/['’.]/g, "")
    .replace(/^-+|-+$/g, "");
}

function wordsOf(text) {
  return (String(text).match(/[A-Za-z][A-Za-z'’.-]*/g) || [])
    .map((token) => token.replace(/[.-]+$/, ""));
}

function collectLeaves(value, strings, numbers, depth = 0) {
  if (depth > 8 || value == null) return;
  if (typeof value === "number") {
    if (Number.isFinite(value)) numbers.push(value);
  } else if (typeof value === "string") {
    strings.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectLeaves(item, strings, numbers, depth + 1);
  } else if (typeof value === "object") {
    for (const item of Object.values(value)) collectLeaves(item, strings, numbers, depth + 1);
  }
}

/**
 * Index a facts payload: lowercase phrase text, a word set, and every number
 * (including numbers embedded in strings such as "+3.5 pts").
 */
function buildFactIndex(facts) {
  const strings = [];
  const numbers = [];
  collectLeaves(facts, strings, numbers);
  const words = new Set();
  for (const text of strings) {
    for (const token of wordsOf(text)) {
      words.add(stripToken(token));
      for (const part of token.split("-")) words.add(stripToken(part));
    }
    for (const match of text.match(/\d+(?:\.\d+)?/g) || []) numbers.push(Number(match));
  }
  return {
    text: strings.join(" \n ").toLowerCase(),
    words,
    numbers: numbers.filter(Number.isFinite),
  };
}

function decimalsOf(token) {
  const dot = token.indexOf(".");
  return dot === -1 ? 0 : token.length - dot - 1;
}

function numberIsGrounded(token, factNumbers) {
  const value = Number(token);
  if (!Number.isFinite(value)) return false;
  const decimals = decimalsOf(token);
  return factNumbers.some((fact) => {
    const magnitude = Math.abs(fact);
    // Same value at the precision the text uses: 3.5 grounds "3.5", "3.50",
    // and (rounded) "4"; 4.65 grounds "4.65", "4.7" and "5".
    return Number(magnitude.toFixed(decimals)) === value
      || Number(magnitude.toFixed(Math.max(decimals, 0))) === value
      || (decimals === 0 && Math.round(magnitude) === value);
  });
}

function splitSentences(text) {
  return String(text).split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
}

function countWords(text) {
  return String(text || "").match(/\b[\w'-]+\b/g)?.length || 0;
}

const ABBREVIATIONS = new Set(["st", "jr", "sr", "mr", "mrs", "ms", "dr", "vs", "inc"]);

/**
 * Counts sentence ends only: [.!?] followed by whitespace and an uppercase
 * letter (or end of text), and not a period closing a short abbreviation or an
 * initial ("St. Brown", "Jr.", "D.J. Moore").
 */
function countSentences(text) {
  const value = String(text || "").trim();
  if (!value) return 0;
  let count = 0;
  const re = /[.!?]+(?=\s+[A-Z"'\u201C(]|\s*$)/g;
  let match;
  while ((match = re.exec(value)) !== null) {
    if (match[0] === ".") {
      const before = value.slice(0, match.index).match(/([A-Za-z.]+)$/);
      const token = before ? before[1] : "";
      const bare = token.replace(/\./g, "").toLowerCase();
      const isInitials = /^(?:[A-Za-z]\.)+[A-Za-z]?$/.test(token) || (token.length === 1 && /[A-Z]/.test(token));
      if (ABBREVIATIONS.has(bare) || isInitials) {
        if (match.index + 1 < value.length) continue;
      }
    }
    count += 1;
  }
  return count || 1;
}

/**
 * @param {string} text   model output to check
 * @param {object} facts  the exact payload given to the model
 * @param {object} [opts]
 * @param {number[]} [opts.disallowNumbers] numbers that exist in facts but must never be quoted (e.g. the numeric confidence score)
 * @param {string[]} [opts.extraAllowedWords] additional allowed capitalized tokens
 * @returns {{ ok: boolean, reasons: string[] }}
 */
function validateGroundedTextUnsafe(text, facts, opts) {
  const {
    maxWords = DEFAULT_MAX_WORDS,
    maxSentences = DEFAULT_MAX_SENTENCES,
    maxChars = DEFAULT_MAX_CHARS,
    disallowNumbers = [],
    extraAllowedWords = [],
  } = opts || {};
  const reasons = [];
  if (typeof text !== "string" || !text.trim()) return { ok: false, reasons: ["empty"] };
  const value = text.trim();

  if (value.length > maxChars) reasons.push("too_long_chars");
  if (countWords(value) > maxWords) reasons.push("too_many_words");
  if (countSentences(value) > maxSentences) reasons.push("too_many_sentences");
  if (/[`*#_]{2,}|^\s*[-*]\s|\n\s*[-*]\s|```/.test(value)) reasons.push("markdown");

  for (const { code, re } of BANNED_PATTERNS) {
    if (re.test(value)) reasons.push(`banned:${code}`);
  }

  const index = buildFactIndex(facts);
  const blocked = new Set(disallowNumbers.filter(Number.isFinite).map(Number));

  // Position tags such as WR1 / RB2 / FLEX are labels, not claims.
  const numberText = value.replace(/\b(?:QB|RB|WR|TE|K|DEF|DST)\s?\d\b/g, " ");
  for (const token of numberText.match(/\d+(?:\.\d+)?/g) || []) {
    if (blocked.has(Number(token)) || !numberIsGrounded(token, index.numbers)) {
      reasons.push(`ungrounded_number:${token}`);
    }
  }

  const lower = value.toLowerCase();
  for (const word of NUMBER_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(lower) && !index.words.has(word)) {
      reasons.push(`ungrounded_number_word:${word}`);
    }
  }
  for (const term of STAT_TERMS) {
    const hit = new RegExp(`(^|[^a-z])${term.replace(/[-\s]/g, "[-\\s]")}([^a-z]|$)`).test(lower);
    if (hit && !index.text.includes(term)) reasons.push(`ungrounded_stat:${term}`);
  }

  const extra = new Set(extraAllowedWords.map(stripToken));
  const sentenceStarts = new Set(splitSentences(value).map((s) => wordsOf(s)[0]).filter(Boolean));
  for (const token of wordsOf(value)) {
    if (!/^[A-Z]/.test(token)) continue;
    if (POSITION_TAGS.has(token)) continue;
    const parts = token.split("-").map(stripToken).filter(Boolean);
    const known = parts.every((part) => index.words.has(part) || extra.has(part) || part === "omen"
      || (sentenceStarts.has(token) && COMMON_WORDS.has(part)));
    if (!known) reasons.push(`ungrounded_name:${token}`);
  }

  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}

/** Never throws: any internal failure is a rejection (callers fall back). */
function validateGroundedText(text, facts, opts) {
  try {
    return validateGroundedTextUnsafe(text, facts, opts);
  } catch {
    return { ok: false, reasons: ["validator_error"] };
  }
}

function isGroundedText(text, facts, opts) {
  return validateGroundedText(text, facts, opts).ok;
}

module.exports = {
  DEFAULT_MAX_CHARS,
  DEFAULT_MAX_SENTENCES,
  DEFAULT_MAX_WORDS,
  buildFactIndex,
  countSentences,
  isGroundedText,
  validateGroundedText,
};
