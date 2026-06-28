"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

function loadLlmWithEnv(env = {}) {
  const oldEnv = {};
  for (const key of ["LLM_BASE_URL", "LLM_MODEL", "LLM_TIMEOUT"]) {
    oldEnv[key] = process.env[key];
    if (Object.prototype.hasOwnProperty.call(env, key)) {
      if (env[key] == null) delete process.env[key];
      else process.env[key] = env[key];
    }
  }

  const llmPath = require.resolve("../src/services/llm");
  delete require.cache[llmPath];
  const llm = require("../src/services/llm");

  return {
    llm,
    restore() {
      delete require.cache[llmPath];
      for (const [key, value] of Object.entries(oldEnv)) {
        if (value == null) delete process.env[key];
        else process.env[key] = value;
      }
    },
  };
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
  const { llm, restore } = loadLlmWithEnv({
    LLM_BASE_URL: "http://ollama.internal:11434",
    LLM_MODEL: "gemma4:e2b-q4_0",
  });

  try {
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
    restore();
  }
});

test("parseOmenExplanation rejects narration over 50 words or 2 sentences", () => {
  const { llm, restore } = loadLlmWithEnv();

  try {
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
  } finally {
    restore();
  }
});

test("LLM bridge refuses public base URLs and does not call fetch", async () => {
  const { llm, restore } = loadLlmWithEnv({
    LLM_BASE_URL: "https://ollama.example.com",
    LLM_MODEL: "gemma3:4b",
  });
  const oldFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    throw new Error("public LLM URL should not be fetched");
  };

  try {
    assert.equal(llm.getLlmBridgeStatus().status, "misconfigured_public");
    assert.equal(llm.getLlmBridgeStatus().public_url_exposed, false);
    assert.equal(await llm.chat([{ role: "user", content: "hello" }]), null);
    assert.equal(calls, 0);
    assert.equal(JSON.stringify(llm.getLlmBridgeStatus()).includes("ollama.example.com"), false);
  } finally {
    global.fetch = oldFetch;
    restore();
  }
});

test("LLM bridge allows Tailscale/private addresses and strips trailing slashes", async () => {
  const { llm, restore } = loadLlmWithEnv({
    LLM_BASE_URL: "http://100.64.10.20:11434/v1/",
    LLM_MODEL: "gemma4:e2b-q4_0",
  });
  const oldFetch = global.fetch;
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "A short answer." } }],
      }),
    };
  };

  try {
    assert.equal(llm.getLlmBridgeStatus().status, "configured_private");
    assert.equal(await llm.chat([{ role: "user", content: "hello" }]), "A short answer.");
    assert.deepEqual(urls, ["http://100.64.10.20:11434/v1/chat/completions"]);
  } finally {
    global.fetch = oldFetch;
    restore();
  }
});
