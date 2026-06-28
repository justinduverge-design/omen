"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

function loadLlm() {
  const servicePath = require.resolve("../src/services/llm");
  delete require.cache[servicePath];
  return require("../src/services/llm");
}

async function withCapturedFetch(handler, fn) {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options = {}) => {
    const parsedBody = JSON.parse(options.body);
    calls.push({ url, options, body: parsedBody });
    return handler({ url, options, body: parsedBody });
  };

  try {
    return await fn(calls);
  } finally {
    global.fetch = originalFetch;
  }
}

test("explainTrade uses the CPU-friendly narration limit", async () => {
  const oldBaseUrl = process.env.LLM_BASE_URL;
  const oldModel = process.env.LLM_MODEL;
  process.env.LLM_BASE_URL = "http://ollama.internal:11434";
  process.env.LLM_MODEL = "gemma3:4b";

  try {
    const llm = loadLlm();
    await withCapturedFetch(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Take the deal. The incoming player adds enough value without adding much risk.",
            },
          },
        ],
      }),
    }), async (calls) => {
      const result = await llm.explainTrade({
        send: [{ name: "Bench RB", position: "RB" }],
        receive: [{ name: "Starter WR", position: "WR" }],
        net_value: 3.2,
        verdict: "accept",
      });

      assert.equal(result, "Take the deal. The incoming player adds enough value without adding much risk.");
      assert.equal(calls.length, 1);
      assert.equal(calls[0].body.max_tokens <= 90, true);
      const systemPrompt = calls[0].body.messages[0].content;
      assert.match(systemPrompt, /50 words/i);
      assert.match(systemPrompt, /2 sentences/i);
    });
  } finally {
    if (oldBaseUrl == null) delete process.env.LLM_BASE_URL;
    else process.env.LLM_BASE_URL = oldBaseUrl;
    if (oldModel == null) delete process.env.LLM_MODEL;
    else process.env.LLM_MODEL = oldModel;
    loadLlm();
  }
});

test("parseOmenExplanation rejects narration over 50 words or 2 sentences", () => {
  const llm = loadLlm();
  const tooLong = {
    summary: "This move is a good lean because the projection edge is strong and the replacement option is thin across the roster.",
    why_it_matters: "It protects the weekly floor while keeping upside alive through the late window.",
    risk: "The risk is moderate because role volatility still exists and the matchup can shift.",
    confidence: "Confidence is medium-high because the inputs agree but not by enough to call it automatic.",
    data_used: ["connected roster", "weekly projections"],
  };

  assert.equal(llm.parseOmenExplanation(tooLong), null);

  const tooManySentences = {
    summary: "Start the safer flex.",
    why_it_matters: "The edge is real.",
    risk: "The bench option is volatile.",
    confidence: "Confidence is medium.",
    data_used: ["connected roster"],
  };

  assert.equal(llm.parseOmenExplanation(tooManySentences), null);
});
