# Prior-Use Review — slops-content-ship

## 2026-07-13 — First real run (informal, pre-dates the skill file itself)

Before this skill existed, Justin asked for a manual six-dimension QC pass on
`Brand/promos/omen-coming-soon/renders/omen-all-users-reel-vertical.mp4`. That pass is what this
skill formalizes. Findings from that run:

- **Caught a real render defect:** two screenshots (`omen-top.png` → `omen-middle.png`) crossfaded
  into an unreadable double-exposure around frame 600. Caption pacing was also measured at ~19
  words/sec against a ~2.5–3 words/sec target — both are concrete, numeric findings, not taste calls.
  This confirms the "extract concrete evidence, not impression" instruction in Process Recipe is
  load-bearing — a vaguer pass would likely have missed the crossfade.
- **Caught a missing production step:** VO script existed but was never recorded as audio; the
  render only had captions + instrumental bed. Confirms the Voiceover dimension needs to check for
  an actual audio track, not infer VO existence from the presence of a VO script.
- **Gap not yet resolved:** this first pass was run entirely by hand, with no ledger entry and no
  standard report shape — exactly the gap this skill exists to close. No skill-level correction yet;
  first real invocation *of the skill itself* should be checked against this note.

## 2026-07-14 — Goal-communication dimension proved insufficient against a real human watch

After VO was added and the render re-verified (all dimensions self-checked PASS via frame stills and
timing math), Justin watched the actual video and gave substantial feedback the self-assessment missed
entirely: the opening doesn't read as "someone using an app" (no device framing), the Trade Analyzer
beat feels static (wants a live-typing animation, not a still screenshot), the trade-result beat should
showcase Multi-team not another two-team trade, the weekly-beat pan is too subtle, three text-card
lines are "unworkshopped" copy, the end-card tagline should be cut, and the whole background feels
static/dead for the full runtime.

**The gap:** the Goal Communication dimension's Process Recipe step says "watch/read the cut end-to-end
and answer directly... name which segment's message would land and which wouldn't" — but Claude cannot
watch video or hear audio. Every self-administered PASS on this dimension so far has actually been "the
captions are readable and the beats are in order," which is a real but much narrower check than "does
this feel like a real, alive, well-directed piece of marketing." Frame stills catch layout/timing bugs
well; they cannot catch pacing-of-feel, animation quality, or copy tone.

**Durable fix needed:** the skill should stop claiming a PASS/FAIL verdict on Goal Communication from
self-administered stills alone. Reframe that dimension's self-check as a *proxy* (readability, beat
order, caption-to-audio timing) and require an explicit human-watch verdict before the dimension can be
marked PASS — the same posture the skill already takes for "audio quality/tone" in the VO dimension.
Not yet applied to SKILL.md as a formal edit; flagging here first since this is exactly the kind of
correction the prior-use-review loop exists to convert into a durable change.
