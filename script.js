const YOUTUBE_API_KEY = "AIzaSyDtOP_ntaHzEDIr2mQ6vKSzP7-XJSndj24"; // Replace with your actual API key
const MAX_RESULTS_PER_PAGE = 50; // Max allowed by YouTube API
const MAX_TOTAL_RESULTS = 100000; // Your requested limit (will be hard to reach due to quota)
const MIN_VIEWS = 200000; // Minimum views required

// Get references to elements
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const statusDiv = document.getElementById("status");
const loadingDiv = document.getElementById("loading");
const resultsTable = document.getElementById("resultsTable");
const tableBody = resultsTable.querySelector("tbody");

// Initially hide the table
resultsTable.classList.add("hidden");

searchButton.addEventListener("click", searchAndExport);

async function searchAndExport() {
  const searchTerm = searchInput.value.trim();

  if (!searchTerm) {
    statusDiv.textContent = "Please enter an artist name or song title.";
    statusDiv.classList.remove("hidden");
    return;
  }

  // Reset UI for new search
  statusDiv.classList.add("hidden");
  resultsTable.classList.add("hidden"); // Ensure table is hidden at the start of a new search
  tableBody.innerHTML = ""; // Clear previous results
  loadingDiv.classList.remove("hidden");

  let allVideoData = [];
  let nextPageToken = null;
  let fetchedResultsCount = 0;

  try {
    while (fetchedResultsCount < MAX_TOTAL_RESULTS) {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.append("key", YOUTUBE_API_KEY);
      url.searchParams.append("q", searchTerm);
      url.searchParams.append("part", "snippet"); // Get basic video info
      url.searchParams.append("type", "video"); // Only search for videos
      url.searchParams.append("maxResults", MAX_RESULTS_PER_PAGE);
      url.searchParams.append("topicId", "/m/04rlf"); // Filter for Music topic (best guess for genre)

      if (nextPageToken) {
        url.searchParams.append("pageToken", nextPageToken);
      }

      console.log(`Workspaceing page with token: ${nextPageToken || "start"}`);
      const response = await fetch(url);
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

      // Extract video IDs for batch statistics fetching
      const videoIds = data.items
        .map((item) => item.id.videoId)
        .filter(Boolean); // Ensure videoId exists

      if (videoIds.length > 0) {
        const videoDetailsUrl = new URL(
          "https://www.googleapis.com/youtube/v3/videos"
        );
        videoDetailsUrl.searchParams.append("key", YOUTUBE_API_KEY);
        videoDetailsUrl.searchParams.append("id", videoIds.join(","));
        videoDetailsUrl.searchParams.append("part", "snippet,statistics"); // Get snippet and statistics (for total views)

        const videoDetailsResponse = await fetch(videoDetailsUrl);
        if (!videoDetailsResponse.ok) {
          const errorText = await videoDetailsResponse.text();
          throw new Error(
            `YouTube API video details error: ${videoDetailsResponse.status} - ${errorText}`
          );
        }
        const videoDetailsData = await videoDetailsResponse.json();

        for (const video of videoDetailsData.items) {
          const totalViews = parseInt(video.statistics?.viewCount || "0", 10);

          if (totalViews >= MIN_VIEWS) {
            const artistName = video.snippet.channelTitle; // Often the artist, but not always definitive
            const songTitle = video.snippet.title;
            const videoLink = `https://www.youtube.com/watch?v=${video.id}`;
            const channelLink = `https://www.youtube.com/channel/${video.snippet.channelId}`;
            const genre =
              video.snippet.categoryId === "10" ? "Music" : "Unknown/Other"; // Category ID 10 is Music

            allVideoData.push({
              artistName,
              songTitle,
              genre,
              totalViews,
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
    if (allVideoData.length > 0) {
      displayResults(allVideoData);
      exportToExcel(allVideoData, searchTerm);
      statusDiv.textContent = `Found ${allVideoData.length} videos matching your criteria. Exported to Excel.`;
    } else {
      statusDiv.textContent =
        "No videos found matching your search and view criteria.";
    }
    statusDiv.classList.remove("hidden");
  } catch (error) {
    console.error("Error fetching YouTube data:", error);
    loadingDiv.classList.add("hidden");
    statusDiv.textContent = `Error: ${error.message}. Please check your API key and try again. Also, consider YouTube API quota limits.`;
    statusDiv.classList.remove("hidden");
  }
}

function displayResults(data) {
  const resultsTable = document.getElementById("resultsTable");
  const tableBody = resultsTable.querySelector("tbody");
  tableBody.innerHTML = ""; // Clear previous results

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${row.artistName}</td>
            <td>${row.songTitle}</td>
            <td>${row.genre}</td>
            <td>${row.totalViews.toLocaleString()}</td>
            <td><a href="${row.videoLink}" target="_blank">Link</a></td>
            <td><a href="${row.channelLink}" target="_blank">Link</a></td>
        `;
    tableBody.appendChild(tr);
  });
  resultsTable.classList.remove("hidden"); // Make the table visible
}

function exportToExcel(data, searchInput) {
  // Prepare data for Excel
  const worksheetData = data.map((row) => [
    row.artistName,
    row.songTitle,
    row.genre,
    row.totalViews,
    row.videoLink,
    row.channelLink,
  ]);

  // Add header row
  const headers = [
    "Artist (Inferred)",
    "Song Title",
    "Genre (Inferred)",
    "Total Views",
    "Video Link",
    "Channel Link",
  ];
  worksheetData.unshift(headers);

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "YouTube Music Data");

  const date = new Date();
  const fileName = `${searchInput.replace(
    /[^a-zA-Z0-9]/g,
    "_"
  )}_${date.getFullYear()}${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
