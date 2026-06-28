# RFC 001: Adding Email Client Support to Space

### 1. Recommendation Based on Current RFCs and Best Practices

**The main protocol today is still IMAP + SMTP** (RFC 3501 and others).  
This is the most universal solution that works with **all** providers (Gmail, Outlook, Yandex, custom servers, etc.).

**JMAP (RFC 8620 + RFC 8621)** is the modern replacement for IMAP.  
It is JSON-based, stateless, faster, and much more web-friendly (batch requests, built-in pagination, better synchronization). However, **support is still limited** — mainly Fastmail, some self-hosted servers (Stalwart, Cyrus), and partial support from Gmail and Microsoft Graph.

**Conclusion (2026):**
- For **maximum compatibility** with any provider → **IMAP + SMTP** is required.
- For **better modern UX** → Add **JMAP** + **Gmail API / Microsoft Graph** as optimized paths where available.

### 2. Best Backend Packages

| Priority | Solution | Best For | Pros | Cons |
|----------|---------|----------|------|------|
| **#1 Recommendation** | **EmailEngine** (based on ImapFlow) | Most projects (fastest start) | Ready REST API + Webhooks, OAuth2, Gmail/MS Graph support, real-time | Runs as a separate service (Docker) |
| **#2** | **ImapFlow** + **Nodemailer** | Full control & customization | Modern, async/await, great TypeScript support, fast | You have to implement sync logic yourself |
| Alternative | node-imap | Legacy projects only | Simple | Outdated |

**Nodemailer** — the absolute standard for sending emails via SMTP.

### 3. Recommended Architecture

1. **Backend** (Node.js / TypeScript)
   - Start with **EmailEngine** (easiest and fastest).
   - Or build yourself: ImapFlow + Nodemailer + Redis + BullMQ.

2. **Frontend** (React + TanStack)
   - `@tanstack/react-query` — for emails, folders, threads, caching
   - `@tanstack/react-table` — email list with virtualization
   - React Context — UI state for MVP (selected email, composer, layout)
   - Upgrade to Zustand or Jotai later if UI state grows complex or causes re-render issues
   - Shadcn/ui + Tailwind CSS

3. **Extras**
   - OAuth2 support
   - `mailparser` + `dompurify` for safe email rendering
   - WebSocket / SSE for real-time updates

### 4. Step-by-Step Launch Plan

**Phase 1 (1–2 days)**  
- Run **EmailEngine** via Docker.  
- Connect a test Gmail/Outlook account using OAuth.  
- Create basic endpoints: accounts, folders, emails, send.

**Phase 2**  
- Set up TanStack Query on the frontend.  
- Build folder list + email list + email viewer.

**Phase 3**  
- Email composer (Tiptap or React Quill).  
- Attachments, search, labels, move emails.

**Phase 4**  
- Real-time updates via webhooks.  
- Offline caching.  
- Add JMAP support where possible.

---

Would you like me to prepare any of these right now in English?

- Full `docker-compose` + EmailEngine examples?
- ImapFlow code examples?
- React + TanStack project structure?
- OAuth2 setup guide?

Just tell me what you need next.