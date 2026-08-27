# SelfDev AI Service

Node.js sidecar that generates personalized course outlines, lessons, and daily plans.

Uses `@cursor/sdk` when `CURSOR_API_KEY` is set and `USE_MOCK_AI` is not `true`.
Otherwise returns deterministic mock content so local development works offline.

## Endpoints

- `GET /health`
- `POST /generate/course-outline`
- `POST /generate/lesson`
- `POST /generate/daily-plan`

## Run locally

```bash
cp .env.example .env
npm install
npm start
```
