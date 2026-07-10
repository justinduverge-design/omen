# Omen Promo Videos

Portable Remotion source package for Omen social promo videos.

Status: publish-ready explainer assets, pending Justin's final viewing approval. The older teaser cuts remain in the package as alternates.

## Cuts

- `OmenComingSoonVertical` — 1080x1920, 15 seconds, primary Instagram/TikTok/Reels cut.
- `OmenComingSoonHorizontal` — 1920x1080, 15 seconds, website/X/YouTube preview cut.
- `OmenHypeVertical` — 1080x1920, 12 seconds, snare-forward hype cut.
- `OmenHypeHorizontal` — 1920x1080, 12 seconds, horizontal hype cut.
- `OmenExplainerVertical` — 1080x1920, 30 seconds, recreated UI-panel explainer.
- `OmenExplainerHorizontal` — 1920x1080, 30 seconds, horizontal explainer.

Rendered MP4s live in `renders/`.

## Render

Run from this folder:

```powershell
npm install
npm run audio
npm run render:vertical
npm run render:horizontal
npm run render:hype:vertical
npm run render:hype:horizontal
npm run render:explainer:vertical
npm run render:explainer:horizontal
```

Or render everything:

```powershell
npm run render:all
```

## Assets

- Logo: `public/omen-primary-emblem.png`
- Explainer music: `public/audio/omen-explainer-boom-bap.mp3`
- Generated teaser audio: `public/audio/*.wav`
- Audio source script: `scripts/generate-audio.mjs`
- Source compositions: `src/index.jsx`
- Storyboards: `assets/storyboard.md`
- Captions/hashtags: `assets/post-copy.md`
- Audio provenance: `assets/sound-credits.md`

## Portability Notes

- No absolute paths are required by the source.
- No absolute local paths are required.
- Explainer audio is included in `public/audio/` and credited in `assets/sound-credits.md`.
- Dependencies are pinned in `package.json` and locked in `package-lock.json`.
- Remotion may download its own headless browser/compositor cache on first render.

## Product Fit Note

The original Coming Soon and Hype MP4s are visually branded teasers. They do not explain the app well enough for a first-time viewer.

The `OmenExplainer*` cuts supersede them for promotion because they show recreated app panels and explain the product flow.

Explainer concept:

1. Show the fantasy football decision problem: trades, starts, and draft calls are uncertain.
2. Show Omen reading league context from Yahoo/Sleeper/ESPN.
3. Show the core product promise: recommendation first, confidence and risk second.
4. Show the user outcome: clearer move, less spreadsheet work.
5. End with waitlist CTA.

## Music Direction

Final explainer track:

- `HipHop Beat Old School Boom Bap` by `mirostar`
- Source: Pixabay
- Track URL: https://pixabay.com/music/alternative-hip-hop-hiphop-beat-old-school-boom-bap-560298/
- Creator URL: https://pixabay.com/users/mirostar-55575712/
- License: Pixabay Content License

The current `OmenExplainer*` renders include this track.
