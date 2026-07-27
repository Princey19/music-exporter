import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getYoutubeVideos } from "./controllers/youtube.js";
import { uploadCatalogFile } from "./controllers/catalog.js";
import { crosscheckCatalog } from "./controllers/crosscheck.js";
import { exportResults } from "./controllers/export.js";

// Always load the .env file from the project root, no matter which
// directory the process was started from (e.g. `npm run dev --prefix backend`
// runs with backend/ as the working directory, not the project root).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Setup middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // support large payloads for crosschecking

// Setup Multer for parsing catalog Excel/CSV uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "YouTube Music Exporter API is running." });
});

// YouTube fetch route
app.get("/api/youtube-videos", getYoutubeVideos);

// Catalog file upload route (CSV/Excel)
app.post("/api/catalog/upload", upload.single("file"), uploadCatalogFile);

// Crosscheck matching algorithm route
app.post("/api/crosscheck", crosscheckCatalog);

// Results export route
app.post("/api/export", exportResults);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Express Error Handler:", err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File is too large. Maximum size is 5MB." });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }

  res.status(500).json({
    error: "Internal Server Error",
    details: err.message || "An unexpected error occurred.",
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  YouTube Music Exporter Backend Running`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});
