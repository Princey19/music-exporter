import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SearchSection from './components/SearchSection';
import CatalogUpload from './components/CatalogUpload';
import ResultsSummary from './components/ResultsSummary';
import ResultsTabs from './components/ResultsTabs';
import ExportConfig from './components/ExportConfig';
import {
  getYoutubeVideos,
  uploadCatalogFile,
  runCrosscheck,
  downloadExport
} from './utils/api';
import { ShieldAlert, Loader2, Music4 } from 'lucide-react';

export default function App() {
  // Sidebar (instructions) visibility, mainly for mobile drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search Parameters
  const [artist, setArtist] = useState('');
  const [minViews, setMinViews] = useState(10000); // default 10k views

  // File Upload State
  const [fileData, setFileData] = useState(null);
  const [mapping, setMapping] = useState({
    title: '',
    artist: '',
    album: '',
    releaseYear: ''
  });

  // Matching Configuration
  const [isStrictMode, setIsStrictMode] = useState(true);

  // Operation Loading & Progress States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(''); // Fetching YouTube, Crosschecking, Exporting, etc.
  const [errorMsg, setErrorMsg] = useState(null);
  const [errorDetails, setErrorDetails] = useState('');

  // Results State
  const [cachedVideos, setCachedVideos] = useState([]); // Cache retrieved YouTube videos to re-run matching without re-fetching
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);

  const handleFileUpload = async (file) => {
    setIsLoading(true);
    setLoadingStep('Uploading and parsing catalog file...');
    setErrorMsg(null);
    try {
      const data = await uploadCatalogFile(file);
      setFileData(data);
      // Initialize mappings with detected suggestions
      setMapping({
        title: data.detectedMapping?.title || '',
        artist: data.detectedMapping?.artist || '',
        album: data.detectedMapping?.album || '',
        releaseYear: data.detectedMapping?.releaseYear || ''
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to upload catalog file.');
      setErrorDetails(err.details || '');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleResetFile = () => {
    setFileData(null);
    setMapping({
      title: '',
      artist: '',
      album: '',
      releaseYear: ''
    });
    setResults(null);
    setSummary(null);
    setCachedVideos([]);
  };

  // Run the cross-matching calculation
  const performMatch = async (videosList, catalogList, customMapping, forceStrictMode = isStrictMode) => {
    setLoadingStep('Matching YouTube tracks against catalog...');
    try {
      const crosscheckData = await runCrosscheck(
        videosList,
        catalogList,
        customMapping,
        artist,
        forceStrictMode
      );

      setResults(crosscheckData.results);
      setSummary(crosscheckData.summary);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to perform matching analysis.');
      setErrorDetails(err.details || '');
    }
  };

  // Main Search Flow
  const handleAuditSearch = async () => {
    if (!fileData) {
      setErrorMsg('Please upload a company catalog file first.');
      return;
    }
    if (!mapping.title) {
      setErrorMsg('Please specify which column holds the Song Title in your uploaded file.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setErrorDetails('');
    setResults(null);
    setSummary(null);

    // Step 1: Retrieve YouTube Videos
    setLoadingStep(`Resolving and fetching uploads playlist for "${artist}"...`);
    let currentVideos = [];
    try {
      currentVideos = await getYoutubeVideos(artist, minViews);
      setCachedVideos(currentVideos);

      if (currentVideos.length === 0) {
        setErrorMsg(`No YouTube videos found for "${artist}" matching your view count threshold (${minViews.toLocaleString()}).`);
        setIsLoading(false);
        setLoadingStep('');
        return;
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to query YouTube API.');
      setErrorDetails(err.details || '');
      setIsLoading(false);
      setLoadingStep('');
      return;
    }

    // Step 2: Cross-check against uploaded catalog
    await performMatch(currentVideos, fileData.fullData, mapping, isStrictMode);

    setIsLoading(false);
    setLoadingStep('');
  };

  // Handles fast re-runs of the matching algorithm when strict/loose toggle is clicked
  const handleToggleMatchMode = async (newStrictMode) => {
    if (cachedVideos.length === 0 || !fileData) return;

    setIsLoading(true);
    await performMatch(cachedVideos, fileData.fullData, mapping, newStrictMode);
    setIsLoading(false);
  };

  // Handles export triggers
  const handleExport = async (selectedBuckets, exportFormat) => {
    if (!results) return;

    setLoadingStep(`Generating ${exportFormat} export...`);
    try {
      if (exportFormat === 'both') {
        // Trigger Excel and CSV downloads sequentially
        await downloadExport(results, selectedBuckets, 'excel', artist);
        await downloadExport(results, selectedBuckets, 'csv', artist);
      } else {
        await downloadExport(results, selectedBuckets, exportFormat, artist);
      }
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setLoadingStep('');
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Instructions Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto px-4 py-8 md:px-8">
          {/* App Header */}
          <Header onOpenSidebar={() => setIsSidebarOpen(true)} />

          {/* Global Error Banner */}
          {errorMsg && (
            <div className="w-full glass-panel p-5 border-rose-200 bg-rose-50 rounded-2xl mb-6">
              <div className="flex gap-3">
                <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">
                    Something needs your attention
                  </h3>
                  <p className="text-xs text-rose-600 leading-relaxed font-medium">
                    {errorMsg}
                  </p>
                  {errorDetails && (
                    <div className="text-[10px] text-rose-500 font-mono bg-white p-2 rounded-lg mt-2 overflow-x-auto max-w-full border border-rose-100">
                      Details: {errorDetails}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Catalog Upload Card */}
          <CatalogUpload
            fileData={fileData}
            onFileUpload={handleFileUpload}
            onResetFile={handleResetFile}
            mapping={mapping}
            setMapping={setMapping}
            isLoading={isLoading}
          />

          {/* Search Input Controls Card */}
          <SearchSection
            artist={artist}
            setArtist={setArtist}
            minViews={minViews}
            setMinViews={setMinViews}
            onSearch={handleAuditSearch}
            isLoading={isLoading}
          />

          {/* Loading Overlay State */}
          {isLoading && loadingStep && (
            <div className="w-full glass-panel p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                <Music4 className="w-4 h-4 text-brand-600 absolute" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-800">Working on it</h3>
                <p className="text-xs text-slate-500 font-medium animate-pulse">{loadingStep}</p>
              </div>
            </div>
          )}

          {/* Results Dashboard */}
          {!isLoading && results && summary && (
            <div className="space-y-6">
              <ResultsSummary
                summary={summary}
                isStrictMode={isStrictMode}
                setIsStrictMode={setIsStrictMode}
                onRunMatch={handleToggleMatchMode}
              />

              <ExportConfig
                onExport={handleExport}
                isLoading={loadingStep.includes('export') || loadingStep.includes('Export')}
              />

              <ResultsTabs
                results={results}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
