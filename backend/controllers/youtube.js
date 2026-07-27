import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Controller for YouTube Data API v3 operations.
 * The YouTube API key is read exclusively from the server's .env file
 * (YOUTUBE_API_KEY). It is never accepted from, or exposed to, the frontend.
 */
export async function getYoutubeVideos(req, res) {
  const artist = req.query.artist;
  const minViews = parseInt(req.query.minViews || "0", 10);
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!artist) {
    return res
      .status(400)
      .json({ error: "Artist query parameter is required." });
  }

  if (!apiKey) {
    console.error("YOUTUBE_API_KEY is not set in the backend .env file.");
    return res.status(500).json({
      error: "YouTube API key is not configured on the server.",
      details:
        "Ask your administrator to set YOUTUBE_API_KEY in the backend .env file, then restart the server.",
    });
  }

  try {
    // Step 1: Try to resolve the artist's YouTube channel
    const channelId = await resolveArtistChannel(artist, apiKey);
    let videos = [];

    if (channelId) {
      console.log(`Resolved channel ID for ${artist}: ${channelId}`);
      // Step 2: Get uploads playlist ID for this channel
      const uploadsPlaylistId = await getUploadsPlaylistId(channelId, apiKey);

      if (uploadsPlaylistId) {
        console.log(`Found uploads playlist ID: ${uploadsPlaylistId}`);
        // Step 3: Fetch videos from uploads playlist
        videos = await fetchPlaylistVideos(uploadsPlaylistId, apiKey);
      } else {
        console.log(
          `No uploads playlist found for channel ${channelId}, falling back to video search.`,
        );
        videos = await searchVideosFallback(artist, apiKey);
      }
    } else {
      console.log(
        `Could not resolve channel for artist: ${artist}. Falling back to video search.`,
      );
      // Step 2 Fallback: Run standard video search
      videos = await searchVideosFallback(artist, apiKey);
    }

    if (videos.length === 0) {
      return res.json([]);
    }

    // Step 4: Fetch detailed statistics (view count, publish date) in batches of 50
    const enrichedVideos = await enrichVideoData(videos, apiKey);

    // Step 5: Filter out videos below minimum view count
    const filteredVideos = enrichedVideos.filter(
      (video) => video.viewCount >= minViews,
    );

    res.json(filteredVideos);
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);

    // Check if it's a quota or auth error from YouTube
    if (error.message && error.message.includes("quotaExceeded")) {
      return res.status(403).json({
        error: "YouTube API quota exceeded.",
        details:
          "The YouTube Data API quota has been exhausted. Please try again later or supply a different API Key.",
      });
    } else if (error.message && error.message.includes("API key not valid")) {
      return res.status(401).json({
        error: "Invalid YouTube API Key.",
        details:
          "The configured YouTube API Key is invalid. Please check your credentials.",
      });
    }

    res.status(500).json({
      error: "Failed to retrieve videos from YouTube API.",
      details: error.message,
    });
  }
}

/**
 * Searches for a channel matching the artist's name.
 * Prioritizes official channels or topic channels.
 */
async function resolveArtistChannel(artist, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(artist)}&type=channel&maxResults=5&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || "YouTube Channel Search failed");
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    return null;
  }

  // Look for a channel that matches best
  const channels = data.items;

  // 1. Try to find a channel ending with "topic" or "vevo"
  const topicChannel = channels.find((ch) => {
    const title = ch.snippet.channelTitle.toLowerCase();
    return title.includes("topic") || title.includes("vevo");
  });
  if (topicChannel) return topicChannel.id.channelId;

  // 2. Try to find exact match
  const exactMatch = channels.find(
    (ch) => ch.snippet.channelTitle.toLowerCase() === artist.toLowerCase(),
  );
  if (exactMatch) return exactMatch.id.channelId;

  // 3. Fallback to the first result
  return channels[0].id.channelId;
}

/**
 * Retrieves the "uploads" playlist ID for a given channel.
 */
async function getUploadsPlaylistId(channelId, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || "YouTube Channel Lookup failed");
  }

  const data = await response.json();
  const channel = data.items?.[0];
  return channel?.contentDetails?.relatedPlaylists?.uploads || null;
}

/**
 * Fetches all video items from a playlist.
 * Caps at 150 items to keep API usage and performance balanced.
 */
async function fetchPlaylistVideos(playlistId, apiKey) {
  let videos = [];
  let nextPageToken = "";
  let pagesFetched = 0;
  const maxPages = 4; // limit to 200 items (4 pages * 50)

  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(
        errData.error?.message || "YouTube Playlist fetch failed",
      );
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) break;

    const pageVideos = data.items.map((item) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      thumbnail:
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url ||
        "",
    }));

    videos = videos.concat(pageVideos);
    nextPageToken = data.nextPageToken;
    pagesFetched++;
  } while (nextPageToken && pagesFetched < maxPages);

  return videos;
}

/**
 * Fallback: Searches YouTube for video titles using the artist's name.
 */
async function searchVideosFallback(artist, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(artist)}&type=video&maxResults=50&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || "YouTube Video Search failed");
  }

  const data = await response.json();
  if (!data.items) return [];

  return data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
    thumbnail:
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url ||
      "",
  }));
}

/**
 * Batches video IDs and fetches detailed stats (view counts).
 */
async function enrichVideoData(videos, apiKey) {
  const enriched = [];
  const batchSize = 50;

  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    const videoIds = batch.map((v) => v.id).join(",");

    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(
        errData.error?.message || "YouTube Video Details fetch failed",
      );
    }

    const data = await response.json();
    if (!data.items) continue;

    // Create lookup map of statistics
    const statsLookup = {};
    for (const item of data.items) {
      statsLookup[item.id] = {
        viewCount: parseInt(item.statistics?.viewCount || "0", 10),
      };
    }

    // Enrich batch items
    for (const video of batch) {
      const stats = statsLookup[video.id];
      enriched.push({
        ...video,
        viewCount: stats ? stats.viewCount : 0,
        youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
      });
    }
  }

  return enriched;
}
