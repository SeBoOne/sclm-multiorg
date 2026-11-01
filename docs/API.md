# SCLM Multi-Org — API-Referenz (v6.0)

Alles aus der Standard-API-Referenz (Standard v5.0) gilt hier analog — Authentifizierung
über `X-SCLM-Secret` / `X-SCLM-Code` Header (Legacy-Fallback: Query-Params), Fehler als
`{"error": "..."}`. Multi-Org ergibt sich durch:

## Session-Endpoints (v6-spezifisch)

Session-Endpoints akzeptieren zusätzlich einen `org_code` Parameter (Header
`X-SCLM-Org`) um sie an eine Organisation zu binden; ohne org_code verhalten
sie sich wie in der Standard-Version (single-org "default" Organisation).

## Org-Lifecycle

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/orgs` | Org anlegen `{name}` → `{id, code, admin_code}` |
| GET | `/api/orgs` | Alle Orgs |
| GET | `/api/orgs/search?q=` | Org-Suche (Autocomplete) |
| GET | `/api/orgs/<code>` | Org-Details |
| PATCH | `/api/orgs/<code>/settings` | Org-Einstellungen |
| POST | `/api/orgs/<code>/verify` | Org-Admin-Code verifizieren |
| POST | `/api/orgs/<code>/create_session` | Session innerhalb der Org anlegen |

## Org-Katalog (Isolation je Org)

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/orgs/<code>/items` | Items der Org |
| GET | `/api/orgs/<code>/items/search?q=` | Items-Suche |
| GET | `/api/orgs/<code>/participants` | Teilnehmer der Org |
| GET | `/api/orgs/<code>/participants/search?q=` | Teilnehmer-Suche |
| GET | `/api/orgs/<code>/commodities` | Waren der Org |
| GET | `/api/orgs/<code>/commodities/search?q=` | Waren-Suche |
| GET | `/api/orgs/<code>/sessions` | Sessions der Org |
| GET | `/api/orgs/<code>/sessions/<sid>/view` | Session-Detail der Org |
| GET | `/api/orgs/<code>/stats` | Org-Statistik |
| GET | `/api/orgs/<code>/admin-info` | Admin-Info für Org-Admin |

## Einladungen

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/session/<sid>/invitations` | Einladungen der Session |
| POST | `/api/session/<sid>/invitations` | Einladung erstellen |
| DELETE | `/api/session/<sid>/invitations/<inv_id>` | Einladung löschen |

## Site-Admin (Secret) — zusätzlich

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/admin/orgs` | Alle Orgs (Admin-Sicht) |
| POST | `/api/admin/orgs` | Org anlegen (Admin) |
| PATCH | `/api/admin/orgs/<oid>` | Org bearbeiten |
| DELETE | `/api/admin/orgs/<oid>` | Org löschen |
| POST | `/api/admin/uex_item` | UEX-Item (Multi-Org-Variante) |

## Global — zusätzlich

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/langs` | Verfügbare Sprachen |
| GET | `/api/uex_proxy` | UEX-Proxy (Server-seitig, keine Client-CORS-Probleme) |
