# CampusFlow — Backend API

Express.js REST API, Supabase PostgreSQL, Prisma ORM.

## Routes

| Prefix | Description |
|--------|-------------|
| /api/auth | Register, login, /me |
| /api/events | CRUD + conflict check + poster upload |
| /api/halls | CRUD + soft delete |
| /api/conflicts | Override request workflow |
| /api/rsvp | RSVP with capacity enforcement |
| /api/invites | Invite request + approval |
| /api/admin | User management + settings |
| /api/audit | Paginated audit logs |

## Running

```bash
cp .env.example .env
npm install
npx prisma db push
node prisma/seed.js
node index.js
```
