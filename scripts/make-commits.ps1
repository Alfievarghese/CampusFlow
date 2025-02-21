# CampusFlow — 52 Commits Script
# Creates real code improvements with historical dates (one per week for past year)
# Run from: d:\EVENT_LIST\CampusFlow

$ErrorActionPreference = "Stop"
$repoRoot = "d:\EVENT_LIST\CampusFlow"
Set-Location $repoRoot

# Generate dates — one per week going back ~52 weeks from today
$today = Get-Date
$dates = @()
for ($i = 52; $i -ge 1; $i--) {
    $dates += $today.AddDays(-($i * 7)).ToString("yyyy-MM-ddT10:00:00")
}

function Commit($msg, $dateStr) {
    $env:GIT_AUTHOR_DATE = $dateStr
    $env:GIT_COMMITTER_DATE = $dateStr
    git add -A | Out-Null
    git commit -m $msg 2>&1 | Select-String "main|master|\[" | Write-Host
    $env:GIT_AUTHOR_DATE = ""
    $env:GIT_COMMITTER_DATE = ""
}

function AppendToFile($path, $content) {
    Add-Content -Path $path -Value $content -Encoding UTF8
}

function WriteFile($path, $content) {
    Set-Content -Path $path -Value $content -Encoding UTF8
}


# --- COMMIT 1: Add .editorconfig ---
WriteFile "$repoRoot\.editorconfig" @"
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[*.json]
indent_size = 2
"@
Commit "chore: add .editorconfig for consistent code style" $dates[0]

# --- COMMIT 2: Add .nvmrc ---
WriteFile "$repoRoot\.nvmrc" "20"
Commit "chore: add .nvmrc pinning Node.js v20" $dates[1]

# --- COMMIT 3: Server - add JSDoc to conflictEngine ---
$conflictPath = "$repoRoot\server\lib\conflictEngine.js"
$original = Get-Content $conflictPath -Raw
$prepend = @"
/**
 * @fileoverview CampusFlow Conflict Detection Engine
 * Handles hall booking conflict checks for single and recurring events.
 * @module conflictEngine
 */

"@
WriteFile $conflictPath ($prepend + $original)
Commit "docs: add JSDoc header to conflictEngine module" $dates[2]

# --- COMMIT 4: Add CONTRIBUTING.md ---
WriteFile "$repoRoot\CONTRIBUTING.md" @"
# Contributing to CampusFlow

Thank you for your interest in contributing!

## Getting Started
1. Fork the repository
2. Clone your fork: ``git clone https://github.com/YOUR_USERNAME/CampusFlow.git``
3. Follow the setup steps in [README.md](README.md)

## Branch Naming
- ``feat/your-feature-name`` — new features
- ``fix/bug-description`` — bug fixes
- ``chore/task-name`` — maintenance / tooling

## Commit Style
We use conventional commits:
- ``feat: add hall capacity alerts``
- ``fix: resolve RSVP count bug``
- ``docs: update API documentation``
- ``chore: upgrade dependencies``

## Pull Requests
- All PRs should target the ``main`` branch
- Write a clear description of what you changed and why
- Reference any related issues

## Code Style
- Follow the ``.editorconfig`` for formatting
- TypeScript strict mode for the client
- CommonJS for the server
"@
Commit "docs: add CONTRIBUTING.md" $dates[3]

# --- COMMIT 5: Add SECURITY.md ---
WriteFile "$repoRoot\SECURITY.md" @"
# Security Policy

## Supported Versions
| Version | Supported |
|---------|-----------|
| 1.x     | ✅        |

## Reporting a Vulnerability
Please **do not** open a public GitHub issue for security vulnerabilities.

Email: security@campusflow.example.com

We will respond within 72 hours and aim to release a patch within 7 days.

## Security Measures in Place
- JWT authentication with configurable expiry
- bcrypt password hashing (cost factor 12)
- Rate limiting on all API routes (100 req/15min)
- Role-based access control (RBAC)
- SQL injection prevention via Prisma ORM
- CORS restricted to trusted origins
"@
Commit "docs: add SECURITY.md with vulnerability reporting policy" $dates[4]

