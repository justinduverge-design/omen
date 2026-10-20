# Omen web app (`frontend/`)

The React web version of Omen (React 19, Vite, Tailwind). It is secondary to the iPhone app. The production API
container builds it and serves it from `frontend/dist`, and it talks only to the Omen API (`src/`).

## What's here

| Path | What it holds |
|---|---|
| `src/routes/index.jsx` | Every page route |
| `src/pages/` | One file per page: Trade Analyzer and shared trades (`/trade`, `/trade/share/:hash`), Omen of the Week (`/omen`), waivers (`/waiver`), standings, Ledger, account and connect, ESPN connect guide, onboarding, demo, and the public pages (landing, privacy, terms, support, delete account) |
| `src/components/ui/` | Shared building blocks (button, card, table, states for empty/error/loading/disconnected, the mock-data banner). Reuse these before writing new markup |
| `src/components/<area>/` | Pieces for one area: `league`, `moves` (Ledger), `trade`, `omen`, `platforms`, `espn`, `account`, `layout`, `help` |
| `src/providers/` | App-wide React providers |
| `src/lib/` | API client and Supabase setup |
| `public/` | Static assets and icons |

## Working here

```bash
cd frontend && npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

- Pages consume the same API contracts as the iPhone app (`Blueprints/api-routes.md`). A change to a response shape
  starts in `test/contracts/`, not here.
- Every screen needs its loading, empty, error and disconnected states. Use the `ui/` state components.
- Mock or demo data always shows `MockBanner`. It is never mixed silently with live data.
- Words follow `Brand/brand-system.md`. Type is Alegreya Sans and Alegreya only (facts-of-record #21).
- `/corvus` and `/dev/*` are legacy and internal routes. Don't link them.
