import React from "react";
import { Search, Flame, Loader2 } from "lucide-react";

export default function SearchSection({
  artist,
  setArtist,
  minViews,
  setMinViews,
  onSearch,
  isLoading,
}) {
  const handleSliderChange = (e) => {
    setMinViews(parseInt(e.target.value || "0", 10));
  };

  const handleNumberChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setMinViews(isNaN(val) ? 0 : Math.max(0, val));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (artist.trim() && !isLoading) {
      onSearch();
    }
  };

  return (
    <div className="w-full glass-panel glass-panel-hover p-6 mb-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900">Input Artist</h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter artist name with a minimum view count.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          {/* Artist search field */}
          <div className="md:col-span-6 space-y-2">
            <label
              htmlFor="artist-input"
              className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
            >
              Artist Name
            </label>
            <div className="relative">
              <input
                id="artist-input"
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Michael Jackson, Queen, Billie Eilish..."
                required
                className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            </div>
          </div>

          {/* Views count filter */}
          <div className="md:col-span-4 space-y-2">
            <div className="flex justify-between items-center">
              <label
                htmlFor="views-number"
                className="block text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Min YouTube Views
              </label>
              <input
                id="views-number"
                type="number"
                value={minViews}
                onChange={handleNumberChange}
                min="0"
                className="w-24 bg-white border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-lg py-1 px-2 text-right text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                id="views-slider"
                type="range"
                min="0"
                max="10000000"
                step="50000"
                value={minViews > 10000000 ? 10000000 : minViews}
                onChange={handleSliderChange}
                className="flex-1 accent-brand-500 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 whitespace-nowrap font-medium w-8 text-right">
                {minViews >= 1000000
                  ? `${(minViews / 1000000).toFixed(1)}M`
                  : minViews >= 1000
                    ? `${Math.round(minViews / 1000)}k`
                    : minViews}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={!artist.trim() || isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl text-sm font-bold text-white shadow-sm active:scale-[0.98] transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