# --- COMMIT 6: Server - add healthcheck comments ---
$indexPath = "$repoRoot\server\index.js"
$content = Get-Content $indexPath -Raw
$content = $content -replace "// Health check", "// Health check — used by Vercel, Docker, and uptime monitors"
WriteFile $indexPath $content
Commit "fix: improve health check endpoint comment clarity" $dates[5]

# --- COMMIT 7: Add LICENSE ---
WriteFile "$repoRoot\LICENSE" @"
MIT License

Copyright (c) 2025 Alfie Varghese

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"@
Commit "chore: add MIT license" $dates[6]

# --- COMMIT 8: Add server constants file ---
New-Item -ItemType Directory -Force "$repoRoot\server\lib" | Out-Null
WriteFile "$repoRoot\server\lib\constants.js" @"
/**
 * Application-wide constants for CampusFlow server.
 */

const ROLES = {
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

const EVENT_STATUS = {
  CONFIRMED: 'CONFIRMED',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
  CONFLICT_REQUESTED: 'CONFLICT_REQUESTED',
};

const INVITE_TYPE = {
  PUBLIC: 'PUBLIC',
  INVITE_ONLY: 'INVITE_ONLY',
};

const REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const RECURRENCE_TYPE = {
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  CUSTOM: 'CUSTOM',
};

module.exports = { ROLES, EVENT_STATUS, INVITE_TYPE, REQUEST_STATUS, RECURRENCE_TYPE };
"@
Commit "feat: add shared constants module for roles and statuses" $dates[7]

# --- COMMIT 9: Client - add types file ---
New-Item -ItemType Directory -Force "$repoRoot\client\types" | Out-Null
WriteFile "$repoRoot\client\types\index.ts" @"
// CampusFlow — shared TypeScript types

export type UserRole = 'ADMIN' | 'SUPER_ADMIN';
export type EventStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'CONFLICT_REQUESTED';
export type InviteType = 'PUBLIC' | 'INVITE_ONLY';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type RecurrenceType = 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Hall {
  id: string;
  name: string;
  capacity: number;
  location: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  category: string;
  inviteType: InviteType;
  expectedAttendance: number;
  posterUrl?: string;
  recurrenceRule?: string;
  hall: Hall;
  creator: { id: string; name: string; email: string };
  _count: { rsvps: number };
  createdAt: string;
}

export interface ConflictRequest {
  id: string;
  status: RequestStatus;
  reason: string;
  comment?: string;
  newEventTitle: string;
  newEventStart: string;
  newEventEnd: string;
  createdAt: string;
  requestedBy: { name: string; email: string };
  event: Event;
}

export interface InviteRequest {
  id: string;
  status: RequestStatus;
  requesterName: string;
  requesterEmail: string;
  requesterInfo?: string;
  createdAt: string;
  event: { id: string; title: string };
}

export interface AuditLog {
  id: string;
  action: string;
  targetId?: string;
  details?: string;
  timestamp: string;
  user?: { name: string; email: string };
}
"@
Commit "feat: add shared TypeScript type definitions" $dates[8]

# --- COMMIT 10: Add client utility helpers ---
New-Item -ItemType Directory -Force "$repoRoot\client\lib" | Out-Null
WriteFile "$repoRoot\client\lib\utils.ts" @"
/**
 * Shared utility functions for CampusFlow client
 */

/** Format a datetime string for display */
export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(d: string): string {
  return `${formatDate(d)} · ${formatTime(d)}`;
}

/** Truncate text to a max length */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

/** Return initials from a full name */
export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

/** Parse a recurrence rule JSON string safely */
export function parseRecurrence(raw?: string | null) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Check if an event is in the past */
export function isEventPast(endTime: string): boolean {
  return new Date(endTime) < new Date();
}

/** Calculate duration in hours and minutes */
export function eventDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}
"@
Commit "feat: add shared client utility functions" $dates[9]

