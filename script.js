const YOUTUBE_API_KEY = "AIzaSyDj2STT3vCINPIrNHfUz8pIDy0Rzbf6KH0"; 
const MAX_RESULTS_PER_PAGE = 50; 
const MAX_TOTAL_RESULTS = 10000; 
const DEFAULT_MIN_VIEWS = 200000;

// Get references to elements
const artistInput = document.getElementById("artistInput");
const songTitleInput = document.getElementById("songTitleInput");
const minViewsInput = document.getElementById("minViewsInput");
const searchButton = document.getElementById("searchButton");
const stopSearchButton = document.getElementById("stopSearchButton");
const downloadExcelButton = document.getElementById("downloadExcelButton");
const statusDiv = document.getElementById("status");
const loadingDiv = document.getElementById("loading");
const resultsTable = document.getElementById("resultsTable");
const tableBody = resultsTable.querySelector("tbody");

// Global variable to store fetched data for export
let currentVideoData = [];
let currentArtistSearch = "";
let currentSongTitleSearch = "";
let abortController = null; 

// Initially hide the table, download button, and stop button
resultsTable.classList.add("hidden");
downloadExcelButton.classList.add("hidden");
stopSearchButton.classList.add("hidden"); // hide stop button

// Event Listeners
searchButton.addEventListener("click", searchAndFetchData);
stopSearchButton.addEventListener("click", () => {
  
  if (abortController) {
    abortController.abort(); 
    statusDiv.textContent = "Search stopped by user.";
    statusDiv.classList.remove("hidden");
    resetUIOnCompletionOrError(); 
  }
});
downloadExcelButton.addEventListener("click", () => {
  if (currentVideoData.length > 0) {
    exportToExcel(
      currentVideoData,
      currentArtistSearch,
      currentSongTitleSearch
    );
  } else {
    statusDiv.textContent = "No data to export. Please perform a search first.";
    statusDiv.classList.remove("hidden");
  }
});

async function searchAndFetchData() {
  currentArtistSearch = artistInput.value.trim();
  currentSongTitleSearch = songTitleInput.value.trim();

  let desiredMinViews = parseInt(minViewsInput.value, 10);
  if (isNaN(desiredMinViews) || minViewsInput.value.trim() === "") {
    desiredMinViews = DEFAULT_MIN_VIEWS;
    minViewsInput.value = DEFAULT_MIN_VIEWS;
  } else if (desiredMinViews < 0) {
    statusDiv.textContent =
      "Please enter a valid number (0 or greater) for Minimum Views.";
    statusDiv.classList.remove("hidden");
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
    statusDiv.textContent =
      "Please enter at least an artist name or a song title.";
    statusDiv.classList.remove("hidden");
    return;
  }

  // Reset UI for new search
  statusDiv.classList.add("hidden");
  resultsTable.classList.add("hidden");
  tableBody.innerHTML = ""; // Clear previous results
  downloadExcelButton.classList.add("hidden");
  loadingDiv.classList.remove("hidden");

  // Manage button states for search in progress
  searchButton.disabled = true;
  stopSearchButton.classList.remove("hidden"); 

  currentVideoData = [];
  let nextPageToken = null;
  let fetchedResultsCount = 0;

  // AbortController for this search
  abortController = new AbortController();
  const signal = abortController.signal;

  try {
    while (fetchedResultsCount < MAX_TOTAL_RESULTS) {
      // Check if abort signal has been received
      if (signal.aborted) {
        console.log("Search aborted by user.");
        break;
      }

      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.append("key", YOUTUBE_API_KEY);
      url.searchParams.append("q", combinedQuery);
      url.searchParams.append("part", "snippet");
      url.searchParams.append("type", "video");
      url.searchParams.append("maxResults", MAX_RESULTS_PER_PAGE);
      url.searchParams.append("topicId", "/m/04rlf");

      if (nextPageToken) {
        url.searchParams.append("pageToken", nextPageToken);
      }

      console.log(
        `Fetching page with token: ${
          nextPageToken || "start"
        } for query: "${combinedQuery}"`
      );
      const response = await fetch(url, { signal });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `YouTube API search error: ${response.status} - ${errorText}`
        );
      }
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        console.log("No more search results.");
        break;
      }

      const videoIds = data.items
        .map((item) => item.id.videoId)
        .filter(Boolean);

      if (videoIds.length > 0) {
        // Check if abort signal has been received before making next fetch
        if (signal.aborted) {
          console.log("Search aborted by user.");
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

        const videoDetailsResponse = await fetch(videoDetailsUrl, { signal }); 
        if (!videoDetailsResponse.ok) {
          const errorText = await videoDetailsResponse.text();
          throw new Error(
            `YouTube API video details error: ${videoDetailsResponse.status} - ${errorText}`
          );
        }
        const videoDetailsData = await videoDetailsResponse.json();

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
              video.snippet.categoryId === "10" ? "Music" : "Unknown/Other";

            currentVideoData.push({
              artistName,
              songTitle,
              genre,
              totalViews,
              isLicensedContent,
              videoLink,
              channelLink,
            });
            fetchedResultsCount++;
          }
          if (fetchedResultsCount >= MAX_TOTAL_RESULTS) {
            break;
          }
        }
      }

      nextPageToken = data.nextPageToken;
      if (!nextPageToken) {
        console.log("No more pages to fetch.");
        break;
      }
    }

    loadingDiv.classList.add("hidden");
    if (currentVideoData.length > 0) {
      displayResults(currentVideoData);
      downloadExcelButton.classList.remove("hidden");
      statusDiv.textContent = `Found ${
        currentVideoData.length
      } videos matching your criteria (Min Views: ${desiredMinViews.toLocaleString()}).`;
    } else {
      statusDiv.textContent = `No videos found matching your search and view criteria (Min Views: ${desiredMinViews.toLocaleString()}).`;
      downloadExcelButton.classList.add("hidden");
    }
    statusDiv.classList.remove("hidden");
  } catch (error) {
    
    if (error.name === "AbortError") {
      console.log("Fetch aborted.");
      
    } else {
      console.error("Error fetching YouTube data:", error);
      loadingDiv.classList.add("hidden");
      statusDiv.textContent = `Error: ${error.message}. Please check your internet connection key and try again.`;
      statusDiv.classList.remove("hidden");
      downloadExcelButton.classList.add("hidden");
    }
  } finally {
    resetUIOnCompletionOrError();
  }
}

function resetUIOnCompletionOrError() {
  loadingDiv.classList.add("hidden");
  searchButton.disabled = false;
  stopSearchButton.classList.add("hidden"); // Hide stop button
}

function displayResults(data) {
  const resultsTable = document.getElementById("resultsTable");
  const tableBody = resultsTable.querySelector("tbody");
  tableBody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${row.artistName}</td>
            <td>${row.songTitle}</td>
            <td>${row.genre}</td>
            <td>${row.totalViews.toLocaleString()}</td>
            <td>${row.isLicensedContent ? "Yes" : "No"}</td> <td><a href="${
      row.videoLink
    }" target="_blank">Link</a></td>
            <td><a href="${row.channelLink}" target="_blank">Link</a></td>
        `;
    tableBody.appendChild(tr);
  });
  resultsTable.classList.remove("hidden");
}

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
