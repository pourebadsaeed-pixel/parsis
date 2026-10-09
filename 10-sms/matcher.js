import { templateTokens } from './template.js';

const isWild = (t) => typeof t === 'string' && t.startsWith('#');

/**
 * شباهت توکنبهتوکن با در نظر گرفتن موقعیت.
 * - هر دو wildcard    → +1.0
 * - توکن یکسان         → +1.0
 * - یکی wildcard       → +0.4
 * - عدم تطابق          → -0.3
 * - توکن گمشده         → -0.2
 */
function tokenSimilarity(a = [], b = []) {
  const n = Math.max(a.length, b.length);
  if (n === 0) return 0;
  let score = 0;

  for (let i = 0; i < n; i++) {
    const ta = a[i], tb = b[i];
    if (ta === undefined || tb === undefined) { score -= 0.2; continue; }
    if (isWild(ta) && isWild(tb))             score += 1;
    else if (ta === tb)                       score += 1;
    else if (isWild(ta) || isWild(tb))        score += 0.4;
    else                                      score -= 0.3;
  }
  return Math.max(0, score / n);
}

export function findBestMatch(raw, patterns, threshold = 0.75) {
  const tokens = templateTokens(raw);
  let best = null, bestScore = 0;
  for (const p of patterns) {
    const s = tokenSimilarity(tokens, p.tokens || []);
    if (s > bestScore) { bestScore = s; best = p; }
  }
  return bestScore >= threshold ? { pattern: best, score: bestScore } : null;
}
