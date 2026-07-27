import React, { useRef, useState } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

export default function CatalogUpload({
  fileData,
  onFileUpload,
  onResetFile,
  mapping,
  setMapping,
  isLoading,
}) {
  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "csv" && ext !== "xlsx") {
      alert("Unsupported file type. Please upload a .csv or .xlsx file.");
      return;
    }
    onFileUpload(file);
  };

  const handleMappingChange = (field, val) => {
    setMapping((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const openFileDialog = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="w-full glass-panel p-6 sm:p-8 mb-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-slate-900">
          Upload Catalog File
        </h2>
        <p className="text-sm text-slate-500 mt-1">CSV or Excel</p>
      </div>

      {/* Upload dropzone (always visible so users can re-upload easily) */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-brand-500 bg-brand-50"
            : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleChange}
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
        />

        <p className="text-sm font-semibold text-slate-700 text-center">
          Drag &amp; drop your catalog file here
        </p>
        <p className="text-xs text-slate-500 text-center mt-1">
          or click to browse (.csv, .xlsx)
        </p>
      </div>

      {/* If no file uploaded yet, stop here */}
      {!fileData && !isLoading && (
        <p className="text-xs text-slate-400 text-center mt-4">
          No catalog file uploaded yet. Max size 5MB.
        </p>
      )}

      {fileData && (
        <div className="mt-6 space-y-6">
          {/* Uploaded file summary */}
          <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 truncate">
                  <span className="truncate">{fileData.fileName}</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {fileData.totalRows.toLocaleString()} songs loaded
                </p>
              </div>
            </div>

            <button
              onClick={onResetFile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-upload
            </button>
          </div>

          {/* Column Mapping Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Column Mapping
              </h3>
              <p className="text-xs text-slate-500">
                Verify which column holds the track titles and other catalog
                metadata
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Song Title (Required) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Song Title <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={mapping.title}
                    onChange={(e) =>
                      handleMappingChange("title", e.target.value)
                    }
                    className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="">-- Select Column --</option>
                    {fileData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Artist Column (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Artist Name (Optional)
                </label>
                <div className="relative">
                  <select
                    value={mapping.artist}
                    onChange={(e) =>
                      handleMappingChange("artist", e.target.value)
                    }
                    className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="">-- None --</option>
                    {fileData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Album Column (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Album Name (Optional)
                </label>
                <div className="relative">
                  <select
                    value={mapping.album}
                    onChange={(e) =>
                      handleMappingChange("album", e.target.value)
                    }
                    className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="">-- None --</option>
                    {fileData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Release Year Column (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Release Year (Optional)
                </label>
                <div className="relative">
                  <select
                    value={mapping.releaseYear}
                    onChange={(e) =>
                      handleMappingChange("releaseYear", e.target.value)
                    }
                    className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl outline-none cursor-pointer"
                  >
                    <option value="">-- None --</option>
                    {fileData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {!mapping.title && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Please map the <strong>Song Title</strong> column to activate
                  crosscheck matching.
                </span>
              </div>
            )}
          </div>

          {/* Row Preview Grid */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Catalog preview:
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-56">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    {fileData.headers.map((h) => (
                      <th key={h} className="p-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fileData.preview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 text-slate-600">
                      {fileData.headers.map((h) => (
                        <td key={h} className="p-3 max-w-[200px] truncate">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
