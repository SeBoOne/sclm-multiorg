# SCLM Development Patterns & Conventions

## How to Run Locally

```bash
# Install once
pip install flask flask-cors

# Run (Windows)
start.bat

# Run (Linux/Mac)
python server.py

# Access
open http://localhost:5000
```

The `/setup` page at `http://localhost:5000/setup` shows the admin secret on first run.

---

## Making Backend Changes

### Adding a new API endpoint

```python
@app.route("/api/session/<sid>/something", methods=["POST"])
def do_something(sid):
    data = request.get_json()
    code = data.get("code", "")
    s = get_session_by_code(code)
    if not s or s["id"] != sid:
        return jsonify({"error": "Ungültiger Code."}), 403
    if s["locked"]:
        return jsonify({"error": "Gesperrt."}), 403
    
    with get_db() as con:
        # ... do work
        pass
    
    return jsonify({"ok": True})
```

### Session object structure (from `load_session`)
```python
{
    "id": "abc123",
    "name": "Jumptown Raid #4",
    "admin_code": "ADM123",
    "join_code": "JOI456",
    "max_wishes": 3,
    "locked": False,
    "raffle_locked": False,
    "commodities_locked": False,
    "raffle_done": False,
    "total_revenue": None,
    "image_url": None,
    "org_id": "default",
    "raffle_mode": "wish",  # or "no_interest"
    "participants": [...],
    "loot": [...],
    "commodities": [...],
}
```

### DB helper pattern
```python
with get_db() as con:
    row = con.execute("SELECT * FROM table WHERE id=?", (id,)).fetchone()
    result = dict(row) if row else None
    
    rows = con.execute("SELECT * FROM table").fetchall()
    results = [dict(r) for r in rows]
```

`get_db()` is a context manager that auto-commits on exit.

---

## Making Frontend Changes

### Rendering pattern (all renders follow this)
```javascript
function renderSomething() {
    const el = $('element-id');
    if (!S || !S.something.length) {
        el.innerHTML = `<div class="empty">${t('some.empty.key')}</div>`;
        return;
    }
    el.innerHTML = S.something.map(item => `
        <div class="ir">
            <div class="im f1">
                <div class="in">${esc(item.name)}</div>
                <div class="pills">${pillsHTML(item)}</div>
            </div>
            <button class="btn btn-xs" onclick="doSomething('${item.id}')">${t('btn.key')}</button>
        </div>
    `).join('');
}
```

### Always use `esc()` for user content in templates
```javascript
// WRONG - XSS vulnerability
`<div>${item.name}</div>`

// CORRECT
`<div>${esc(item.name)}</div>`
```

### API call pattern
```javascript
async function doSomething() {
    const r = await api(`/api/session/${S.id}/something`, 'POST', {
        code: myCode,
        value: someValue,
    });
    if (r.error) { alert(r.error); return; }
    await reloadS();
    renderSomething();
}
```

### After any data change
```javascript
await reloadS();          // reload S from server
renderRelevantView();     // re-render affected tab
updOvStats();             // update overview stats if item/participant counts changed
```

---

## Adding Translations

1. Add key to **both** `static/lang/de.json` and `static/lang/en.json`
2. In HTML: `<element data-i18n="your.key">Fallback</element>`
3. In HTML placeholders: `<input data-i18n-ph="your.key" placeholder="Fallback"/>`
4. In JS template literals: `${t("your.key")}`
5. With variables: `${t("your.key", {count: 5})}` where de.json has `"your.key": "Es gibt {count} Einträge"`

**Never hardcode German user-visible strings in app.js.** All text goes through `t()`.

---

## Common CSS Classes

