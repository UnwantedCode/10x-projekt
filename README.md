# AI Task Manager (MVP)

![Version](https://img.shields.io/badge/version-0.0.1-informational)

A lightweight **web** task manager focused on one thing: helping users decide **what matters most**.  
Tasks use a simple **3-level priority model** (Low / Medium / High), with **optional AI** acting as a “second opinion” that suggests a priority plus a short justification. Users always stay in control (accept / edit / reject with a reason).

## Table of contents

- [1. Project name](#1-project-name)
- [2. Project description](#2-project-description)
- [3. Tech stack](#3-tech-stack)
- [4. Getting started locally](#4-getting-started-locally)
- [5. Available scripts](#5-available-scripts)
- [6. Project scope](#6-project-scope)
- [7. Project status](#7-project-status)
- [8. License](#8-license)

---

## 1. Project name

**AI Task Manager (MVP)**  
Repository/package name: **10x-astro-starter**

## 2. Project description

AI Task Manager is designed for users who manage many tasks and want a fast way to **prioritize** without heavy calendar planning.

Core concepts:

- **Multiple task lists** per user (e.g., “Today”, “This week”, “Project A”)
- Tasks have: **title**, **description**, **priority** (Low/Medium/High), **status** (To do / Done)
- **Done tasks are hidden by default** and can be shown via a filter
- **Manual ordering** of tasks within the same priority (e.g., drag & drop)
- Optional **AI priority suggestion** (never automatic):
  - suggests priority + one-sentence reasoning
  - user can **accept**, **modify**, or **reject with a required reason**
- **AI interaction analytics** is part of the MVP (to measure usefulness and guide future personalization)

> See: [`doc/prd.md`](./doc/prd.md) for the full Product Requirements Document.

## 3. Tech stack

Frontend:

- **Astro 5** (web framework)
- **React 19** (interactive UI components)
- **TypeScript 5**
- **Tailwind CSS 4**
- **shadcn/ui** (UI component patterns; Radix primitives + utilities)

Backend / data:

- **Supabase** (PostgreSQL database + Auth + SDK; can be hosted in Supabase Cloud or self-hosted)

Tooling:

- **ESLint** + **Prettier** (linting & formatting)
- **Husky** + **lint-staged** (pre-commit quality gates)

Testing:

- **Vitest** + **React Testing Library** (unit, component, and integration tests)
- **Playwright** (E2E tests)

CI/CD & hosting:

- **GitHub Actions**
- **SMALL.pl** (deployment target)

> See: [`doc/tech-stack.md`](./doc/tech-stack.md) for the rationale and stack notes.

## 4. Getting started locally

### Prerequisites

- **Node.js**: `22.14.0` (from `.nvmrc`)
- Package manager: `npm` (recommended)

If you use `nvm`:

```bash
nvm use
```

### Install

```bash
npm install
```

### Environment variables

This project is intended to use **Supabase** for Auth and data storage.  
Create a `.env` file (or `.env.local`) as needed by your implementation.

Typical Supabase configuration includes:

- Supabase project URL
- Supabase public (anon) key

> If this repository contains an `.env.example`, copy it to `.env` and fill in the values.

### Run the dev server

```bash
npm run dev
```

Astro will print the local URL in the console (commonly `http://localhost:4321`).

### Production build & preview

```bash
npm run build
npm run preview
```

## 5. Available scripts

From [`package.json`](./package.json):

- `npm run dev` — start the local dev server
- `npm run build` — build for production
- `npm run preview` — preview the production build locally
- `npm run astro` — run Astro CLI
- `npm run lint` — run ESLint
- `npm run lint:fix` — run ESLint with auto-fix
- `npm run format` — format the repository with Prettier

## 6. Project scope

### In scope (MVP)

- Web app for a **single user account** (no sharing/collaboration)
- User authentication (register/login/logout) and resource authorization
- Multiple task lists per user (CRUD)
- Task CRUD:
  - title (required)
  - description (optional but recommended)
  - priority (required: Low/Medium/High)
  - status (To do / Done)
- Default view shows **only To do** tasks
- Filter to include/show **Done** tasks
- Sorting by priority (High → Medium → Low)
- Manual ordering within the same priority
- Optional AI-powered priority suggestion + justification
- AI interaction logging for analytics (accept/modify/reject + timestamps and reject reason)
- Basic onboarding (first run) + ability to reopen onboarding

### Out of scope (not in MVP)

- Sharing tasks with other users / collaboration
- Calendar scheduling, time-based reminders
- Automatic priority changes without explicit user action
- Advanced planning (subtasks, dependencies, stages)
- Mobile app

## 7. Project status

**MVP: In progress** (package version `0.0.1`).

The repository currently provides the frontend stack and tooling (Astro + React + TS + Tailwind), and the PRD defines the full MVP feature set. The Supabase backend integration and product features are expected to be implemented iteratively.

## 8. License

No license file is included in this repository yet.

If you plan to make this project public/open-source, add a `LICENSE` file (e.g., MIT, Apache-2.0) and update this section accordingly.
