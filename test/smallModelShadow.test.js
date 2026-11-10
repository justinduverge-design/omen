"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { CASES, factsFor, fallbackFor, runCase, runBatch } = require("../scripts/research/small-model-shadow/worker");

function reply(text) {
  return async (_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.model, "qwen3:1.7b");
    assert.equal(body.think, false);
    return { ok: true, json: async () => ({ message: { content: text } }) };
  };
}

test("fixed synthetic input and exact grounded output produce a receipt", async () => {
  const text = fallbackFor(CASES[0]);
  const receipt = await runCase(CASES[0], { fetchImpl: reply(text) });
  assert.equal(receipt.output, text);
  assert.equal(receipt.grounded, true);
  assert.equal(receipt.deterministic_agreement, true);
  assert.equal(receipt.human_acted, false);
  assert.equal(receipt.resource_use, null);
  assert.throws(() => factsFor({ ...CASES[0] }), /unknown fixture/);
});

test("invented and differently framed output is discarded and fallback remains", async () => {
  for (const candidate of ["Usage increased by 99 carries.", "Usage decreased."]) {
    const receipt = await runCase(CASES[0], { fetchImpl: reply(candidate) });
    assert.equal(receipt.output, null);
    assert.ok(receipt.failure_reason);
    assert.equal(receipt.fallback, fallbackFor(CASES[0]));
  }
});

test("host failure returns bounded receipts without leaking errors", async () => {
  const receipts = await runBatch({
    fetchImpl: async () => {
      throw new Error("private detail");
    },
  });
  assert.equal(receipts.length, CASES.length);
  assert.ok(receipts.every((r) => r.failure_reason === "host_unavailable" && r.output === null));
  assert.equal(JSON.stringify(receipts).includes("private detail"), false);
});

test("narration evaluation uses held-out synthetic facts and records failures without raw text", async () => {
  const { evaluate } = require("../scripts/research/small-model-shadow/narration-eval");
  const receipts = await evaluate({
    writer: async (input, opts) => {
      assert.equal(opts.model, "qwen3:1.7b");
      assert.match(input.facts.decision, /Player/);
      return { ok: false, text: null, reasons: ["ungrounded_number:99"], ms: 3 };
    },
  });
  assert.equal(receipts.length, 3);
  assert.deepEqual(receipts[0].failure_reason, ["ungrounded_number"]);
  assert.equal(receipts[0].output, null);
  assert.equal(receipts[0].deterministic_agreement, null);
});
