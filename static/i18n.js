/**
 * SCLM i18n — Translation engine (dynamic, dropdown-based)
 *
 * Usage in app.js:  t('key')  or  t('key', {items: 5, participants: 10})
 * Usage in HTML:    data-i18n="key"      (text content)
 *                   data-i18n-ph="key"   (placeholder)
 *
 * Language files are discovered via GET /api/langs.
 * Each lang/*.json must contain "lang.name" for the display name.
 * English ('en') is always loaded as fallback.
 * The active language is saved to localStorage as 'sclm_lang'.
 */

'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let _lang   = 'de';   // active language code
let _tr     = {};     // active translations
let _trFb   = {};     // fallback translations (English or first available)
let _langs  = [];     // [{code, name}] — populated on init

// ── Core API ─────────────────────────────────────────────────────────────────

/** Translate a key, interpolating {placeholder} values if provided. */
function t(key, vars) {
  let val = _tr[key] ?? _trFb[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      val = val.replaceAll(`{${k}}`, v);
    }
  }
  return val;
}

/** Current language code. */
function getLang() { return _lang; }

// ── Init & switching ──────────────────────────────────────────────────────────

async function _fetchLang(code) {
  try {
    const r = await fetch(`/static/lang/${code}.json?v=2`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn(`[i18n] Could not load ${code}.json:`, e.message);
    return {};
  }
}

/**
 * Load available languages, restore preference, apply translations.
 * Await this before rendering anything.
 */
async function initLang() {
  // Discover available languages from server
  try {
    const r = await fetch('/api/langs');
    if (r.ok) _langs = await r.json();
  } catch (_) {}

  // Always need at least one language
  if (!_langs.length) _langs = [{ code: 'de', name: 'Deutsch' }];

  // Determine fallback (prefer 'en', otherwise first in list)
  const fbCode = _langs.find(l => l.code === 'en')?.code ?? _langs[0].code;
  _trFb = await _fetchLang(fbCode);

  // Restore saved preference, fall back to first language
  let saved = 'de';
  try { saved = localStorage.getItem('sclm_lang') || _langs[0].code; } catch (_) {}
  const validCode = _langs.find(l => l.code === saved)?.code ?? _langs[0].code;
  _lang = validCode;

  _tr = (_lang === fbCode) ? _trFb : await _fetchLang(_lang);

  _buildDropdown();
  _applyDOM();
}

/**
 * Switch language at runtime.
 * @param {string} code  Language code matching a file in static/lang/
 */
async function setLang(code) {
  const fbCode = _langs.find(l => l.code === 'en')?.code ?? _langs[0]?.code ?? 'en';
  _lang = code;
  try { localStorage.setItem('sclm_lang', _lang); } catch (_) {}

  _tr = (_lang === fbCode) ? _trFb : await _fetchLang(_lang);

  _buildDropdown();

  if (typeof onLangChange === 'function') {
    const result = onLangChange(_lang);
    if (result && typeof result.then === 'function') {
      result.then(() => _applyDOM());
    } else {
      setTimeout(() => _applyDOM(), 0);
    }
  } else {
    _applyDOM();
  }
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

/** Apply translations to all [data-i18n] and [data-i18n-ph] elements. */
function applyLangToDOM() { _applyDOM(); }

function _applyDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
}

function _buildDropdown() {
  const sel = document.getElementById('lang-select');
  if (!sel) return;

  // Build options if not yet built (or rebuild to reflect available langs)
  if (sel.dataset.built !== 'true') {
    sel.innerHTML = _langs.map(l =>
      `<option value="${l.code}">${l.name}</option>`
    ).join('');
    sel.dataset.built = 'true';
  }
  sel.value = _lang;
}
