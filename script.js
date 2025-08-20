const YOUTUBE_API_KEY = "AIzaSyDj2STT3vCINPIrNHfUz8pIDy0Rzbf6KH0";
const MAX_RESULTS_PER_PAGE = 50;
const MAX_TOTAL_RESULTS = 10000; // Limit total results to prevent excessive API calls
const DEFAULT_MIN_VIEWS = 200000;
const MUSIC_CATEGORY_ID = "10"; // YouTube category ID for Music

// --- General Video Search Elements ---
const videoSearchInput = document.getElementById("videoSearchInput");
const videoSearchButton = document.getElementById("videoSearchButton");
const videoStopSearchButton = document.getElementById("videoStopSearchButton");
const videoStatusDiv = document.getElementById("videoStatus");
const videoLoadingDiv = document.getElementById("videoLoading");
const videoResultsCards = document.getElementById("videoResultsCards");

// --- Music Search Elements ---
const artistInput = document.getElementById("artistInput");
const songTitleInput = document.getElementById("songTitleInput");
const minViewsInput = document.getElementById("minViewsInput");
const musicSearchButton = document.getElementById("musicSearchButton");
const musicStopSearchButton = document.getElementById("musicStopSearchButton");
const downloadExcelButton = document.getElementById("downloadExcelButton");
const musicStatusDiv = document.getElementById("musicStatus");
const musicLoadingDiv = document.getElementById("musicLoading");
const musicResultsCards = document.getElementById("musicResultsCards");
const musicResultsTable = document.getElementById("musicResultsTable");
const musicTableBody = musicResultsTable.querySelector("tbody");

// Global variables for music search 
let currentMusicVideoData = [];
let currentArtistSearch = "";
let currentSongTitleSearch = "";
let musicAbortController = null;

// Global variables for video search 
let videoAbortController = null;

// --- Initial UI State Setup ---
function initializeUI() {
  // Hide all results, loading, and stop buttons initially
  videoResultsCards.classList.add("hidden");
  videoLoadingDiv.classList.add("hidden");
  videoStopSearchButton.classList.add("hidden");
  videoStopSearchButton.disabled = true;

  musicResultsCards.classList.add("hidden");
  musicResultsTable.classList.add("hidden");
  musicLoadingDiv.classList.add("hidden");
  musicStopSearchButton.classList.add("hidden");
  musicStopSearchButton.disabled = true;
  downloadExcelButton.classList.add("hidden");

  // Display initial status messages
  videoStatusDiv.textContent = "Enter a query to search for videos.";
  videoStatusDiv.classList.remove("hidden", "error");

  musicStatusDiv.textContent =
    "Enter artist name and/or song title to search for music videos.";
  musicStatusDiv.classList.remove("hidden", "error");
}

// --- Event Listeners ---
videoSearchButton.addEventListener("click", fetchGeneralVideos);
videoSearchInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") videoSearchButton.click();
});
videoStopSearchButton.addEventListener("click", () => {
  if (videoAbortController) {
    videoAbortController.abort();
    displayStatus(videoStatusDiv, "Video search stopped by user.", "info");
    resetVideoSearchUI();
  }
});

musicSearchButton.addEventListener("click", fetchMusicVideos);
artistInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") musicSearchButton.click();
});
songTitleInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") musicSearchButton.click();
});
minViewsInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") musicSearchButton.click();
});

musicStopSearchButton.addEventListener("click", () => {
  if (musicAbortController) {
    musicAbortController.abort();
    displayStatus(musicStatusDiv, "Music search stopped by user.", "info");
    resetMusicSearchUI();
  }
});
downloadExcelButton.addEventListener("click", () => {
  if (currentMusicVideoData.length > 0) {
    exportToExcel(
      currentMusicVideoData,
      currentArtistSearch,
      currentSongTitleSearch
    );
  } else {
    displayStatus(
      musicStatusDiv,
      "No data to export. Please perform a music search first.",
      "error"
    );
  }
});

// --- Helper Functions ---

/**
 * Displays a status message in the specified div.
 * @param {HTMLElement} element - The div element to display the message in.
 * @param {string} message - The message text.
 * @param {'info'|'error'} type - The type of message (influences styling).
 */
function displayStatus(element, message, type = "info") {
  element.textContent = message;
  element.classList.remove("hidden", "error");
  if (type === "error") {
    element.classList.add("error");
  }
  element.classList.remove("hidden");
}

/**
 * Hides a status message div.
 * @param {HTMLElement} element - The div element to hide.
 */
function hideStatus(element) {
  element.classList.add("hidden");
}

/**
 * Shows a loading spinner in the specified div.
 * @param {HTMLElement} element - The div element for the spinner.
 */
function showLoading(element) {
  element.classList.remove("hidden");
}

