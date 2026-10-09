const KEY = 'parsis.sms.patterns.v1';

export const loadPatterns = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
};

export const savePatterns = (p) => localStorage.setItem(KEY, JSON.stringify(p));

export function addPattern({ raw, tokens, mapping, label = '' }) {
  const list = loadPatterns();
  const id = 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const rec = {
    id, raw, tokens, mapping, label,
    createdAt: Date.now(), uses: 0, lastUsed: null,
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
