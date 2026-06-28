# AGENTS.md

Instructions for AI agents working on the Space project.

## Commands

### Docker (default)

- Start all: `docker compose up`
- Start detached: `docker compose up -d`
- Stop: `docker compose down`
- Logs backend: `docker compose logs -f backend`
- Logs frontend: `docker compose logs -f frontend`
- Shell in backend: `docker compose exec backend sh`
- Shell in frontend: `docker compose exec frontend sh`
- DB studio: `docker compose exec backend bun run db:studio`

### Local (without Docker)

- Install deps: `bun install` (root), then `cd src/client && bun install`
- Start backend: `bun dev` (port 3000)
- Start frontend: `bun dev:client` (port 3001)
- Database generate: `bun run db:generate`
- Database migrate: `bun run db:migrate`
- Database studio: `bun run db:studio`

## Tech Stack

- **Runtime:** Bun
- **Backend:** ElysiaJS, Drizzle ORM, bun:sqlite (dev) → PostgreSQL (prod)
- **Frontend:** React 19, React Router, Vite, Tailwind CSS v4, **shadcn/ui**
- **Integrations:** S3 (aws-sdk v2), IMAP/SMTP (imapflow, nodemailer), CalDAV (ical.js)

## UI Components (shadcn/ui)

- Components live in `src/client/components/ui/` — added via CLI, edited as source
- Add components: `bunx --bun shadcn@latest add <component>`
- Search available components: `bunx --bun shadcn@latest search <query>`
- Docs for a component: `bunx --bun shadcn@latest docs <component>`
- Full LLM reference: https://ui.shadcn.com/llms.txt
- A shadcn skill is available at `.agents/skills/shadcn/SKILL.md` — use it for any shadcn-related UI work
- **Never** use raw `div` with manual spacing for forms — use `FieldGroup`/`Field`
- **Always** use semantic color tokens (`bg-primary`, `text-muted-foreground`) — never raw Tailwind color values
- Use `cn()` for conditional class merging

## Code Style

- TypeScript strict mode
- Single quotes, no semicolons
- Functional patterns where possible
- Backend: ElysiaJS plugin pattern — each feature = one file in `src/backend/plugins/`
- Frontend: One component per file in `src/client/components/`

## Project Structure

```
src/
├── backend/        # ElysiaJS API server
│   ├── plugins/    # Feature endpoints (auth, calendar, files, mail, search)
│   ├── services/   # External integrations (caldav, mail, s3)
│   ├── db/         # Drizzle schema, connection, migrations
│   └── index.ts    # App entry point
├── client/         # React SPA (has its own package.json)
│   ├── components/ # UI components
│   ├── lib/        # API client
│   └── ...
└── shared/         # Shared TypeScript types
```

## Key Rules

- Backend runs on port **3000**, frontend on port **3001**
- Client has its own `package.json` and `node_modules` in `src/client/`
- Database schema lives in `src/backend/db/schema.ts`
- Shared types go in `src/shared/types.ts`
- Environment config in `.env` (never commit secrets)

## Boundaries

- ✅ Always: Write to `src/`, follow plugin pattern for backend features
- ⚠️ Ask first: Database schema changes, adding dependencies, changing API contracts
- 🚫 Never: Commit secrets, edit `node_modules/`, modify `bun.lock` manually