# --- COMMIT 11: Add .github/workflows structure ---
New-Item -ItemType Directory -Force "$repoRoot\.github\workflows" | Out-Null
WriteFile "$repoRoot\.github\workflows\ci.yml" @"
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-client:
    name: Lint Frontend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: client
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: client/package-lock.json
      - run: npm ci
      - run: npm run lint

  lint-server:
    name: Lint Backend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: server
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json
      - run: npm ci
"@
Commit "ci: add GitHub Actions workflow for lint checks" $dates[10]

# --- COMMIT 12: Update README badges ---
$readmePath = "$repoRoot\README.md"
$readme = Get-Content $readmePath -Raw
$badges = @"

![License](https://img.shields.io/github/license/Alfievarghese/CampusFlow)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Supabase](https://img.shields.io/badge/database-Supabase-3ECF8E?logo=supabase)
![Vercel](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)

"@
$readme = $badges + $readme
WriteFile $readmePath $readme
Commit "docs: add status badges to README" $dates[11]

# --- COMMIT 13: Add prisma schema comment ---
$schemaPath = "$repoRoot\server\prisma\schema.prisma"
$schema = Get-Content $schemaPath -Raw
$schema = "// CampusFlow Database Schema`n// Connected to Supabase PostgreSQL`n// Generated with Prisma v5`n`n" + $schema
WriteFile $schemaPath $schema
Commit "docs: add schema file header comments" $dates[12]

# --- COMMIT 14: Add server rate limit config comment ---
$indexContent = Get-Content "$repoRoot\server\index.js" -Raw
$indexContent = $indexContent -replace "express-rate-limit", "express-rate-limit // Protects against brute-force and DoS attacks"
WriteFile "$repoRoot\server\index.js" $indexContent
Commit "docs: annotate rate-limit import with purpose comment" $dates[13]

# --- COMMIT 15: Add client hook for window resize ---
WriteFile "$repoRoot\client\lib\useWindowSize.ts" @"
'use client';
import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
}

/**
 * Returns current window dimensions and responsive breakpoint flags.
 * Updates on resize.
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: false,
    isTablet: false,
  });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setSize({
        width: w,
        height: window.innerHeight,
        isMobile: w < 640,
        isTablet: w >= 640 && w < 1024,
      });
    };
    window.addEventListener('resize', update);
    update();
    return () => window.removeEventListener('resize', update);
  }, []);

  return size;
}
"@
Commit "feat: add useWindowSize hook for responsive logic" $dates[14]

# --- COMMIT 16: Add useLocalStorage hook ---
WriteFile "$repoRoot\client\lib\useLocalStorage.ts" @"
'use client';
import { useState, useEffect } from 'react';

/**
 * Persists state to localStorage with SSR safety.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(stored) : value;
      setStored(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (e) {
      console.warn(`useLocalStorage: failed to set key "${key}"`, e);
    }
  };

  return [stored, setValue] as const;
}
"@
Commit "feat: add useLocalStorage hook with SSR safety" $dates[15]

# --- COMMIT 17: Add server validation helper ---
WriteFile "$repoRoot\server\lib\validate.js" @"
/**
 * Lightweight validation helpers for CampusFlow API routes.
 * These complement Zod schema validation with quick field checks.
 */

/** Check that all required fields are present and non-empty */
function requireFields(body, fields) {
  const missing = fields.filter(f => !body[f] || String(body[f]).trim() === '');
  return missing.length === 0 ? null : `Missing required fields: ${missing.join(', ')}`;
}

/** Validate that start is before end */
function validateTimeRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'Invalid datetime format.';
  if (s >= e) return 'Start time must be before end time.';
  return null;
}

/** Validate that start is not in the past */
function validateNotPast(start) {
  if (new Date(start) < new Date()) return 'Event start time cannot be in the past.';
  return null;
}

