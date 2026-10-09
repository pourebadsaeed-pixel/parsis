import { normalizeText } from './normalize.js';

export function tokenize(raw = '') {
  return normalizeText(raw).split(' ').filter(Boolean);
}

/**
 * هر توکنی که رقم داره → اسلات شمارهدار #1، #2، ...
 * مثال:
 *  "بانک ملت: برداشت 1,200,000 ریال از حساب 1234"
 * → ["بانک","ملت:","برداشت","#1","ریال","از","حساب","#2"]
 */
export function templateTokens(raw = '') {
  const out = [];
  let n = 0;
  for (const part of tokenize(raw)) {
    if (/\d/.test(part)) { n++; out.push('#' + n); }
    else out.push(part);
  }
  return out;
}

/** کلید یکتای الگو برای ذخیرهسازی و dedupe */
export function templateKey(raw = '') {
  return templateTokens(raw).join(' ');
}

/**
 * ساخت کامل الگو از متن خام.
 * خروجی: { raw, tokens, mapping, key }
 * mapping: { "#1": "1,200,000", "#2": "1234" }
 */
export function buildPattern(raw = '') {
  const normalized = normalizeText(raw);
  const parts = normalized.split(' ').filter(Boolean);
  const tokens = [];
  const mapping = {};
  let n = 0;

  for (const part of parts) {
    if (/\d/.test(part)) {
      n++;
      const slot = '#' + n;
      tokens.push(slot);
      mapping[slot] = part;
    } else {
      tokens.push(part);
    }
  }
  return { raw: normalized, tokens, mapping, key: tokens.join(' ') };
}
