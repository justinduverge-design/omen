# Device walk 1 — 2026-10-01 (founder, iPhone 15, build of main d2315f7e + real Local.xcconfig)

Evidence: 21 screenshots + voice memo transcript (founder). Screenshots are in the founder's `~/Desktop/omen-walk` (not committed).
First install of the day was built WITHOUT `Config/Local.xcconfig` (empty Supabase, dummy API host): no provider buttons, no email code. Rebuilt; that class is fixed for the walk. Guard still to add: fail the build when Supabase config is empty.

## Works on the device (seen)
Sign-in (Apple/Google/Discord/email, matches artboard) · ESPN "Before we start" + ESPN web login + 3 leagues found · Yahoo sign-in + 2 leagues · Sleeper username + 3 leagues · Command (live ESPN card, Waiver Watch, empty Ledger) · Command quiet state · league switcher sheet (all 5 teams, ESPN/Sleeper/Yahoo filter) · League table (12 teams, form last 5).

## Broken or wrong
P0-1 Omen tab, ESPN team TTO: "Unable to build this recommendation / Omen sent something this version couldn't read". Fires when the server state is unhandled with no recovery text, or `success` with no payload (OmenDecision.swift briefState). Real response not yet seen. Other teams (ADM/PAF) show the honest "Nothing to recommend".
P0-2 Lag: taps react ~5 s later; founder broke the league carousel by tapping the switcher repeatedly (taps queued, read as "+"). Not measured yet.
P0-3 Trade tab is the OLD page. TradeFindReviewScreen, TradePartnerPicker, TradeFindReviewViewModel are referenced by no shipped code (only defined). The 3 new screens are dead code; merging #501 did not mount them.
P1-4 Connect confirmation names only the first league and says "Only the first league will stick for now" (copy added with the multiselect restore). Should list every connected league and say what is remembered.
P1-5 Command shows a Waiver Watch pick (Kalif Raymond) while League says waivers "UNAVAILABLE — cannot confirm free-agent status". Two surfaces disagree.
P1-6 Trade tab: bottom helper line hidden behind the floating tab bar; Compare button sits under it.
P1-7 Passkey sheet copy truncated ("…without waiting for an…").
P2 Founder design notes: passkey sheet and league-switcher sheet use a custom frame with two-tone top/bottom borders and a custom bar; use the whole system sheet instead of our own chrome. "See how Omen decides" on the no-league screen goes nowhere useful — remove unless it shows how. The check marks on several team chips (TTO and DAR both ticked) are unexplained. Report card still too big. Idea: long-press the carousel to open that league.
Open question: Command quiet state shows "Confident · Low risk" on a "nothing worth moving for" week; check it is computed, not fixed copy.
