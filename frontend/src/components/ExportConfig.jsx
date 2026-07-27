import React, { useState } from 'react';
import { Download, Loader2, CheckSquare, Square, FileText } from 'lucide-react';

export default function ExportConfig({ onExport, isLoading }) {
  const [buckets, setBuckets] = useState({
    missing: true,
    uncertain: true,
    matched: false
  });

  const [format, setFormat] = useState('excel'); // default to Excel

  const handleCheckboxToggle = (bucket) => {
    setBuckets(prev => ({
      ...prev,
      [bucket]: !prev[bucket]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate that at least one bucket is selected
    if (!buckets.missing && !buckets.uncertain && !buckets.matched) {
      alert('Please select at least one result bucket to export.');
      return;
    }
    onExport(buckets, format);
  };

  return (
    <div className="w-full glass-panel glass-panel-hover p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Download className="w-4 h-4 text-brand-500" />
          Export Results
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          The download will be named "artist-name-date" automatically
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
        {/* Bucket selection checkboxes */}
        <div className="md:col-span-6 space-y-3">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Select Buckets to Include
          </label>

          <div className="flex flex-wrap gap-3">
            {/* Missing */}
            <button
              type="button"
              onClick={() => handleCheckboxToggle('missing')}
              className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-semibold transition-all ${
                buckets.missing
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              {buckets.missing ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              Missing in Catalog
            </button>

            {/* Uncertain */}
            <button
              type="button"
              onClick={() => handleCheckboxToggle('uncertain')}
              className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-semibold transition-all ${
                buckets.uncertain
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              {buckets.uncertain ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              Uncertain Matches
            </button>

            {/* Matched */}
            <button
              type="button"
              onClick={() => handleCheckboxToggle('matched')}
              className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-semibold transition-all ${
                buckets.matched
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              {buckets.matched ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              Matched Songs
            </button>
          </div>
        </div>

        {/* Format selector */}
        <div className="md:col-span-4 space-y-2">
          <label htmlFor="format-select" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Export Format
          </label>
          <div className="relative">
            <select
              id="format-select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 text-xs text-slate-800 px-3.5 py-2.5 rounded-xl outline-none cursor-pointer"
            >
              <option value="excel">Excel Spreadsheet (.xlsx)</option>
              <option value="csv">Comma-Separated Values (.csv)</option>
              <option value="both">Both Formats (triggers 2 files)</option>
            </select>
            <FileText className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Export Button */}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl text-xs font-bold text-white shadow-sm active:scale-[0.98] transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Report</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
