/**
 * Simple fuzzy matching function.
 * Returns true if the 'pattern' characters appear in 'str' in the same order.
 */
export function fuzzyMatch(pattern: string, str: string): boolean {
  if (!pattern) return true;
  const normalizedPattern = pattern.toLowerCase().replace(/\s/g, "");
  const normalizedStr = str.toLowerCase();

  let patternIdx = 0;
  let strIdx = 0;

  while (
    patternIdx < normalizedPattern.length &&
    strIdx < normalizedStr.length
  ) {
    if (normalizedPattern[patternIdx] === normalizedStr[strIdx]) {
      patternIdx++;
    }
    strIdx++;
  }

  return patternIdx === normalizedPattern.length;
}

/**
 * Higher level fuzzy search that ranks results.
 * Returns a score (higher is better). 0 means no match.
 */
export function fuzzyScore(pattern: string, str: string): number {
  if (!pattern) return 1;
  const p = pattern.toLowerCase();
  const s = str.toLowerCase();

  if (s === p) return 100;
  if (s.startsWith(p)) return 80;
  if (s.includes(p)) return 60;

  // Real fuzzy matching
  let score = 0;
  let pIdx = 0;
  let sIdx = 0;
  let consecutiveMatches = 0;

  while (pIdx < p.length && sIdx < s.length) {
    if (p[pIdx] === s[sIdx]) {
      score += 1;
      // Bonus for consecutive characters
      if (consecutiveMatches > 0) score += 2;
      // Bonus for matching start of words
      if (sIdx === 0 || s[sIdx - 1] === " ") score += 5;

      pIdx++;
      consecutiveMatches++;
    } else {
      consecutiveMatches = 0;
    }
    sIdx++;
  }

  if (pIdx === p.length) return score;
  return 0;
}
