import { normalizeText } from './normalize.js';

export function tokenize(raw='') {
  return normalizeText(raw).split(' ').filter(Boolean);
}

/**
 * الگوی یک پیامک: توکن‌هایی که اعدادشان با # ماسک شده‌اند
 * مثال:
 *  "بانک ملت: برداشت 1,200,000 ریال از حساب 1234"
 * → ["بانک","ملت:","برداشت","#","ریال","از","حساب","#"]
 */
export function templateTokens(raw='') {
  return tokenize(raw).map(tok => /\d/.test(tok) ? '#' : tok);
}

/** کلید یکتای الگو برای ذخیره‌سازی سریع */
export function templateKey(raw='') {
  return templateTokens(raw).join(' ');
}
