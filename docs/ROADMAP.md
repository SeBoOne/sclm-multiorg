# SCLM Roadmap

## v5.0 — Current Live Version ✅

Fully stable at https://sclm.site

### Features
- Multi-session event management
- Participant self-registration via join code
- Wish-list / no-interest selection
- Three-category loot system: Item / Ship Weapon / Component (with Class, Grade, Size)
- Fair raffle algorithm (wish-first, then fewest-wins equalizer)
- Commodity/cargo tracking with 0.5% warehouse fee calculation
- Per-participant revenue share display
- Raffle results with waived/collected status
- Raidhelper JSON event import
- UEX Corp component database import
- Admin/participant/commodity autocomplete databases
- Separate raffle lock + commodities lock (independent of global session lock)
- Additive revenue entry (add each sale individually)
- Admin auto-refresh (participants tab: 4s, raffle tab: 6s)
- Creator code saved to localStorage for quick re-login
- Session state restored on page reload (sessionStorage)
- Read-only view for spectators
- Export raffle results as .txt
- DE/EN language switcher (JSON-based i18n, 265 keys)
- About page (CIG compliant, UEX badge, referral link)
- SCLM logo + full favicon set (SVG, ICO, PNG in 6 sizes, webmanifest)
- `/setup` page shown exactly once on first boot
- Zoom slider (0.8–1.4x) in topbar

---

## v6.0 — In Development 🚧

**Not yet deployed.** Adds multi-organisation (multi-tenant) support.

### What's Built
- `orgs` table with id, name, code (user-chosen), secret, logo_url
- `org_id` column on: sessions, item_db, commodity_db, participant_db
- Migration: all existing data → org `MAIN` (default org created on first boot)
- Org secrets printed to container logs on startup
- Full Org API (create, verify, sessions, stats, settings, create_session)
- Org lobby page: org logo + name + stats (raffled items + revenue) + event list
- Org admin page: name/code/logo/secret settings + org-scoped DBs + UEX import
- Site admin Org tab: list all orgs, create/edit/delete orgs
- Autocomplete endpoints scoped to `org_id`
- Org session persisted in localStorage (7-day expiry)

### Known Bug Fixed in Latest Build
- `import hmac` was missing from server.py → all org verify endpoints returned 500
- `hmac.compare_digest` regex transformation produced invalid Python syntax `str(a, str(""))` → fixed to `str(a or "", str(b or ""))`

### What Still Needs Work (v6.0 TODO)
- [ ] End-to-end testing of full org flow (login → create event → raffle → results)
- [ ] `saAddPN` / `saAddCo` in org admin use raw fetch without org_id param on server side — verify server endpoints accept `org_id` in body
- [ ] Org admin DB tabs: `loadOaItems` uses superSecret fallback — should only use ORG_SECRET
- [ ] onLangChange doesn't handle `pg-org` and `pg-org-admin` pages
- [ ] The home page still shows the old event list (`#event-list`) which is now unused — remove or repurpose
- [ ] Error message when org login fails should distinguish "wrong secret" vs "org not found"
- [ ] `restoreOrgSession()` is called in boot but not awaited — could cause race condition on slow connections
- [ ] No confirmation shown after org creation with the new secret (only auto-login)

---

## v6.1 Ideas (Post-Deploy Polish)

- [ ] Org logo preview in org lobby header
- [ ] Show org code prominently in lobby so members can share it easily
- [ ] Org-level event sorting (by date, by status)
- [ ] "Copy join link" button in event cards (pre-fills org code + event join code)
- [ ] Org stats: add "total events" count back to lobby stats
- [ ] Participant DB in org admin: search/filter by name
- [ ] Bulk import for org DBs (paste multiple names)

---

## v7.0 Ideas (Future)

### Cross-Org Event Invitations
- Orgs can invite other orgs to their events
- Invited org's participant DB available for autocomplete
- Separate `invited_orgs` column on sessions (pre-planned, column not yet added)

### Org Profiles
- Public org landing page (visible without secret)
- Org description/bio field
- Member count display

### Improved Raffle
- Manual override: admin can manually assign specific items to specific participants before finalising
- "Reserve" an item for a specific participant before raffle
- Raffle history: see previous raffle runs before overwriting

### QoL
- Dark/light theme toggle
- Mobile-optimised participant view
- Push notifications when raffle is started (browser notification API)
- CSV export of results

---

## Architecture Decisions (Why Things Are Built This Way)

### Why no user accounts?
Classic registration requires email, password reset, GDPR handling, JWT sessions. The code/secret pattern matches Star Citizen's own org/fleet invite model and requires no personal data.

### Why SQLite instead of PostgreSQL?
Single-file database, zero ops overhead, trivially backed up with `docker cp`. For the expected load (tens of concurrent users per event) SQLite with WAL mode is more than sufficient.

### Why vanilla JS instead of React/Vue?
The app started simple and grew. Vanilla JS keeps the single-file nature (no build step), loads instantly, and is trivially understandable. The rendering functions (`renderAP`, `renderAL`, etc.) are straightforward imperative HTML-string builders.

### Why i18n via JSON files instead of inline strings?
- Community can contribute translations by editing JSON without touching code
- Adding a new language = one new JSON file + one new button
- Keys act as documentation for what text exists where
- English is always loaded as fallback so missing DE keys never break the UI

### Why org_id on every table instead of separate DBs per org?
- Single SQLite file = single backup, single Docker volume
- Cross-org queries possible for site admin stats
- Simpler migration (ALTER TABLE ADD COLUMN)
- Future cross-org features (event invitations) are easier to implement

### Why `loot_key` for deduplication?
`name|type|grade|size` as a composite key means "Tachyon Cannon Grade-A MIL Size-3" and "Tachyon Cannon Grade-A MIL Size-3" from two different admins are the same item in the DB. This keeps the autocomplete DB clean.