/**
 * Hides a loading spinner div.
 * @param {HTMLElement} element - The div element for the spinner.
 */
function hideLoading(element) {
  element.classList.add("hidden");
}

/**
 * Fetches data from a given URL with exponential backoff.
 * @param {URL} url - The URL to fetch from.
 * @param {AbortSignal} signal - AbortController signal.
 * @param {number} currentRetry - Current retry attempt.
 * @param {number} maxRetries - Maximum number of retries.
 * @returns {Promise<Object>} - The JSON response data.
 * @throws {Error} if fetch fails after retries or is aborted.
 */
async function fetchDataWithRetries(
  url,
  signal,
  currentRetry = 0,
  maxRetries = 5
) {
  while (true) {
    try {
      const response = await fetch(url, { signal });
      if (response.ok) {
        return response.json();
      }

      if (response.status === 429 && currentRetry < maxRetries) {
        const delay = Math.pow(2, currentRetry) * 1000;
        console.warn(
          `Rate limit exceeded (${url.host}). Retrying in ${
            delay / 1000
          }s (Attempt ${currentRetry + 1}).`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        currentRetry++;
      } else {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
    } catch (fetchError) {
      if (fetchError.name === "AbortError") throw fetchError;
      console.error(`Fetch attempt failed (${url.host}):`, fetchError);
      if (currentRetry < maxRetries) {
        const delay = Math.pow(2, currentRetry) * 1000;
        console.warn(
          `Fetch error (${url.host}). Retrying in ${delay / 1000}s (Attempt ${
            currentRetry + 1
          }).`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        currentRetry++;
      } else {
        throw fetchError;
      }
    }
  }
}

/**
 * Renders video cards in a given container.
 * @param {HTMLElement} container - The HTML element to append cards to.
 * @param {Array} videos - Array of video data objects.
 */
function renderVideoCards(container, videos) {
  container.innerHTML = "";
  if (videos.length === 0) {
    container.classList.add("hidden");
    return;
  }
  videos.forEach((video) => {
    const videoId = video.videoLink.split("v=")[1];
    const title = video.songTitle || video.title; 
    const description = video.artistName || video.description; 
    const thumbnailUrl = video.thumbnailUrl;
    const channelTitle = video.artistName || video.channelTitle; 
    const viewsText = video.totalViews
      ? `Views: ${video.totalViews.toLocaleString()}`
      : "";

    const videoCard = document.createElement("div");
    videoCard.className = "video-card";
    videoCard.innerHTML = `
                <img src="${thumbnailUrl}" alt="${title}" class="video-thumbnail" onerror="this.onerror=null;this.src='https://placehold.co/1280x720/e0e7ff/3b82f6?text=No+Image';">
                <div class="video-info">
                    <h3 class="video-title">${title}</h3>
                    <p class="video-channel">Channel: ${channelTitle}</p>
                    <p class="video-description-card">${description} ${viewsText}</p>
                </div>
            `;
    videoCard.addEventListener("click", () => {
      window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
    });
    container.appendChild(videoCard);
  });
  container.classList.remove("hidden");
}

// --- General Video Search ---
async function fetchGeneralVideos() {
  const query = videoSearchInput.value.trim();

  if (!query) {
    displayStatus(
      videoStatusDiv,
      "Please enter a search query for videos.",
      "error"
    );
    return;
  }

  // Reset UI for new search
  hideStatus(videoStatusDiv);
  videoResultsCards.classList.add("hidden");
  videoResultsCards.innerHTML = "";
  showLoading(videoLoadingDiv);

  videoSearchButton.disabled = true;
  videoStopSearchButton.disabled = false;
  videoStopSearchButton.classList.remove("hidden");

  videoAbortController = new AbortController();
  const signal = videoAbortController.signal;

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.append("key", YOUTUBE_API_KEY);
    url.searchParams.append("q", query);
    url.searchParams.append("part", "snippet");
    url.searchParams.append("type", "video");
    url.searchParams.append("maxResults", 20);

    const data = await fetchDataWithRetries(url, signal);

    hideLoading(videoLoadingDiv);

    if (data.items.length === 0) {
      displayStatus(
        videoStatusDiv,
        "No videos found for your search. Try a different query!",
        "info"
      );
      return;
    }

    const videoDetailsPromises = data.items.map(async (item) => {
      if (signal.aborted) return null; 
      const videoDetailsUrl = new URL(
        "https://www.googleapis.com/youtube/v3/videos"
      );
      videoDetailsUrl.searchParams.append("key", YOUTUBE_API_KEY);
      videoDetailsUrl.searchParams.append("id", item.id.videoId);
      videoDetailsUrl.searchParams.append("part", "snippet,statistics");
      const details = await fetchDataWithRetries(videoDetailsUrl, signal);
      const video = details.items[0];
      if (video) {
        return {
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnailUrl: video.snippet.thumbnails.high.url,
          channelTitle: video.snippet.channelTitle,
          videoLink: `https://www.youtube.com/watch?v=${video.id}`,
          totalViews: parseInt(video.statistics?.viewCount || "0", 10),
        };
      }
      return null;
    });

    const fetchedVideos = (await Promise.all(videoDetailsPromises)).filter(
      Boolean
    );

    if (fetchedVideos.length > 0) {
      renderVideoCards(videoResultsCards, fetchedVideos);
      displayStatus(
        videoStatusDiv,
        `Found ${fetchedVideos.length} videos.`,
        "info"
      );
    } else {
      displayStatus(
        videoStatusDiv,
        "No detailed video information found for your search.",
        "info"
      );
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Video search aborted.");
    } else {
      console.error("Error fetching general YouTube videos:", error);
      displayStatus(
        videoStatusDiv,
        `Error: ${error.message}. Please check your internet connection or API key and try again.`,
        "error"
      );
    }
  } finally {
    resetVideoSearchUI();
  }
}

/**
 * Resets UI elements for general video search after completion or error.
 */
function resetVideoSearchUI() {
  hideLoading(videoLoadingDiv);
  videoSearchButton.disabled = false;
  videoStopSearchButton.disabled = true;
  videoStopSearchButton.classList.add("hidden");
}

// --- Music Search ---
async function fetchMusicVideos() {
  currentArtistSearch = artistInput.value.trim();
  currentSongTitleSearch = songTitleInput.value.trim();

  let desiredMinViews = parseInt(minViewsInput.value, 10);
  if (isNaN(desiredMinViews) || minViewsInput.value.trim() === "") {
    desiredMinViews = DEFAULT_MIN_VIEWS;
    minViewsInput.value = DEFAULT_MIN_VIEWS;
  } else if (desiredMinViews < 0) {
    displayStatus(
      musicStatusDiv,
      "Please enter a valid number (0 or greater) for Minimum Views.",
      "error"
    );
    return;
  }

  let combinedQuery = "";
  if (currentArtistSearch) {
    combinedQuery += currentArtistSearch;
  }
  if (currentSongTitleSearch) {
    combinedQuery += (combinedQuery ? " " : "") + currentSongTitleSearch;
  }

  if (!combinedQuery) {
    displayStatus(
      musicStatusDiv,
      "Please enter at least an artist name or a song title for music search.",
      "error"
    );
    return;
  }

  // Reset UI for new music search
  hideStatus(musicStatusDiv);
  musicResultsTable.classList.add("hidden");
  musicTableBody.innerHTML = "";
  musicResultsCards.classList.add("hidden");
  musicResultsCards.innerHTML = "";
  downloadExcelButton.classList.add("hidden");
  showLoading(musicLoadingDiv);

  musicSearchButton.disabled = true;
  musicStopSearchButton.disabled = false;
  musicStopSearchButton.classList.remove("hidden");

  currentMusicVideoData = [];
  let nextPageToken = null;
  let fetchedResultsCount = 0;

  musicAbortController = new AbortController();
  const signal = musicAbortController.signal;

  try {
    while (fetchedResultsCount < MAX_TOTAL_RESULTS) {
      if (signal.aborted) {
        console.log("Music search aborted by user.");
        break;
      }

      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.append("key", YOUTUBE_API_KEY);
      searchUrl.searchParams.append("q", combinedQuery);
      searchUrl.searchParams.append("part", "snippet");
      searchUrl.searchParams.append("type", "video");
      searchUrl.searchParams.append("maxResults", MAX_RESULTS_PER_PAGE);
      searchUrl.searchParams.append("topicId", MUSIC_CATEGORY_ID); // Restrict to Music topic

      if (nextPageToken) {
        searchUrl.searchParams.append("pageToken", nextPageToken);
      }

      console.log(
        `Fetching music page with token: ${
          nextPageToken || "start"
        } for query: "${combinedQuery}"`
      );
      const searchData = await fetchDataWithRetries(searchUrl, signal);

      if (!searchData.items || searchData.items.length === 0) {
        console.log("No more music search results.");
        break;
      }

      const videoIds = searchData.items
        .map((item) => item.id.videoId)
        .filter(Boolean);

      if (videoIds.length > 0) {
        if (signal.aborted) {
          console.log("Music search aborted by user.");
          break;
        }

        const videoDetailsUrl = new URL(
          "https://www.googleapis.com/youtube/v3/videos"
        );
        videoDetailsUrl.searchParams.append("key", YOUTUBE_API_KEY);
        videoDetailsUrl.searchParams.append("id", videoIds.join(","));
        videoDetailsUrl.searchParams.append(
          "part",
          "snippet,statistics,contentDetails"
        );

        const videoDetailsData = await fetchDataWithRetries(
          videoDetailsUrl,
          signal
        );

        for (const video of videoDetailsData.items) {
          const totalViews = parseInt(video.statistics?.viewCount || "0", 10);
          const isLicensedContent =
            video.contentDetails?.licensedContent || false;

          if (totalViews >= desiredMinViews) {
            const artistName = video.snippet.channelTitle;
            const songTitle = video.snippet.title;
            const videoLink = `https://www.youtube.com/watch?v=${video.id}`;
            const channelLink = `https://www.youtube.com/channel/${video.snippet.channelId}`;
            const genre =
              video.snippet.categoryId === MUSIC_CATEGORY_ID
                ? "Music"
                : "Unknown/Other";

            currentMusicVideoData.push({
              artistName,
              songTitle,
              genre,
              totalViews,
              isLicensedContent,
              videoLink,
              channelLink,
              thumbnailUrl: video.snippet.thumbnails.high.url,
            });
            fetchedResultsCount++;
          }
          if (fetchedResultsCount >= MAX_TOTAL_RESULTS) {
            break;
          }
        }
      }

      nextPageToken = searchData.nextPageToken;
      if (!nextPageToken || fetchedResultsCount >= MAX_TOTAL_RESULTS) {
        console.log("No more pages to fetch or max results reached for music.");
        break;
      }
    } // End of while loop

    hideLoading(musicLoadingDiv);
    if (currentMusicVideoData.length > 0) {
      displayMusicTableResults(currentMusicVideoData);
      renderVideoCards(musicResultsCards, currentMusicVideoData);
      downloadExcelButton.classList.remove("hidden");
      displayStatus(
        musicStatusDiv,
        `Found ${
          currentMusicVideoData.length
        } music videos matching your criteria (Min Views: ${desiredMinViews.toLocaleString()}).`,
        "info"
      );
    } else {
      displayStatus(
        musicStatusDiv,
        `No music videos found matching your search and view criteria (Min Views: ${desiredMinViews.toLocaleString()}).`,
        "info"
      );
      downloadExcelButton.classList.add("hidden");
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Music search aborted.");
    } else {
      console.error("Error fetching YouTube music data:", error);
      displayStatus(
        musicStatusDiv,
        `Error: ${error.message}. Please check your internet connection or API key and try again.`,
        "error"
      );
      downloadExcelButton.classList.add("hidden");
    }
  } finally {
    resetMusicSearchUI();
  }
}

/**
 * Resets UI elements for music search after completion or error.
 */
function resetMusicSearchUI() {
  hideLoading(musicLoadingDiv);
  musicSearchButton.disabled = false;
  musicStopSearchButton.disabled = true;
  musicStopSearchButton.classList.add("hidden");
}

/**
 * Displays the search results in the HTML table for music.
 * @param {Array} data - An array of video data objects.
 */
function displayMusicTableResults(data) {
  musicTableBody.innerHTML = "";
  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${row.artistName}</td>
            <td>${row.songTitle}</td>
            <td>${row.genre}</td>
            <td>${row.totalViews.toLocaleString()}</td>
            <td>${row.isLicensedContent ? "Yes" : "No"}</td>
            <td><a href="${row.videoLink}" target="_blank">Link</a></td>
            <td><a href="${row.channelLink}" target="_blank">Link</a></td>
          `;
    musicTableBody.appendChild(tr);
  });
  musicResultsTable.classList.remove("hidden");
}

/**
 * Exports the fetched music data to an Excel file.
 * @param {Array} data - The array of video data to export.
 * @param {string} artistName - The artist name used in search.
 * @param {string} songTitle - The song title used in search.
 */
function exportToExcel(data, artistName, songTitle) {
  const worksheetData = data.map((row) => [
    row.artistName,
    row.songTitle,
    row.genre,
    row.totalViews,
    row.isLicensedContent ? "Yes" : "No",
    row.videoLink,
    row.channelLink,
  ]);

  const headers = [
    "Artist",
    "Song Title",
    "Genre",
    "Total Views",
    "Licensed Content",
    "Video Link",
    "Channel Link",
  ];
  worksheetData.unshift(headers);

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "YouTube Music Data");

  const date = new Date();
  const sanitizedArtist = artistName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 30);
  const sanitizedSong = songTitle
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 30);

  let fileNameParts = [];
  if (sanitizedArtist) fileNameParts.push(sanitizedArtist);
  if (sanitizedSong) fileNameParts.push(sanitizedSong);
  let baseFileName = fileNameParts.join("_") || "YouTube_Data";

  const fileName = `${baseFileName}_${date.getFullYear()}${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

// Initialize UI on page load
window.onload = initializeUI;
