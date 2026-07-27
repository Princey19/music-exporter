/**
 * Normalizes music/video titles for comparison.
 */

// Regular expressions for common YouTube video clutter
const CLUTTER_PATTERNS = [
  /\b(official\s+video|official\s+music\s+video|official\s+audio|official\s+lyric\s+video|lyric\s+video)\b/gi,
  /\b(official\s+visualizer|visualizer|lyric|lyrics|audio|video|music\s+video|hd|hq|4k|1080p)\b/gi,
  /\b(official)\b/gi,
  /\[\s*\]|[\(\)\{\}\[\]]/g // empty brackets/parentheses and brackets themselves
];

// Suffix/Version tags to ignore in LOOSE mode
const VERSION_TAGS = [
  /\b(live\s+at|live\s+performance|live|in\s+concert|concert|session|sessions)\b/gi,
  /\b(remix|remixes|mix|re-work|edit|radio\s+edit|club\s+edit|extended\s+mix|extended\s+version)\b/gi,
  /\b(acoustic\s+version|acoustic|unplugged)\b/gi,
  /\b(instrumental\s+version|instrumental|karaoke|backing\s+track)\b/gi,
  /\b(cover\s+version|cover|tribute)\b/gi,
  /\b(demo\s+version|demo)\b/gi,
  /\b(intro|outro|bonus\s+track|hidden\s+track)\b/gi
];

/**
 * Standardizes common features notation (e.g., "feat.", "ft.", "featuring") to "feat".
 */
export function standardizeFeatures(title) {
  return title
    .replace(/\b(featuring|feat\.?|ft\.?)\b/gi, 'feat')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips video-related clutter and punctuation, lowercase, standardizes whitespace.
 */
export function normalizeTitle(title) {
  if (!title) return '';

  let normalized = title.toLowerCase();

  // Standardize feat/ft
  normalized = standardizeFeatures(normalized);

  // Remove video clutter patterns
  for (const pattern of CLUTTER_PATTERNS) {
    normalized = normalized.replace(pattern, ' ');
  }

  // Remove punctuation/symbols but keep letter/numbers/whitespace
  // Keep apostrophes/quotes if inside words, or just strip them. 
  // Let's replace common punctuation symbols with space
  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?|\\\[\]]/g, ' ');

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Strips version-specific tags (remix, live, acoustic, etc.) for loose comparison.
 */
export function stripVersionTags(title) {
  let cleaned = title.toLowerCase();

  for (const pattern of VERSION_TAGS) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Reclean whitespace and punctuation
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?|\\\[\]]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}
