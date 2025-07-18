# CampusFlow — Frontend

Next.js 16 App Router frontend.

## Structure

- `app/page.tsx` — Public homepage
- `app/auth/` — Login and register
- `app/admin/` — Admin portal pages
- `context/AuthContext.tsx` — JWT auth state
- `lib/api.ts` — Axios client
- `types/index.ts` — Shared TypeScript types

## Running

```bash
cp .env.example .env.local
npm install
npm run dev
```
