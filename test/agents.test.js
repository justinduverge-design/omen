"use strict";

const assert  = require("assert");
const { describe, it } = require("node:test");
const { vorpLetterGrade, scarcityLevel, formatVORPBlock, formatScarcityBlock } =
  require("../src/services/agents");

describe("agents — vorpLetterGrade", () => {
  it("returns A+ for VORP >= 12", () => {
    assert.strictEqual(vorpLetterGrade(12),   "A+");
    assert.strictEqual(vorpLetterGrade(15),   "A+");
    assert.strictEqual(vorpLetterGrade(12.1), "A+");
  });
  it("returns A for VORP 9–11.9", () => {
    assert.strictEqual(vorpLetterGrade(9),  "A");
    assert.strictEqual(vorpLetterGrade(11), "A");
  });
  it("returns B+ for VORP 6–8.9", () => {
    assert.strictEqual(vorpLetterGrade(6), "B+");
    assert.strictEqual(vorpLetterGrade(8), "B+");
  });
  it("returns B for VORP 3–5.9", () => {
    assert.strictEqual(vorpLetterGrade(3), "B");
    assert.strictEqual(vorpLetterGrade(5), "B");
  });
  it("returns C+ for VORP 1–2.9", () => {
    assert.strictEqual(vorpLetterGrade(1), "C+");
    assert.strictEqual(vorpLetterGrade(2), "C+");
  });
  it("returns C for VORP 0–0.9", () => {
    assert.strictEqual(vorpLetterGrade(0),   "C");
    assert.strictEqual(vorpLetterGrade(0.5), "C");
  });
  it("returns D for negative VORP", () => {
    assert.strictEqual(vorpLetterGrade(-1),  "D");
    assert.strictEqual(vorpLetterGrade(-10), "D");
  });
});

describe("agents — scarcityLevel", () => {
  it("TE is CRITICAL with bonus 20", () => {
    const s = scarcityLevel("TE");
    assert.strictEqual(s.level, "CRITICAL");
    assert.strictEqual(s.bonus, 20);
  });
  it("RB is HIGH with bonus 12", () => {
    const s = scarcityLevel("RB");
    assert.strictEqual(s.level, "HIGH");
    assert.strictEqual(s.bonus, 12);
  });
  it("QB is MODERATE with bonus 5", () => {
    const s = scarcityLevel("QB");
    assert.strictEqual(s.level, "MODERATE");
    assert.strictEqual(s.bonus, 5);
  });
  it("K is ADEQUATE with bonus 0", () => {
    const s = scarcityLevel("K");
    assert.strictEqual(s.level, "ADEQUATE");
    assert.strictEqual(s.bonus, 0);
  });
  it("handles D/ST normalization", () => {
    const s = scarcityLevel("D/ST");
    assert.strictEqual(s.level, "ADEQUATE");
  });
  it("unknown position returns ADEQUATE", () => {
    const s = scarcityLevel("XYZ");
    assert.strictEqual(s.level, "ADEQUATE");
    assert.strictEqual(s.bonus, 0);
  });
});

describe("agents — formatVORPBlock", () => {
  const players = [
    { name: "Elite RB",    position: "RB", projected_points: 20, status: null },
    { name: "Mediocre WR", position: "WR", projected_points: 10, status: null },
    { name: "Starter TE",  position: "TE", projected_points: 12, status: null },
  ];

  it("returns a string", () => {
    const block = formatVORPBlock(players, "ppr");
    assert.strictEqual(typeof block, "string");
  });
  it("contains player names", () => {
    const block = formatVORPBlock(players, "ppr");
    assert.ok(block.includes("Elite RB"));
    assert.ok(block.includes("Mediocre WR"));
  });
  it("contains VORP keyword", () => {
    const block = formatVORPBlock(players, "ppr");
    assert.ok(block.includes("VORP"));
  });
  it("contains grade letters", () => {
    const block = formatVORPBlock(players, "ppr");
    assert.ok(/Grade: [A-D][+]?/.test(block));
  });
  it("handles empty player array", () => {
    const block = formatVORPBlock([], "ppr");
    assert.ok(block.length > 0);
  });
});

describe("agents — formatScarcityBlock", () => {
  it("returns a string", () => {
    const block = formatScarcityBlock([], "ppr");
    assert.strictEqual(typeof block, "string");
  });
  it("contains all four skill positions", () => {
    const block = formatScarcityBlock([], "ppr");
    assert.ok(block.includes("QB"));
    assert.ok(block.includes("RB"));
    assert.ok(block.includes("WR"));
    assert.ok(block.includes("TE"));
  });
  it("contains CRITICAL for TE", () => {
    const block = formatScarcityBlock([], "ppr");
    assert.ok(block.includes("CRITICAL"));
  });
  it("contains confidenceBonus", () => {
    const block = formatScarcityBlock([], "ppr");
    assert.ok(block.includes("confidenceBonus"));
  });
});
