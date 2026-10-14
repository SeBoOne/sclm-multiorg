# SCLM — Star Citizen Loot Manager
## Claude Code Project Context

> This project was developed in a Claude.ai chat session and is being continued in Claude Code.
> This file captures all architectural decisions, conventions, and current state.

---

## What This Is

**SCLM** is a fan-made web tool for fairly distributing loot among Star Citizen crew members after missions. It is hosted at **https://sclm.site**.

- Non-commercial, CIG Fan Content Policy compliant
- Built with Flask + SQLite backend, vanilla JS + HTML/CSS frontend
- Deployed via Docker / Portainer
- Current live version: **v5.0** (stable)
- In development: **v6.0** (Org system — not yet deployed)

---

## Project Structure

```
sclm/
├── server.py              # Flask backend (all API endpoints)
├── index.html             # Single-page app shell (HTML structure only)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt       # flask, flask-cors
├── start.bat              # Local dev: python server.py
├── start.sh
├── passenger_wsgi.py      # For shared hosting
├── .htaccess
├── get-secret.sh
└── static/
    ├── app.css            # All styles
    ├── app.js             # All JavaScript (~1680 lines)
    ├── i18n.js            # Translation engine (standalone, loaded before app.js)
    ├── lang/
    │   ├── de.json        # German translations (default, 265 keys)
    │   └── en.json        # English translations (fallback, 265 keys)
    ├── favicon.svg / .ico / -16/32/48/180/192/512.png
    ├── apple-touch-icon.png
    ├── site.webmanifest
    ├── sc-fan-logo.png    # Must be downloaded manually from RSI support
    └── uex-badge.png      # Must be downloaded manually from uexcorp.space
```

**Critical file load order in index.html:**
```html
<script src="/static/i18n.js"></script>   <!-- MUST be first -->
<script src="/static/app.js"></script>
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, Flask, Flask-CORS |
| Database | SQLite (single file, `/data/data.db` in Docker) |
| Frontend | Vanilla JS (ES2020+), no framework |
| Styles | Custom CSS with CSS variables |
| i18n | Custom JSON-file-based system (see `i18n.js`) |
| Deploy | Docker + Gunicorn, managed via Portainer |

---

## Database Schema

```sql
-- Core config
config (key TEXT PK, value TEXT)
  -- key='admin_secret' → site admin password
  -- key='setup_viewed' → '0'/'1'

-- Orgs (v6)
orgs (
  id TEXT PK, name TEXT, code TEXT UNIQUE,
  secret TEXT, logo_url TEXT, created TEXT
)

-- Sessions (events)
sessions (
  id TEXT PK, name TEXT, created TEXT,
  admin_code TEXT UNIQUE, join_code TEXT UNIQUE,
  max_wishes INT DEFAULT 3,
  locked INT DEFAULT 0,
  raffle_locked INT DEFAULT 0,
  commodities_locked INT DEFAULT 0,
  raffle_done INT DEFAULT 0,
  total_revenue REAL,
  image_url TEXT,
  org_id TEXT → orgs.id
)

-- Participants
participants (id TEXT PK, session_id TEXT, name TEXT, added_by TEXT)
wishes (id TEXT PK, session_id TEXT, participant_id TEXT, loot_id TEXT)
no_interest (id TEXT PK, session_id TEXT, participant_id TEXT, loot_id TEXT)

-- Loot items
loot (
  id TEXT PK, session_id TEXT, name TEXT, qty INT DEFAULT 1,
  type TEXT,        -- 'MIL'|'STE'|'COM'|'CIV'|'IND' (components only)
  grade TEXT,       -- 'A'-'D' (components only)
  size TEXT,        -- '0'-'8'
  loot_key TEXT,    -- name|type|grade|size (dedup key)
  for_sale INT DEFAULT 0,
  sale_revenue REAL
)

-- Commodities (cargo sold at trading posts)
commodities (id TEXT PK, session_id TEXT, name TEXT, scu REAL)

