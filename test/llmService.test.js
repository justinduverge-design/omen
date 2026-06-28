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
