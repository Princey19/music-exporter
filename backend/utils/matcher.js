import { distance } from 'fastest-levenshtein';
import { normalizeTitle, stripVersionTags } from './normalizer.js';

/**
 * Calculates the Sørensen-Dice coefficient between two strings.
 * Measures similarity based on overlapping character bigrams.
 */
export function getDiceCoefficient(s1, s2) {
  const str1 = s1.replace(/\s+/g, '');
  const str2 = s2.replace(/\s+/g, '');

  if (str1 === str2) return 1.0;
  if (str1.length < 2 || str2.length < 2) return 0.0;

  const getBigrams = (str) => {
    const bigrams = [];
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.push(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bigrams1 = getBigrams(str1);
  const bigrams2 = getBigrams(str2);

  // Use a map to track frequencies for multi-set intersection
  const freqMap2 = {};
  for (const bigram of bigrams2) {
    freqMap2[bigram] = (freqMap2[bigram] || 0) + 1;
  }

  let intersection = 0;
  for (const bigram of bigrams1) {
    if (freqMap2[bigram] > 0) {
      intersection++;
      freqMap2[bigram]--;
    }
  }

  return (2.0 * intersection) / (bigrams1.length + bigrams2.length);
}

/**
 * Computes a similarity score between 0 and 1.
 * Combines Dice Coefficient and Levenshtein Distance for high accuracy.
 */
export function calculateSimilarity(s1, s2) {
  if (!s1 || !s2) return 0.0;
  
  const dice = getDiceCoefficient(s1, s2);
  
  const levDist = distance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  const levSim = maxLen === 0 ? 1.0 : 1.0 - levDist / maxLen;

  // Take the best match score
  return Math.max(dice, levSim);
}

/**
 * Cross-checks a YouTube video title against catalog songs.
 * Returns the best match catalog item, score, and determined status.
 * Toggles strict vs loose mode matching.
 */
export function matchVideoToCatalog(videoTitle, catalogSongs, isStrictMode = true) {
  const normVideo = normalizeTitle(videoTitle);
  const looseVideo = stripVersionTags(normVideo);

  let bestMatch = null;
  let maxScore = 0.0;

  for (const song of catalogSongs) {
    const normCatalog = normalizeTitle(song.title);
    const looseCatalog = stripVersionTags(normCatalog);

    let score = 0.0;
    if (isStrictMode) {
      score = calculateSimilarity(normVideo, normCatalog);
    } else {
      score = calculateSimilarity(looseVideo, looseCatalog);
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = song;
    }
  }

  // Determine bucket classification based on score threshold
  // Similarity score > 0.85 → "Matched"
  // Similarity score 0.6–0.85 → "Uncertain"
  // Similarity score < 0.6 → "Missing"
  let status = 'Missing';
  if (maxScore > 0.85) {
    status = 'Matched';
  } else if (maxScore >= 0.60) {
    status = 'Uncertain';
  }

  return {
    videoTitle,
    status,
    confidence: Math.round(maxScore * 100) / 100, // Round to 2 decimal places
    matchedCatalogTitle: bestMatch ? bestMatch.title : null,
    matchedSong: bestMatch ? {
      title: bestMatch.title,
      album: bestMatch.album || 'Unknown Album',
      releaseYear: bestMatch.releaseYear || 'N/A'
    } : null
  };
}
