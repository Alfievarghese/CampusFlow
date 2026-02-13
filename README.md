![License](https://img.shields.io/github/license/Alfievarghese/CampusFlow) ![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Supabase](https://img.shields.io/badge/database-Supabase-3ECF8E)

# CampusFlow

> College Event Hosting & Hall Booking Infrastructure Platform

A production-ready MVP for managing campus events, hall bookings, conflict detection, RSVP, and multi-admin workflows.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | **Next.js 16** (App Router) · TypeScript · Tailwind CSS · FullCalendar |
| Backend | **Node.js** · Express · Prisma ORM |
| Database | **Supabase** (PostgreSQL) |
| Auth | JWT + bcrypt |
| Deployment | **Vercel** (frontend + backend) |

---

## Project Structure

```
CampusFlow/
├── client/          # Next.js frontend
│   ├── app/         # App Router pages
│   ├── context/     # AuthContext
│   ├── lib/         # Axios API client
│   └── vercel.json  # Frontend Vercel config
│
├── server/          # Express backend
│   ├── routes/      # API route handlers
│   ├── middleware/  # Auth & RBAC middleware
│   ├── lib/         # Conflict engine, Prisma, Audit
│   ├── prisma/      # Schema + seed + migrations
│   └── vercel.json  # Backend Vercel config
│
└── .gitignore
```

---

## Local Development

### Prerequisites
- Node.js v18+
- A Supabase project (for the database)

### 1. Clone
```bash
git clone https://github.com/Alfievarghese/CampusFlow.git
cd CampusFlow
```

### 2. Set up the Backend
```bash
cd server
cp .env.example .env
# Fill in .env with your Supabase credentials
npm install
npx prisma db push
node prisma/seed.js
node index.js
```

### 3. Set up the Frontend
```bash
cd ../client
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm install
npm run dev
```

Open http://localhost:3000

---

## Default Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@campus.edu` | `SuperAdmin@123` |
| Demo Admin | `admin@campus.edu` | `Admin@1234` |

---

## Deploying to Vercel

### Backend (Express API)
1. Go to [vercel.com](https://vercel.com) → New Project → Import `CampusFlow/server`
2. Set **Root Directory** = `server`
3. Add these **Environment Variables** in Vercel dashboard:
   - `DATABASE_URL` — Supabase connection string (pgbouncer)
   - `DIRECT_URL` — Supabase direct connection string
   - `JWT_SECRET` — strong random string
   - `JWT_EXPIRES_IN` = `7d`
   - `NODE_ENV` = `production`
   - `CLIENT_URL` — your frontend Vercel URL

### Frontend (Next.js)
1. Go to [vercel.com](https://vercel.com) → New Project → Import `CampusFlow/client`
2. Set **Root Directory** = `client`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` — your deployed backend Vercel URL + `/api`

---

## Features

- 🏢 **Hall Management** — create, edit, soft-delete halls (Super Admin only)
- 📅 **Event Booking** — book halls with conflict detection & override requests
- 🗓 **Common Calendar** — FullCalendar view across all campus events
- 🔁 **Recurring Events** — weekly, monthly, custom recurrence patterns
- 📨 **Conflict Override Workflow** — request/approve/reject system between admins
- 🔒 **Invite-Only Events** — public request & admin approval flow
- 👤 **RSVP System** — with hall capacity enforcement
- 🛡️ **Multi-Admin RBAC** — Admin and Super Admin roles
- 📋 **Audit Logs** — complete tamper-evident action history
- ⚙️ **System Settings** — toggle registration, set max admin count
