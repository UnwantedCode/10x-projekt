# CLAUDE.md

Guidance for Claude Code in this repository.

## Quick Reference

Tech: Astro 5 + React 19 + TypeScript 5 + Tailwind 4 + Shadcn/ui + Supabase

```bash
npm run dev       # Dev server (port 3000)
npm run build     # Production build
npm run lint:fix  # Lint + auto-fix
npm run format    # Prettier
```

Node: 22.14.0 (see `.nvmrc`)

## Key Rules

- **Astro-first**: Use `.astro` for static, `.tsx` only for interactivity
- **No "use client"**: This is Astro, not Next.js
- **Supabase via context**: Use `context.locals.supabase`, not direct import

## Detailed Guidelines

See `.claude/rules/` for context-specific rules:
- `general.md` - Project structure, coding practices
- `astro.md` - Astro patterns (auto-loaded for .astro files)
- `react.md` - React patterns (auto-loaded for .tsx files)
- `backend.md` - Supabase integration
- `frontend.md` - Tailwind, accessibility
- `db-supabase-migrations.md` - SQL migrations