-- Raffle results
raffle_results (
  id TEXT PK, session_id TEXT, participant_id TEXT,
  won_json TEXT,    -- JSON array of {name, type, grade, size}
  waived INT DEFAULT 0,
  collected INT DEFAULT 0
)

-- Autocomplete databases (org-scoped in v6)
item_db (loot_key TEXT PK, name TEXT, type TEXT, grade TEXT, size TEXT, org_id TEXT)
commodity_db (name TEXT, org_id TEXT, PK(name, org_id))
participant_db (name TEXT, org_id TEXT, PK(name, org_id))
```

**loot_key** format: `"name|type|grade|size"` — used for deduplication (e.g. `"ares ion|||"` or `"tachyon cannon|MIL|A|3"`)

---

## Authentication Model

### Three access levels:

| Level | How | What |
|-------|-----|-------|
| **Site Admin** | `/#admin?secret=<secret>` or direct secret entry | Full access: all sessions, all DBs, all orgs |
| **Org Admin** | Org code + org secret | Org's sessions, org's DBs, org settings |
| **Session Admin** | 6-char admin code | Single session management |
| **Participant** | 6-char join code | Self-register, set wishes, view results |

**Session setup page:** `/setup` — shown exactly once after first boot, then locked (shows org migration secret + admin secret).

---

## Raffle Algorithm

Located in `server.py` → `run_raffle()` endpoint.

