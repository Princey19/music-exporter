/**
 * Utility functions for communicating with the Backend API.
 * The YouTube API key lives only in the backend's .env file and is never
 * read from, or sent by, the browser.
 */

const API_BASE = '/api';

/**
 * Custom error class for API response failures.
 */
class APIError extends Error {
  constructor(message, status, details = '') {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Helper to handle fetch responses and throw structured errors.
 */
async function handleResponse(response) {
  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    let errDetails = '';

    try {
      const data = await response.json();
      errMsg = data.error || errMsg;
      errDetails = data.details || data.setupHelp || '';
    } catch (e) {
      // Not JSON or empty body
    }

    throw new APIError(errMsg, response.status, errDetails);
  }
  return response.json();
}

/**
 * Fetches videos of an artist from YouTube API.
 */
export async function getYoutubeVideos(artist, minViews = 0) {
  const url = `${API_BASE}/youtube-videos?artist=${encodeURIComponent(artist)}&minViews=${minViews}`;
  const response = await fetch(url);
  return handleResponse(response);
}

/**
 * Uploads an Excel or CSV file for processing.
 */
export async function uploadCatalogFile(file) {
  const url = `${API_BASE}/catalog/upload`;
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });
  return handleResponse(response);
}

/**
 * Performs crosscheck matching on YouTube videos and Catalog songs.
 */
export async function runCrosscheck(videos, catalog, mapping, artistName, isStrictMode) {
  const url = `${API_BASE}/crosscheck`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videos, catalog, mapping, artistName, isStrictMode })
  });
  return handleResponse(response);
}

/**
 * Builds a fallback "artistname-date.ext" filename on the client, matching
 * the naming the backend uses, in case the Content-Disposition header is
 * ever missing.
 */
function buildFallbackFilename(artistName, ext) {
  const today = new Date().toISOString().split('T')[0];
  const safeArtist = String(artistName || 'export')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'export';
  return `${safeArtist}-${today}.${ext}`;
}

/**
 * Generates and downloads the CSV or Excel export files.
 * Files are named "artistname-date.ext" so repeated downloads never collide.
 */
export async function downloadExport(results, buckets, format, artistName) {
  const url = `${API_BASE}/export`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results, buckets, format, artistName })
  });

  if (!response.ok) {
    let errMsg = 'Export failed';
    try {
      const errJson = await response.json();
      errMsg = errJson.error || errMsg;
    } catch (e) {}
    throw new Error(errMsg);
  }

  const blob = await response.blob();

  // Extract filename from headers if present, else build a matching fallback
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = buildFallbackFilename(artistName, format === 'csv' ? 'csv' : 'xlsx');

  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  // Trigger browser download
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}
