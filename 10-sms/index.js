import { extractFields } from './extract.js';
import { templateTokens, templateKey } from './template.js';
import { findBestMatch } from './matcher.js';
import { loadPatterns, addPattern, bumpUsage } from './store.js';

/**
 * خروجی:
 *  - status: "matched" → رفتار قبلی را اعمال کن
 *  - status: "new"     → فرم یادگیری را باز کن
 */
export function classify(rawSms) {
  const fields  = extractFields(rawSms);
  const tokens  = templateTokens(rawSms);
  const match   = findBestMatch(rawSms, loadPatterns());

  if (match) {
    bumpUsage(match.pattern.id);
    return {
      status: 'matched',
      confidence: match.score,
      pattern: match.pattern,
      fields,
      // رفتار ثبت‌شده در الگو:
      mapping: match.pattern.mapping,
    };
  }
  return { status: 'new', fields, tokens, templateKey: templateKey(rawSms) };
}

/** ثبت الگوی جدید پس از تأیید کاربر در فرم */
export function learn(rawSms, mapping, label = '') {
  return addPattern({
    raw: rawSms,
    tokens: templateTokens(rawSms),
    mapping, label,
  });
}
