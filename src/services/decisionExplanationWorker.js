"use strict";

/**
 * Drains the decision-explanation queue: writes each input with the local model and stores the
 * result under its facts hash. A rejected or failed write is stored too (ok:false), so the same facts
 * are not retried in a loop and shadow can report a grounding pass rate.
 *
 * KVM2 also runs the weekly restore proof and Friday maintenance, so the worker stays out of those
 * windows (infra/schedule/TIMERS.md; Blueprints/specs/infrastructure/rust-prep/phase2-kvm2-batch-slot.md).
 */

const { writeExplanation } = require("./decisionExplanation");

/** True when KVM2 must be left alone. All times UTC. */
function inQuietWindow(now = new Date()) {
  const day = now.getUTCDay();
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  // Sunday restore proof starts 14:00 UTC: stop at 13:45, resume at 16:00.
  if (day === 0 && minutes >= 13 * 60 + 45 && minutes < 16 * 60) return "sunday_restore_proof";
  // Friday maintenance 06:00-07:00 UTC (KVM2 staggered inside it).
  if (day === 5 && minutes >= 5 * 60 + 45 && minutes < 7 * 60 + 30) return "friday_maintenance";
  return null;
}

/**
 * @returns {Promise<{ skipped?:string, processed:number, written:number, rejected:number, reasons:Record<string,number> }>}
 */
async function drainOnce({
  store,
  limit = 50,
  writer = writeExplanation,
  now = () => new Date(),
  deadlineMs = 25 * 60 * 1000,
} = {}) {
  const summary = { processed: 0, written: 0, rejected: 0, reasons: {} };
  const quiet = inQuietWindow(now());
  if (quiet) return { ...summary, skipped: quiet };
  const started = Date.now();
  const inputs = await store.dequeue(limit);
  for (const input of inputs) {
    if (!input?.hash) continue;
    if (Date.now() - started > deadlineMs || inQuietWindow(now())) {
      await store.requeue(input); // out of time or into a quiet window: the next run picks it up
      continue;
    }
    const outcome = await writer(input);
    summary.processed += 1;
    if (outcome.ok) summary.written += 1;
    else {
      summary.rejected += 1;
      for (const reason of outcome.reasons) {
        const key = String(reason).split(":")[0];
        summary.reasons[key] = (summary.reasons[key] || 0) + 1;
      }
    }
    await store.put(input.hash, {
      version: input.version,
      type: input.type,
      ok: outcome.ok,
      text: outcome.ok ? outcome.text : null,
      reasons: outcome.reasons,
      model: outcome.model,
      ms: outcome.ms,
      created_at: now().toISOString(),
    });
  }
  return summary;
}

module.exports = { inQuietWindow, drainOnce };
