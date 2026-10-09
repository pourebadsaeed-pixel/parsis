import { templateTokens } from './template.js';

function jaccard(a, b) {
  const sa = new Set(a), sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : inter / union;
}

export function findBestMatch(raw, patterns, threshold = 0.8) {
  const tokens = templateTokens(raw);
  let best = null, bestScore = 0;
  for (const p of patterns) {
    const s = jaccard(tokens, p.tokens);
    if (s > bestScore) { bestScore = s; best = p; }
  }
  return bestScore >= threshold
    ? { pattern: best, score: bestScore }
    : null;
}
