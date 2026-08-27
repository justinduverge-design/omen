# League switcher — rendered evidence, 2026-08-27

iPhone 17 Pro simulator, iOS 26.5, Xcode 26.6 (`17F113`). Captured via the
screenshot-scenario registry (`OMEN_SCREENSHOT_SCENARIO`), against deterministic
in-app stubs — no account, no credential, no network.

| File | Scenario | Shows |
|---|---|---|
| `league-switcher.loaded.png` | `league-switcher.loaded` | Two Sleeper leagues with the active one checkmarked, ESPN's bound-only league with the server's own notice, Yahoo not connected, secondary actions |
| `league-switcher.empty.png` | `league-switcher.empty` | Nothing connected — the §10.3 empty state, not a dead dashboard |
| `league-switcher.failed.png` | `league-switcher.failed` | Directory unreadable — honest error, retry, and no status code or provider detail in the copy |

## What capturing these actually found

**A defect no test caught.** The first revision put the Done control in a
`NavigationStack` toolbar item. iOS 26 squeezed it into a circular glass button
and clipped the label to a vertical `D o n e`. The build was clean and all 257
iOS tests passed.

It is now composed with `OmenModalSheet`, the design system's own sheet chrome,
which is also what the Android mirror uses. The re-captured `loaded` and `failed`
images above are from the fixed build.

This is the third time in this repo's log that a green suite plus a registered
scenario still did not mean anyone had seen the pixels.

## Not covered here

Dark mode, Dynamic Type, VoiceOver, and a compact-width device. Those remain
owed; these three prove composition and honest states only.
