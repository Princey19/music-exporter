import { matchVideoToCatalog } from '../utils/matcher.js';

/**
 * Controller for running the cross-check matching algorithm.
 */
export async function crosscheckCatalog(req, res) {
  const { videos, catalog, mapping, artistName, isStrictMode = true } = req.body;

  if (!videos || !Array.isArray(videos)) {
    return res.status(400).json({ error: 'Videos array is required.' });
  }

  if (!catalog || !Array.isArray(catalog)) {
    return res.status(400).json({ error: 'Catalog array is required.' });
  }

  if (!mapping || typeof mapping !== 'object' || !mapping.title) {
    return res.status(400).json({ error: 'Song title column mapping is required.' });
  }

  try {
    let catalogSongs = [];

    // Step 1: Normalize catalog records from the uploaded file using the column mapping
    const titleCol = mapping.title;

    // Filter by artist if artist column and query artist exist
    let rawCatalog = catalog;
    if (mapping.artist && artistName) {
      const queryArtist = artistName.toLowerCase().trim();
      rawCatalog = catalog.filter(row => {
        const rowArtist = String(row[mapping.artist] || '').toLowerCase().trim();
        if (!rowArtist) return true; // Keep row if no artist listed (could be generic sheet)
        return rowArtist.includes(queryArtist) || queryArtist.includes(rowArtist);
      });
    }

    // Map rows to standard `{ title, album, releaseYear }`
    catalogSongs = rawCatalog.map(row => ({
      title: String(row[titleCol] || '').trim(),
      album: mapping.album ? String(row[mapping.album] || '').trim() : 'Unknown Album',
      releaseYear: mapping.releaseYear ? String(row[mapping.releaseYear] || '').trim() : 'N/A'
    }));

    // Filter out items with empty titles in catalog
    catalogSongs = catalogSongs.filter(song => song.title.length > 0);

    if (catalogSongs.length === 0) {
      // If catalog is empty, everything is "Missing"
      const missingList = videos.map(video => ({
        ...video,
        status: 'Missing',
        confidence: 0.0,
        matchedCatalogTitle: null,
        matchedSong: null
      }));

      return res.json({
        summary: {
          total: videos.length,
          matchedCount: 0,
          uncertainCount: 0,
          missingCount: videos.length
        },
        results: {
          matched: [],
          uncertain: [],
          missing: missingList
        }
      });
    }

    // Step 2: Run fuzzy string matching for each video
    const matched = [];
    const uncertain = [];
    const missing = [];

    for (const video of videos) {
      const matchResult = matchVideoToCatalog(video.title, catalogSongs, isStrictMode);
      const enrichedResult = {
        ...video,
        ...matchResult
      };

      if (matchResult.status === 'Matched') {
        matched.push(enrichedResult);
      } else if (matchResult.status === 'Uncertain') {
        uncertain.push(enrichedResult);
      } else {
        missing.push(enrichedResult);
      }
    }

    // Step 3: Package results and summary counts
    res.json({
      summary: {
        total: videos.length,
        matchedCount: matched.length,
        uncertainCount: uncertain.length,
        missingCount: missing.length
      },
      results: {
        matched,
        uncertain,
        missing
      }
    });

  } catch (error) {
    console.error('Error crosschecking files:', error);
    res.status(500).json({ error: 'Failed to crosscheck catalog.', details: error.message });
  }
}