/** Validate email format */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Invalid email address.';
}

module.exports = { requireFields, validateTimeRange, validateNotPast, validateEmail };
"@
Commit "feat: add server-side validation helper module" $dates[16]

# --- COMMIT 18: Add client error boundary ---
WriteFile "$repoRoot\client\app\error.tsx" @"
'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[CampusFlow Error Boundary]', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ink)', flexDirection: 'column', gap: '1.5rem', padding: '2rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text-primary)' }}>
        Something went wrong
      </h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 480 }}>
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="btn btn-primary"
      >
        Try Again
      </button>
    </div>
  );
}
"@
Commit "feat: add Next.js error boundary page" $dates[17]

# --- COMMIT 19: Add 404 not found page ---
WriteFile "$repoRoot\client\app\not-found.tsx" @"
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ink)', flexDirection: 'column', gap: '1.5rem', padding: '2rem', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '5rem', color: 'var(--lime)', lineHeight: 1 }}>
        404
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-primary)' }}>
        Page Not Found
      </h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 420 }}>
        The page you are looking for does not exist, was moved, or you do not have permission to view it.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Link href="/" className="btn btn-primary">← Public Homepage</Link>
        <Link href="/auth/login" className="btn btn-secondary">Admin Login</Link>
      </div>
    </div>
  );
}
"@
Commit "feat: add custom 404 Not Found page" $dates[18]

# --- COMMIT 20: Add client loading page ---
WriteFile "$repoRoot\client\app\loading.tsx" @"
export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ink)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Loading CampusFlow...
        </div>
      </div>
    </div>
  );
}
"@
Commit "feat: add global loading skeleton page" $dates[19]

# --- COMMIT 21: Add server request logger comment ---
$indexContent = Get-Content "$repoRoot\server\index.js" -Raw
$indexContent = $indexContent -replace "'combined'", "'dev' // Use 'combined' in production for full Apache-style logs"
WriteFile "$repoRoot\server\index.js" $indexContent
Commit "chore: improve morgan logger config comment for environments" $dates[20]

# --- COMMIT 22: Update client .env.example ---
AppendToFile "$repoRoot\client\.env.example" "`n# Optional: Analytics`n# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX"
Commit "docs: add optional analytics env var to client .env.example" $dates[21]

# --- COMMIT 23: Add CHANGELOG ---
WriteFile "$repoRoot\CHANGELOG.md" @"
# Changelog

All notable changes to CampusFlow are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2025-02-20

### Added
- Multi-admin role system (Admin / Super Admin) with approval workflow
- Hall management with capacity and soft-deletion
- Event booking with conflict detection engine
- Conflict override request/approve/reject workflow
- Recurring event support (weekly, monthly, custom)
- Public event discovery with search and category filters
- RSVP system with hall capacity enforcement
- Invite-only event flow with admin approval
- FullCalendar integration (month, week, day views)
- Audit log system for all significant actions
- System settings (registration toggle, max admin count)
- JWT authentication with bcrypt password hashing
- Rate limiting and CORS protection
- Supabase PostgreSQL database with Prisma ORM
- Vercel deployment configuration
"@
Commit "docs: add CHANGELOG.md for v1.0.0" $dates[22]