**Mode selection:** If `total_items < num_participants` → `no_interest` mode (participants mark what they DON'T want). Otherwise → `wish` mode.

### Wish Mode (most common):
**Phase 1:** Distribute all wished items first.
- For each loot type with interested participants, round-robin by fewest-wins-first within each cycle
- Each cycle re-sorts by current win count to keep things equitable

**Phase 2:** Distribute remaining (unwished) items.
- Always assign to participant with fewest total wins (`fairest_recipient`)
- Random tiebreak among equal-wins participants

### No-Interest Mode:
- Participants mark items they DON'T want
- Each item goes to `fairest_recipient` among those who didn't exclude it
- Fallback: if all excluded, anyone is eligible

### Revenue calc:
`applyFee(v) = Math.round(v * 0.995)` — 0.5% warehouse transfer fee applied to total revenue and per-person share.

---

## i18n System

**Files:** `static/i18n.js` + `static/lang/de.json` + `static/lang/en.json`

**Default language:** German (`de`). English is the fallback.

**How it works:**
```javascript
// i18n.js loads both files on init
await initLang();  // called in app.js boot, must await before rendering

// Translate a key
t("key")                          // simple
t("key", {items: 5, parts: 10})  // with interpolation → replaces {items}, {parts}

// Switch language
await setLang('en');  // loads en.json, re-applies DOM, calls onLangChange()
```

**DOM integration:**
```html
<div data-i18n="some.key">Fallback text</div>
<input data-i18n-ph="placeholder.key" placeholder="Fallback"/>
```

**`onLangChange(lang)` in app.js** — re-renders the currently active page when language switches.

**Adding translations:** Add the key to both `de.json` and `en.json`. If a key is missing in `de.json`, it falls back to `en.json`. If missing in both, the key itself is returned.

---

## Frontend Architecture

**Single-page app** — all pages are `<div class="page H" id="pg-*">` elements. `H` class = hidden.

### Pages:
| ID | Description |
|----|-------------|
| `pg-home` | Start page: global stats + org login + create org |
| `pg-org` | Org lobby: org stats + event list |
| `pg-org-admin` | Org admin: settings + org-scoped DBs |
| `pg-admin` | Session admin: overview, participants, loot, commodities, raffle |
| `pg-part` | Participant view: register, wish selection, wait, results |
| `pg-super` | Site admin: orgs, all events, global DBs, UEX import, settings |
| `pg-ro` | Read-only view: loot list, commodities, raffle results |
| `pg-about` | About / legal / CIG compliance |

### Key global state (`app.js`):
```javascript
let S = null;           // current session object (full API response)
let myCode = "";        // current admin_code or join_code
let myPid = "";         // current participant id
let myPName = "";       // current participant name
let superSecret = "";   // site admin secret
let ORG = null;         // current org {id, name, code, logo_url}
let ORG_SECRET = "";    // org admin secret (memory only, not persisted to disk)
```

### Persistence:
- `localStorage['sclm_lang']` — language preference
- `localStorage['sclm_creator']` — `{sessionId: adminCode}` map (quick creator login)
- `localStorage['sclm_org']` — `{code, secret, ts}` (org session, 7-day expiry)
- `sessionStorage['scr_session_state']` — current page/session for reload restore

### API helper:
```javascript
async function api(path, method="GET", body=null)
// Returns parsed JSON or {error: "..."} on failure
// Logs server errors to console with status code
```

### Polling:
- Admin participants tab: every 4s
- Admin raffle tab: every 6s
- Participant waiting page: every 8s

---

## API Reference

### Global Stats
```
GET  /api/stats                    → {session_count, total_loot_raffled, total_scu, total_revenue}
GET  /api/sessions                 → list of all sessions (site admin use)
```

### Session Lifecycle
```
POST /api/session/create           → {id, admin_code, join_code}
GET  /api/session/<code>           → full session object (works with admin or join code)
PATCH /api/session/<sid>/settings  → {code, locked?, raffle_locked?, commodities_locked?, max_wishes?, image_url?, total_revenue?}
POST /api/session/<sid>/regenerate_codes
DELETE /api/session/<sid>
```

### Participants
```
POST   /api/session/<sid>/participants           → add participant(s)
DELETE /api/session/<sid>/participants/<pid>
PATCH  /api/session/<sid>/participants/<pid>     → self-mark waived/collected
POST   /api/session/<sid>/wishes                 → set wish or no_interest list
```

### Loot
```
POST   /api/session/<sid>/loot                   → add item
DELETE /api/session/<sid>/loot/<lid>
PATCH  /api/session/<sid>/loot/<lid>/qty         → {code, delta}
PATCH  /api/session/<sid>/loot/<lid>/sale        → {code, for_sale, sale_revenue?}
```

### Commodities
```
POST   /api/session/<sid>/commodities
PATCH  /api/session/<sid>/commodities/<cid>      → {code, scu}
PATCH  /api/session/<sid>/commodities/<cid>/qty  → {code, delta}
DELETE /api/session/<sid>/commodities/<cid>
```

### Raffle
```
POST /api/session/<sid>/raffle                   → run raffle
PATCH /api/session/<sid>/raffle/<rid>            → {code, waived?, collected?}
GET  /api/session/<sid>/raffle/result_for/<pid>  → participant's result
```

### Autocomplete (org-scoped in v6)
```
GET /api/items/search?q=<query>&org_id=<oid>
GET /api/commodities/search?q=<query>&org_id=<oid>
GET /api/participants/search?q=<query>&org_id=<oid>
```

### Site Admin
```
GET  /api/admin/data?secret=<s>
POST /api/admin/items
DELETE /api/admin/items/<key>
POST /api/admin/participants
DELETE /api/admin/participants/<name>
POST /api/admin/commodities
DELETE /api/admin/commodities/<name>
POST /api/admin/uex_item           → single UEX item insert (used by org admin)
POST /api/admin/uex_import         → full UEX import (site admin)
POST /api/admin/change_secret
POST /api/admin/verify
POST /api/raidhelper/parse
GET  /setup                        → first-run setup page (shown once)
```

### Org API (v6)
```
POST GET  /api/orgs                             → create org / (n/a)
GET       /api/orgs/<code>                      → public info (name, logo)
POST      /api/orgs/<code>/verify               → {secret} → {ok, secret, id}
GET       /api/orgs/<code>/sessions?secret=<s>  → {sessions, stats}
GET       /api/orgs/<code>/stats?secret=<s>
PATCH     /api/orgs/<code>/settings             → {secret, name?, new_code?, logo_url?, new_secret?}
POST      /api/orgs/<code>/create_session       → {org_secret, name, max_wishes}

GET  /api/admin/orgs?secret=<s>
POST /api/admin/orgs                            → {secret, name, code, org_secret?}
PATCH /api/admin/orgs/<oid>
DELETE /api/admin/orgs/<oid>
```

---

## Deployment

### Docker (production)
```yaml
# docker-compose.yml
services:
  sc-loot-raffle:
    build: .
    ports: ["5000:5000"]
    volumes: [sc_loot_data:/data]
    restart: unless-stopped
volumes:
  sc_loot_data:
```

```bash
# Build & deploy via Portainer SSH
docker build -t sc-loot-raffle .
# Then update stack in Portainer UI
```

**Admin secret:** Printed to container logs on every start. Also visible via:
```bash
docker exec <container> python3 -c "
import sqlite3; con=sqlite3.connect('/data/data.db')
print(con.execute(\"SELECT value FROM config WHERE key='admin_secret'\").fetchone()[0])"
```

### Local dev (Windows)
```bash
# Install deps once
pip install flask flask-cors

# Start server
start.bat    # or: python server.py

# Access at http://localhost:5000
```

`DATA_DIR` env var controls where `data.db` is stored. Defaults to script directory.

---

## UEX Import

Fetches ship component data from `https://api.uexcorp.uk/2.0/`.

**Categories used:** 19, 21, 22, 23, 32, 83, 86 (79 and 82 excluded)

**Category 32 (weapons):** Size comes directly from item response, no attribute fetch needed.

**Other categories:** Fetch `items_attributes` per item for:
- `"Size"` → size field
- `"Class"` → mapped: Military→MIL, Stealth→STE, Competition→COM, Civilian→CIV, Industrial→IND
- `"Grade Letter"` → grade field (A-D)

Size "0" is valid and stored correctly.

---

## Legal / CIG Compliance (About Page)

The About page (`pg-about`) includes all required elements:
- SC Fan Site logo from RSI support (self-hosted as `static/sc-fan-logo.png`)
- Required disclaimer: *"This is an unofficial Star Citizen fansite, not affiliated with the Cloud Imperium group of companies."*
- Full trademark notice for Star Citizen®, Roberts Space Industries®, Cloud Imperium®
- UEX "Powered by UEX" badge (self-hosted as `static/uex-badge.png`)
- Raid-Helper attribution
- AI creation credit (Claude by Anthropic)
- Referral link: `https://www.robertsspaceindustries.com/enlist?referral=STAR-GPV6-ZHR2`

**Note:** `sc-fan-logo.png` and `uex-badge.png` must be downloaded manually — they cannot be fetched server-side due to network restrictions. Download from:
- RSI: `https://support.robertsspaceindustries.com/hc/article_attachments/360022704853`
- UEX: `https://uexcorp.space/img/api/uex-api-badge-powered.png`

---

## Known Issues / Active Work

See `docs/ROADMAP.md` for full details. Current state:

- **v5.0 is live** at sclm.site — stable, no known issues
- **v6.0 is in development** — org system built but not deployed
- v6.0 was recently fixed: missing `import hmac` caused 500 errors on all org verify endpoints

---

## CSS Conventions

All colors via CSS variables (defined in `app.css`):
```css
--bg1, --bg2, --bg3   /* backgrounds */
--t0, --t1, --t2      /* text: bright, medium, dim */
--acc                 /* accent blue #1e8bc3 */
--gold                /* gold #c89b3c */
--gdim                /* gold dim background */
--red, --rdim         /* red / red background */
--grn                 /* green */
--bdr, --bdr2         /* borders */
--r, --r2             /* border-radius */
```

Hide/show pattern: class `H` = `display:none`. Use `show(id)` / `hide(id)` helpers.

---

## Component Types Reference

Ship weapons: Size only (S0–S8)

Ship components:
- **Class:** MIL (Military), STE (Stealth), COM (Competition), CIV (Civilian), IND (Industrial)
- **Grade:** A, B, C, D
- **Size:** 0–8
- **loot_key** deduplicates: two Grade-A Military Size-3 components → same key regardless of who added them
