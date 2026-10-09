import { extractFields } from './extract.js';
import { templateTokens, templateKey, buildPattern } from './template.js';
import { findBestMatch } from './matcher.js';
import { loadPatterns, addPattern, bumpUsage } from './store.js';

/**
 * classify(rawSms):
 *  - status: "matched" → رفتار الگو رو اجرا کن
 *  - status: "new"     → فرم یادگیری رو باز کن (suggestion پیشپر شده)
 */
export function classify(rawSms) {
  const fields = extractFields(rawSms);
  const tokens = templateTokens(rawSms);
  const match  = findBestMatch(rawSms, loadPatterns());

  if (match) {
    bumpUsage(match.pattern.id);
    return {
      status: 'matched',
      confidence: match.score,
      pattern: match.pattern,
      fields,
      mapping: match.pattern.mapping,
      label: match.pattern.label,
    };
  }

  return {
    status: 'new',
    fields,
    tokens,
    templateKey: templateKey(rawSms),
    suggestion: buildPattern(rawSms), // برای پیشپر کردن فرم
  };
}

/** ثبت الگو پس از تأیید کاربر */
export function learn(rawSms, mapping, label = '', extra = {}) {
  const built = buildPattern(rawSms);
  return addPattern({
    raw: built.raw,
    tokens: built.tokens,
    mapping: mapping || built.mapping,
    key: built.key,
    label,
    fields: extra.fields || extractFields(rawSms),
  });
}