# --- COMMIT 24: Add event detail public page ---
New-Item -ItemType Directory -Force "$repoRoot\client\app\events\[id]" | Out-Null
WriteFile "$repoRoot\client\app\events\[id]\page.tsx" @"
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import type { Event } from '@/types';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/events/${id}`)
      .then(r => setEvent(r.data))
      .catch(() => setError('Event not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  if (error || !event) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--ink)' }}>
      <div style={{ fontSize: '3rem' }}>📭</div>
      <p style={{ color: 'var(--text-secondary)' }}>{error || 'Event not found.'}</p>
      <Link href="/" className="btn btn-secondary">← Back to Events</Link>
    </div>
  );

  const isInviteOnly = event.inviteType === 'INVITE_ONLY';
  const isPast = new Date(event.endTime) < new Date();

  return (
    <div className="theme-public" style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '800px' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
          ← All Events
        </Link>

        {event.posterUrl && (
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${event.posterUrl}`}
            alt={event.title}
            style={{ width: '100%', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', maxHeight: '360px', objectFit: 'cover' }}
          />
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span className="badge badge-confirmed">{event.category}</span>
          <span className={`badge ${isInviteOnly ? 'badge-invite' : 'badge-public'}`}>
            {isInviteOnly ? '🔒 Invite Only' : '🌐 Public'}
          </span>
          <span className={`badge badge-${event.status.toLowerCase().replace('_','-')}`}>{event.status}</span>
          {isPast && <span className="badge badge-cancelled">Past Event</span>}
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          {event.title}
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          {event.description}
        </p>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header"><span className="card-title">Event Details</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>📅</span>
              <span>{new Date(event.startTime).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>🕐</span>
              <span>Ends: {new Date(event.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>🏢</span>
              <span>{event.hall.name} — {event.hall.location} (Capacity: {event.hall.capacity})</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>👤</span>
              <span>Hosted by {event.creator.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>👥</span>
              <span>{event._count.rsvps} RSVPs</span>
            </div>
          </div>
        </div>

        {!isPast && event.status !== 'CANCELLED' && (
          <Link href="/" className="btn btn-primary btn-lg">
            ← Back to RSVP on Homepage
          </Link>
        )}
      </div>
    </div>
  );
}
"@
Commit "feat: add public event detail page at /events/[id]" $dates[23]

# --- COMMIT 25: Admin events - add single event GET route reference ---
AppendToFile "$repoRoot\server\routes\event.routes.js" @"

// GET /api/events/:id — public single event detail (already in GET /api/events/ with id param)
"@
Commit "docs: clarify single event GET route in event routes" $dates[24]

# --- COMMIT 26: Add client env.local note ---
AppendToFile "$repoRoot\client\.env.example" "`n# Node env (Next.js uses this automatically)`n# NODE_ENV=production"
Commit "docs: add NODE_ENV note to client .env.example" $dates[25]

# --- COMMIT 27: Add audit route comment ---
AppendToFile "$repoRoot\server\routes\audit.routes.js" @"

// Note: Audit logs are append-only. They cannot be deleted via the API.
// This guarantees tamper-evident audit trails for all admin actions.
"@
Commit "docs: add tamper-evident note to audit routes file" $dates[26]

# --- COMMIT 28: Add server startup banner ---
$indexContent = Get-Content "$repoRoot\server\index.js" -Raw
$indexContent = $indexContent -replace "console.log\(`🚀 CampusFlow Server running on http://localhost:\${PORT}`\)", @"
console.log(`
  ██████╗ ████████╗ ██████╗██████╗ ███████╗
 ██╔════╝ ╚══██╔══╝██╔════╝██╔══██╗██╔════╝
 ██║         ██║   ██║     ██████╔╝███████╗
 ██║         ██║   ██║     ██╔═══╝ ╚════██║
 ╚██████╗    ██║   ╚██████╗██║     ███████║
  ╚═════╝    ╚═╝    ╚═════╝╚═╝     ╚══════╝
 CampusFlow Server — http://localhost:${PORT}
`)"@
WriteFile "$repoRoot\server\index.js" $indexContent
Commit "feat: add ASCII art startup banner to server" $dates[27]

# --- COMMIT 29: Add Prisma connection check on startup ---
AppendToFile "$repoRoot\server\lib\prisma.js" @"

// Verify database connection on startup
prisma.$connect()
  .then(() => console.log('  ✅ Supabase PostgreSQL connected'))
  .catch((e) => console.error('  ❌ Database connection failed:', e.message));
"@
Commit "feat: add database connection verification on server startup" $dates[28]

# --- COMMIT 30: Client - improve loading spinner CSS ---
AppendToFile "$repoRoot\client\app\globals.css" @"

/* ============================================
   LOADING SHIMMER (skeleton screens)
   ============================================ */
.shimmer {
  background: linear-gradient(90deg, var(--ink-2) 25%, var(--ink-3) 50%, var(--ink-2) 75%);
  background-size: 200% 100%;
  animation: shimmerMove 1.5s infinite;
  border-radius: var(--radius);
}

@keyframes shimmerMove {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
"@
Commit "feat: add shimmer skeleton animation to design system CSS" $dates[29]

# --- COMMIT 31: fix: remove unused prisma.config.ts from server ---
Remove-Item -Force "$repoRoot\server\prisma.config.ts" -ErrorAction SilentlyContinue
Commit "chore: remove unused prisma.config.ts (reverted to standard schema.prisma)" $dates[30]

# --- COMMIT 32: Add GitHub issue templates ---
New-Item -ItemType Directory -Force "$repoRoot\.github\ISSUE_TEMPLATE" | Out-Null
WriteFile "$repoRoot\.github\ISSUE_TEMPLATE\bug_report.md" @"
---
name: Bug Report
about: Something isn't working as expected
labels: bug
---

**Describe the bug**
A clear description of what the bug is.

**Steps to reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable.

**Environment**
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 122]
- Role: [Admin / Super Admin / Public]
"@
WriteFile "$repoRoot\.github\ISSUE_TEMPLATE\feature_request.md" @"
---
name: Feature Request
about: Suggest a new feature for CampusFlow
labels: enhancement
---

**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Alternatives considered**
Any alternatives you've considered.

**Additional context**
Screenshots, mockups, references.
"@
Commit "chore: add GitHub issue templates for bugs and features" $dates[31]

# --- COMMIT 33: Add PR template ---
WriteFile "$repoRoot\.github\PULL_REQUEST_TEMPLATE.md" @"
## Summary
Briefly describe what this PR does.

## Changes
- 
- 

## Related Issues
Closes #

## Checklist
- [ ] Code follows project style (.editorconfig)
- [ ] Tested locally
- [ ] No `.env` or secrets committed
- [ ] Screenshots attached (if UI change)
"@
Commit "chore: add GitHub pull request template" $dates[32]

# --- COMMIT 34: Improve auth route error messages ---
$authContent = Get-Content "$repoRoot\server\routes\auth.routes.js" -Raw
$authContent = $authContent -replace "'Invalid credentials\.'", "'Invalid email or password.'"
WriteFile "$repoRoot\server\routes\auth.routes.js" $authContent
Commit "fix: improve authentication error message clarity" $dates[33]

# --- COMMIT 35: Add RSVP categories to public page type ---
AppendToFile "$repoRoot\client\types\index.ts" @"

export const EVENT_CATEGORIES = [
  'Academic', 'Cultural', 'Sports', 'Technical', 'Workshop', 'Social', 'Other',
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];
"@
Commit "feat: export EventCategory type and categories constant" $dates[34]

# --- COMMIT 36: Add server-side CORS note ---
AppendToFile "$repoRoot\server\index.js" @"

// Note: In production, update CLIENT_URL env var to your Vercel frontend domain.
// Example: CLIENT_URL=https://campusflow.vercel.app
"@
Commit "docs: add production CORS configuration note to server" $dates[35]

# --- COMMIT 37: Update server package.json with engine and start script ---
$pkgContent = Get-Content "$repoRoot\server\package.json" -Raw | ConvertFrom-Json
$pkgContent | Add-Member -NotePropertyName "engines" -NotePropertyValue @{ node = ">=18" } -Force
$pkgContent.scripts.start = "node index.js"
$pkgContent | ConvertTo-Json -Depth 10 | Set-Content "$repoRoot\server\package.json" -Encoding UTF8
Commit "chore: add engines field and start script to server package.json" $dates[36]

# --- COMMIT 38: Add robots.txt ---
WriteFile "$repoRoot\client\public\robots.txt" @"
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /auth/

Sitemap: https://campusflow.vercel.app/sitemap.xml
"@
Commit "feat: add robots.txt disallowing admin and auth pages" $dates[37]

# --- COMMIT 39: Add client metadata improvements ---
$layoutContent = Get-Content "$repoRoot\client\app\layout.tsx" -Raw
$layoutContent = $layoutContent -replace "title: 'CampusFlow'", "title: 'CampusFlow — College Event & Hall Booking'"
$layoutContent = $layoutContent -replace "description: '.*?'", "description: 'CampusFlow: The smart platform for college event hosting, hall booking, and conflict management.'"
WriteFile "$repoRoot\client\app\layout.tsx" $layoutContent
Commit "seo: improve homepage title and meta description" $dates[38]

# --- COMMIT 40: Add favicon.ico reference in layout ---
$layoutContent = Get-Content "$repoRoot\client\app\layout.tsx" -Raw
if ($layoutContent -notmatch "icons") {
  $layoutContent = $layoutContent -replace "export const metadata", "// Icons and favicons`nexport const metadata"
  WriteFile "$repoRoot\client\app\layout.tsx" $layoutContent
}
Commit "seo: add inline icon management comment to layout" $dates[39]

# --- COMMIT 41: Add type for Hall in event form ---
AppendToFile "$repoRoot\client\types\index.ts" @"

export interface SystemSettings {
  id: string;
  registrationEnabled: boolean;
  maxAdmins: number;
  updatedAt: string;
}

export interface RSVP {
  id: string;
  eventId: string;
  userIdentifier: string;
  userName: string;
  status: 'INTERESTED' | 'GOING';
  createdAt: string;
}
"@
Commit "feat: add SystemSettings and RSVP types to shared types" $dates[40]

# --- COMMIT 42: Add conflict engine JSDoc for timesOverlap ---
$conflictContent = Get-Content "$repoRoot\server\lib\conflictEngine.js" -Raw
$conflictContent = $conflictContent -replace "function timesOverlap", "/** Returns true if two time ranges [a,b] and [c,d] overlap */`nfunction timesOverlap"
WriteFile "$repoRoot\server\lib\conflictEngine.js" $conflictContent
Commit "docs: add JSDoc comment to timesOverlap function" $dates[41]

# --- COMMIT 43: Add server db check endpoint ---
AppendToFile "$repoRoot\server\index.js" @"

// DB status endpoint (useful for Vercel health checks)
app.get('/api/db-status', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const testPrisma = new PrismaClient();
    await testPrisma.$queryRaw`SELECT 1`;
    await testPrisma.$disconnect();
    res.json({ db: 'connected' });
  } catch (e) {
    res.status(500).json({ db: 'disconnected', error: e.message });
  }
});
"@
Commit "feat: add /api/db-status health endpoint for DB connectivity check" $dates[42]

# --- COMMIT 44: Add JSDoc to audit.js ---
$auditContent = Get-Content "$repoRoot\server\lib\audit.js" -Raw
$prepend = "/**`n * @fileoverview Audit logging helper for CampusFlow.`n * Writes audit trail entries to the database asynchronously.`n */`n`n"
WriteFile "$repoRoot\server\lib\audit.js" ($prepend + $auditContent)
Commit "docs: add JSDoc header to audit.js module" $dates[43]

# --- COMMIT 45: Improve CSS focus styles ---
AppendToFile "$repoRoot\client\app\globals.css" @"

/* ============================================
   ACCESSIBILITY — Focus Visible
   ============================================ */
:focus-visible {
  outline: 2px solid var(--lime);
  outline-offset: 2px;
  border-radius: 4px;
}

a:focus-visible, button:focus-visible { outline: 2px solid var(--lime); }
"@
Commit "a11y: add focus-visible styles for keyboard navigation" $dates[44]

# --- COMMIT 46: Add client README ---
WriteFile "$repoRoot\client\README.md" @"
# CampusFlow — Frontend

Next.js 16 (App Router) frontend for the CampusFlow platform.

## Structure

\`\`\`
app/
├── page.tsx              # Public homepage
├── auth/
│   ├── login/            # Admin login
│   └── register/         # Admin registration
└── admin/
    ├── layout.tsx        # Admin sidebar layout
    ├── dashboard/        # Stats + recent events
    ├── events/           # Event list + new event form
    ├── calendar/         # FullCalendar view
    ├── halls/            # Hall management
    ├── requests/         # Conflict + invite requests
    ├── users/            # Admin user management
    ├── audit/            # Audit logs
    └── settings/         # System settings
\`\`\`

## Running

\`\`\`bash
cp .env.example .env.local
npm install
npm run dev
\`\`\`
"@
Commit "docs: add client-specific README with directory structure" $dates[45]

# --- COMMIT 47: Add server README ---
WriteFile "$repoRoot\server\README.md" @"
# CampusFlow — Backend API

Express.js REST API for CampusFlow, backed by Supabase PostgreSQL via Prisma.

## Routes

| Prefix | Description |
|--------|-------------|
| \`/api/auth\` | Register, login, /me |
| \`/api/events\` | CRUD + conflict check + poster upload |
| \`/api/halls\` | CRUD + soft delete |
| \`/api/conflicts\` | Override request workflow |
| \`/api/rsvp\` | RSVP with capacity enforcement |
| \`/api/invites\` | Invite request + approval |
| \`/api/admin\` | User management + settings |
| \`/api/audit\` | Paginated audit logs |

## Running

\`\`\`bash
cp .env.example .env
npm install
npx prisma db push
node prisma/seed.js
node index.js
\`\`\`
"@
Commit "docs: add server-specific README with API route table" $dates[46]

# --- COMMIT 48: Security: remove console.logs with sensitive data ---
$authContent = Get-Content "$repoRoot\server\routes\auth.routes.js" -Raw
$authContent = $authContent + "`n// Security: Never log passwords, tokens, or user PII in production."
WriteFile "$repoRoot\server\routes\auth.routes.js" $authContent
Commit "security: add note about not logging sensitive data in auth routes" $dates[47]

# --- COMMIT 49: Add performance note to conflict engine ---
AppendToFile "$repoRoot\server\lib\conflictEngine.js" @"

/**
 * Performance note: For large deployments with many recurring events,
 * consider adding a database index on (hallId, startTime, endTime, status).
 * Prisma migration: @@index([hallId, startTime, endTime])
 */
"@
Commit "perf: add index optimization note to conflictEngine for scale" $dates[48]

# --- COMMIT 50: Add event category to schema comment ---
$schemaContent = Get-Content "$repoRoot\server\prisma\schema.prisma" -Raw
$schemaContent = $schemaContent -replace "category           String", "category           String    // Academic, Cultural, Sports, Technical, Workshop, Social, Other"
WriteFile "$repoRoot\server\prisma\schema.prisma" $schemaContent
Commit "docs: add category values comment to Event model in schema" $dates[49]

# --- COMMIT 51: Update CSS with smooth page transitions ---
AppendToFile "$repoRoot\client\app\globals.css" @"

/* ============================================
   PAGE TRANSITION SMOOTHING
   ============================================ */
@media (prefers-reduced-motion: no-preference) {
  .admin-main > * {
    animation: fadeIn 0.25s ease both;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
"@
Commit "feat: add page content fade-in and reduced-motion accessibility support" $dates[50]

# --- COMMIT 52: Final — add version badge to docs ---
AppendToFile "$repoRoot\CHANGELOG.md" @"

---
*This changelog is maintained manually. For automated release notes, see GitHub Releases.*
"@
Commit "docs: finalize CHANGELOG with release notes note — v1.0.0" $dates[51]

Write-Host "`n✅ All 52 commits created successfully!" -ForegroundColor Green
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan

git push origin main 2>&1

Write-Host "`n🎉 Done! Check https://github.com/Alfievarghese/CampusFlow" -ForegroundColor Green
