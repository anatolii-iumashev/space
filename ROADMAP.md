# MVP
- [ ] Files by Vaults - access by Vault too. In future - add access by file and folder.
    - Store files 
    - in local filesystem (for simple cases like home lab and NAS).
    - in S3-compatible storage (e.g. MinIO).
    - add new vault by type like S3 or local path (via configuration).
- [ ] By default - one user and email & pass set via environment variables. Future: multiple users with §registration and login. Registration disabled by default.
- Unified personal dashboard with files, emails, calendars, and search.
- Sync calendar with CalDAV (e.g. Google Calendar).
- Proxy email via IMAP/SMTP (e.g. Gmail).
- Unified search across calendar events, files, and emails.

- REST API docs as endpoint - OpenAPI specs - for all operations (files, calendar, mail, search).


# [x] PoC
- Elysia JS https://elysiajs.com/
- BunJS https://bun.sh/
- Drizzle ORM https://orm.drizzle.team/
- TAN Stack https://tanstack.com/
- React https://react.dev/
- Shadcn UI https://ui.shadcn.com/

# Future
- Add support for multiple accounts (e.g. multiple email providers, calendar accounts).
- Add support for team collaboration (e.g. shared calendar, file sharing).
- Add support for plugins (e.g. integrate with third-party services like Trello, Slack).
- Add support for mobile (e.g. React Native app).