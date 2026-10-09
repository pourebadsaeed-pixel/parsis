const PKEY = 'parsis.sms.pending.v1';
const MAX = 200;

export function loadPending() {
  try { return JSON.parse(localStorage.getItem(PKEY) || '[]'); }
  catch { return []; }
}

export function savePending(list) {
  localStorage.setItem(PKEY, JSON.stringify(list.slice(-MAX)));
}

/** افزودن پیامک ثبتنشده با dedupe بر اساس متن خام */
export function addPending({ raw, source = 'clipboard', fields = null }) {
  const norm = (raw || '').trim();
  if (!norm) return null;
  const list = loadPending();
  if (list.some(p => p.raw === norm)) return null;

  const rec = {
    id: 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    raw: norm, source, fields, createdAt: Date.now(),
  };
  list.push(rec);
  savePending(list);
  return rec;
}

export function removePending(id) {
  savePending(loadPending().filter(p => p.id !== id));
}

export function clearPending() { savePending([]); }

export function countPending() { return loadPending().length; }
