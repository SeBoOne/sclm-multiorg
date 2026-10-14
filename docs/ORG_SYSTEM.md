# SCLM v6 — Org System Documentation

## Overview

v6 adds a multi-tenant organisation layer. Each "Org" is an independent group with its own:
- Event history
- Item/participant/commodity autocomplete databases  
- Stats (total items raffled, total revenue)
- Admin secret
- Optional logo URL

The home page now shows a global stats bar + org code login instead of a flat event list.

---

## User Flow

```
Home page
    │
    ├─ Enter Org Code (e.g. "TSG") + prompted for Org Secret
    │       │
    │       └─ Org Lobby
    │               ├─ Org logo + name + stats
    │               ├─ Event list (this org only)
    │               ├─ [+ Neues Event] → create event → direct to session admin
    │               └─ [Org-Administration] → prompts for secret again → Org Admin
    │
    └─ Create New Org → name + code → auto-login to new org lobby
```

---

## Org Security Model

- **Org Code** — public identifier (e.g. "TSG"). Anyone can know it. Used to look up org info.
- **Org Secret** — required to access event list, create events, or administer the org. Never transmitted in URLs (always POST body or query param for GET requests).
- **Site Admin Secret** — can see and manage all orgs. Different from org secrets.

Session (event) codes are independent of orgs:
- Admin code and join code still work the same way
- Participants joining via join code don't need to know the org code
- Events just happen to belong to an org (stored as `org_id` on the session row)

---

## Data Migration (v5 → v6)

On first boot with v6 code against an existing v5 database:

1. `init_db()` runs migrations: adds `org_id TEXT` column to sessions, item_db, commodity_db, participant_db
2. Creates a default org: `id='default'`, `name='My Organisation'`, `code='MAIN'`, `secret=<random>`
3. Updates all existing rows: `SET org_id='default' WHERE org_id IS NULL`
4. Startup logs show the MAIN org's secret

The admin should then:
1. Note the MAIN org secret from logs
2. Log in with code `MAIN` + that secret
3. Go to Org Admin → rename the org and change the code if desired
4. Optionally change the org secret to something memorable

---

## Org Admin Capabilities

### Settings
- Org name
- Org code (must be unique, 2–12 chars, A-Z 0-9 - _)
- Logo URL (external image, displayed in lobby header)
- New org secret

### Org-scoped Databases
Same as site admin superadmin DBs but scoped to this org only:
- **Gegenstände-DB** — autocomplete for loot items (name, type, grade, size)
- **Teilnehmer-DB** — autocomplete for participant names
- **Waren-DB** — autocomplete for commodity names
- **UEX Import** — imports from UEX Corp API into this org's item DB

### What Org Admins CANNOT do:
- See other orgs' data
- Access site-level admin (requires site admin secret)
- Delete an org (only site admin can)

---

## Site Admin Org Management

In the superadmin panel (accessible via `/#admin?secret=<site-secret>`), the first tab is now **Orgs**:

- Lists all orgs with: name, code, logo preview, event count, secret
- Create new org with custom name, code, and optional secret
- Edit org: name, code, logo, secret (via prompt dialogs)
- Delete org (except the default org)

Org secrets are shown in plain text in the site admin panel — this is intentional, as org admins may lose their secrets and need the site admin to recover them.

---

## API Details

### Verify org access
```
POST /api/orgs/<code>/verify
Body: {"secret": "..."}
Response: {"ok": true, "secret": "...", "id": "..."}
```

### Get org event list (requires secret)
```
GET /api/orgs/<code>/sessions?secret=<org-secret>
Response: {
    "sessions": [{
        "id", "name", "created", "join_code", "admin_code",
        "locked", "raffle_locked", "commodities_locked",
        "raffle_done", "commodity_revenue", "image_url"
    }],
    "stats": {
        "total_raffled": 42,
        "total_revenue": 125000
    }
}
```

### Create event within org
```
POST /api/orgs/<code>/create_session
Body: {"org_secret": "...", "name": "Event Name", "max_wishes": 3}
Response: {"id": "...", "admin_code": "...", "join_code": "..."}
```

### Update org settings
```
PATCH /api/orgs/<code>/settings
Body: {
    "secret": "current-secret",
    "name": "New Name",           // optional
    "new_code": "NEWCODE",        // optional, must be unique
    "logo_url": "https://...",    // optional, null to clear
    "new_secret": "new-secret"    // optional, min 6 chars
}
```

---

## Known Remaining Issues

### Bug: `oaAddPN` / `oaAddCo` bypass org scoping
The org admin's "add to participant DB" and "add to commodity DB" buttons call server endpoints that may not correctly scope to the org. Needs verification:

```javascript
// app.js ~line 1585
async function oaAddPN() {
  // This posts to /api/admin/participants which accepts org_id in body
  // Server endpoint at server.py line 733 needs to handle org_id
  await fetch('/api/admin/participants', {method:'POST', ...
    body: JSON.stringify({secret: ORG_SECRET, name: nm, org_id: ORG.id})
  });
}
```

Check that `admin_add_participant_db()` in server.py correctly uses `org_id` from request body.

### Bug: `restoreOrgSession` not awaited in boot
```javascript
// app.js boot section
initLang().then(async () => {
  restoreOrgSession().catch(()=>{});  // fire-and-forget — could race with navigation
  // ...
```
If org session restores after navigation already started, it might not take effect. Should be awaited.

### Missing: onLangChange doesn't handle org pages
`pg-org` and `pg-org-admin` are not in the `onLangChange` pages map, so language switching while on those pages doesn't re-render content.

### Missing: home event list cleanup
The old `<div id="event-list">` in `pg-home` is still in index.html but is now hidden and unused. `loadHome()` in app.js still renders into it. Should be cleaned up.