```css
/* Layout */
.page          /* full-width page container, position-relative */
.H             /* hidden (display:none) — toggle with show()/hide() */
.card          /* white-on-dark card with border-radius */
.ph            /* page header flex row */
.ph-r          /* page header right section */
.ct            /* card title */
.list          /* flex-column container for list items */
.row.c         /* flex row, centered vertically */
.f1            /* flex:1 (grow) */
.mb8, .mt8     /* margin bottom/top 8px */
.w100          /* width:100% */

/* Interactive */
.btn           /* base button */
.btn-acc       /* accent (blue) button */
.btn-gold      /* gold button */
.btn-red       /* red button */
.btn-grn       /* green button */
.btn-sm        /* small button */
.btn-xs        /* extra small button */
.btn-full      /* full-width button */
.tgl           /* toggle button (multi-select) */
.tgl.st        /* selected state */

/* List items */
.ir            /* item row (flex) */
.im            /* item main section */
.in            /* item name */
.is            /* item subtitle/secondary text */

/* Badges */
.pill          /* base pill badge */
.p-mil         /* military (blue) */
.p-ste         /* stealth (purple) */
.p-com         /* competition (orange) */
.p-civ         /* civilian (green) */
.p-ind         /* industrial (brown) */
.p-grade       /* grade (gold) */
.p-sale        /* for-sale (red) */
.p-gray        /* gray */

/* Alerts */
.alert.a-ok    /* success (green) */
.alert.a-err   /* error (red) */
.alert.a-info  /* info (blue) */

/* Autocomplete */
.acw           /* autocomplete wrapper */
.acd           /* autocomplete dropdown */
.acd.open      /* visible state */
```

---

## Debugging Tips

### Check which routes Flask registered
```python
python3 -c "
import os; os.environ['DATA_DIR'] = '/tmp/test'
import pathlib; pathlib.Path('/tmp/test').mkdir(exist_ok=True)
import server
for rule in sorted(server.app.url_map.iter_rules(), key=str):
    print(f'{str(rule):50s} {sorted(rule.methods)}')
"
```

### Test an endpoint without a browser
```python
python3 -c "
import os; os.environ['DATA_DIR'] = '/tmp/test'
import pathlib; pathlib.Path('/tmp/test').mkdir(exist_ok=True)
import server
with server.app.test_client() as c:
    r = c.post('/api/orgs/MAIN/verify', json={'secret': 'your-secret'})
    print(r.status_code, r.data)
"
```

### Check DB contents
```bash
sqlite3 data.db "SELECT * FROM orgs;"
sqlite3 data.db "SELECT id, name, org_id FROM sessions;"
```

### Common issues
| Symptom | Likely cause |
|---------|-------------|
| 405 Method Not Allowed on POST | Missing `import hmac` or other import causing route registration failure |
| JSON.parse error in browser | Server returning HTML error page — check console for `Server error: 500` |
| Translations not updating on language switch | Missing key in `onLangChange()` → `_rerenderPage()` not calling the right render function |
| Autocomplete not finding items | `org_id` not being sent in search request, or items stored under different org_id |
| Session not restoring on reload | `SSTATE_KEY` in sessionStorage may be stale — clear and retry |

---

## File Edit Safety

The project learned this lesson the hard way: **always make targeted changes**.

### DO:
- Edit specific functions by finding exact string matches
- Test syntax after every server.py change: `python3 -c "import ast; ast.parse(open('server.py').read())"`
- Keep backups before large refactors

### DON'T:
- Use line-number-based replacements (line numbers shift)
- Replace large blocks with regex that might mangle template literals or quotes
- Run `str(a, b)` regex transforms on code containing `str(value, encoding)` patterns

### The worst bugs this project has seen:
1. **i18n broke everything** — a line-based block replacement deleted 1200 lines of JS (all render functions)
2. **`hmac.compare_digest` broken by regex** — `str(a, str(""))` → Python interpreted as `str(bytes, encoding)` → TypeError on every org verify call
3. **Template literal quote deletion** — replacing `">text"` patterns removed closing `"` from onclick attributes → buttons rendered but clicks did nothing

---

## Docker Image Notes

The Dockerfile copies `static/` into the image:
```dockerfile
COPY static/ ./static/
```

This means `lang/de.json`, `lang/en.json`, `i18n.js`, `app.js`, `app.css` are all baked into the image. After any frontend change, you must rebuild the Docker image.

`sc-fan-logo.png` and `uex-badge.png` are **not** included in the repo — they must be downloaded manually and placed in `static/` before building. The `onerror` handlers in HTML hide them gracefully if missing.
