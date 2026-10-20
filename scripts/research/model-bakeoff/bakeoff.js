"use strict";
// Player-note bake-off: small models vs gemma3:4b, judged by Omen's production grounding check.
// Usage: node bakeoff.js <repoRoot> <facts.json> <out.json>
const fs = require("fs");
const path = require("path");
const [repo, factsFile, outFile] = process.argv.slice(2);
const { validateGroundedText } = require(path.join(repo, "src/services/narrationGrounding"));

const HOST = "http://100.67.187.57:11434";
const MODELS = ["llama3.2:1b", "qwen3:1.7b", "gemma3:4b"];
const round1 = (n) => Math.round(n * 10) / 10;

function noteFacts(p) {
  const weeks = p.weeks.filter((w) => Number.isInteger(w.week)).sort((a, b) => a.week - b.week);
  const last3 = weeks.slice(-3);
  const earlier = weeks.slice(0, -3);
  const avg = (rows, k) => round1(rows.reduce((s, r) => s + (r[k] || 0), 0) / rows.length);
  const facts = [];
  const c3 = avg(last3, "carries"),
    t3 = avg(last3, "targets");
  if (c3 >= 1) facts.push(`${c3} carries per game over the last 3 games`);
  if (t3 >= 1) facts.push(`${t3} targets per game over the last 3 games`);
  facts.push(`${last3.reduce((s, r) => s + (r.red_zone_touches || 0), 0)} red zone touches over the last 3 games`);
  if (earlier.length >= 2) {
    const ce = avg(earlier, "carries"),
      te = avg(earlier, "targets");
    if (c3 >= 1) facts.push(`${ce} carries per game in the earlier games`);
    if (t3 >= 1) facts.push(`${te} targets per game in the earlier games`);
  }
  return { name: p.name, position: p.position, facts };
}

function messages(f) {
  const lines = [`Player: ${f.name} (${f.position})`, ...f.facts.map((x) => `- ${x}`)].join("\n");
  return [
    {
      role: "system",
      content:
        "You write a short fantasy football player note. Use ONLY the facts given; add nothing. " +
        "Use only the player name, position and numbers provided. Do not mention any other stat, team, opponent, " +
        "injury, matchup or weather. Do not predict or guarantee anything. At most 2 sentences, under 40 words. Plain text, no markdown.",
    },
    { role: "user", content: `Facts:\n${lines}\n\nWrite the note.` },
  ];
}

async function chat(model, msgs, keepAlive) {
  const body = {
    model,
    messages: msgs,
    stream: false,
    keep_alive: keepAlive,
    options: { temperature: 0.2, num_predict: 120 },
  };
  if (model.startsWith("qwen3")) body.think = false;
  const t0 = Date.now();
  const res = await fetch(`${HOST}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${model}: Ollama HTTP ${res.status}`);
  const json = await res.json();
  return { text: (json.message?.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim(), ms: Date.now() - t0 };
}

(async () => {
  const players = JSON.parse(fs.readFileSync(factsFile, "utf8"));
  const results = {};
  for (const model of MODELS) {
    const rows = [];
    for (const p of players) {
      const facts = noteFacts(p);
      const { text, ms } = await chat(model, messages(facts), "10m");
      const v = validateGroundedText(
        text,
        { ...facts, alias: "red-zone", window: "three", games: 3 },
        { extraAllowedWords: [p.name.split(" ")[0]] },
      );
      rows.push({ name: p.name, ms, ok: v.ok, reasons: v.reasons, text });
      process.stderr.write(`${model} ${p.name} ${v.ok ? "PASS" : "FAIL " + v.reasons.join(",")} ${ms}ms\n`);
    }
    await chat(model, [{ role: "user", content: "ok" }], 0); // unload before the next model
    const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
    results[model] = {
      pass: rows.filter((r) => r.ok).length,
      total: rows.length,
      p50_ms: ms[Math.floor(ms.length / 2)],
      p90_ms: ms[Math.floor(ms.length * 0.9)],
      reasons: rows
        .flatMap((r) => r.reasons)
        .reduce((m, r) => {
          const k = r.split(":")[0];
          m[k] = (m[k] || 0) + 1;
          return m;
        }, {}),
      rows,
    };
  }
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  for (const [m, r] of Object.entries(results))
    console.log(
      `${m}: ${r.pass}/${r.total} grounded, p50 ${r.p50_ms} ms, p90 ${r.p90_ms} ms, fails ${JSON.stringify(r.reasons)}`,
    );
})();
