const KEY = 'parsis.sms.patterns.v2';
const LEGACY = 'parsis.sms.patterns.v1';

export function loadPatterns() {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  // مهاجرت خودکار از v1 به v2
  const legacy = localStorage.getItem(LEGACY);
  if (!legacy) return [];
  try {
    const old = JSON.parse(legacy);
    const migrated = old.map(p => ({
      ...p,
      key: (p.tokens || []).join(' '),
      fields: p.fields || {},
    }));
    savePatterns(migrated);
    return migrated;
  } catch { return []; }
}

export function savePatterns(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addPattern({ raw, tokens, mapping, label = '', key, fields = {} }) {
  const list = loadPatterns();
  const k = key || (tokens || []).join(' ');

  // dedupe بر اساس key
  const existing = list.find(p => p.key === k);
  if (existing) {
    existing.uses = (existing.uses || 0) + 1;
    existing.lastUsed = Date.now();
    existing.raw = raw;
    existing.mapping = mapping;
    existing.fields = { ...existing.fields, ...fields };
    if (label) existing.label = label;
    savePatterns(list);
    return existing;
  }

  const id = 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rec = {
    id, key: k, raw, tokens, mapping, label, fields,
    createdAt: Date.now(), uses: 1, lastUsed: Date.now(),
  };
  list.push(rec);
  savePatterns(list);
  return rec;
}

export function bumpUsage(id) {
  const list = loadPatterns();
  const p = list.find(x => x.id === id);
  if (!p) return;
  p.uses = (p.uses || 0) + 1;
  p.lastUsed = Date.now();
  savePatterns(list);
}

export function deletePattern(id) {
  savePatterns(loadPatterns().filter(p => p.id !== id));
}
