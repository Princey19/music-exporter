import React from 'react';
import { ShieldCheck, AlertCircle, HelpCircle, ToggleLeft, ToggleRight, Info } from 'lucide-react';

export default function ResultsSummary({
  summary,
  isStrictMode,
  setIsStrictMode,
  onRunMatch
}) {
  if (!summary) return null;

  const { total, matchedCount, uncertainCount, missingCount } = summary;

  return (
    <div className="w-full space-y-6 mb-6">
      {/* Top Match Configuration Toggle */}
      <div className="glass-panel p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Matching Mode</h3>
          <p className="text-xs text-slate-500">
            Switch between Strict and Loose matching modes to audit titles
          </p>
        </div>

        <div className="flex items-center gap-6">
          {/* Strict / Loose Toggle */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold ${!isStrictMode ? 'text-brand-600' : 'text-slate-400'}`}>
              Loose Mode
            </span>
            <button
              onClick={() => {
                const newMode = !isStrictMode;
                setIsStrictMode(newMode);
                onRunMatch(newMode);
              }}
              className="focus:outline-none transition-transform active:scale-95"
            >
              {isStrictMode ? (
                <ToggleRight className="w-10 h-10 text-brand-500 hover:text-brand-600" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-300 hover:text-slate-400" />
              )}
            </button>
            <span className={`text-xs font-semibold ${isStrictMode ? 'text-brand-600' : 'text-slate-400'}`}>
              Strict Mode
            </span>
          </div>

          {/* Mode description tooltip style */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 border-l border-slate-200 pl-6 max-w-xs">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {isStrictMode
                ? 'Requires identical core names (Live, Remix, edits classified as separate tracks).'
                : 'Ignores suffixes like (Remix, Live, Acoustic) to match the main song only.'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card: Total */}
        <div className="glass-panel p-5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total YouTube Videos
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-slate-900">{total.toLocaleString()}</span>
            <span className="text-xs text-slate-400">audited</span>
          </div>
        </div>

        {/* Card: Missing */}
        <div className="glass-panel p-5 border-rose-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
              Missing in Catalog
            </span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-rose-600">{missingCount.toLocaleString()}</span>
            <span className="text-xs text-rose-400">
              ({total > 0 ? Math.round((missingCount / total) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Card: Uncertain */}
        <div className="glass-panel p-5 border-amber-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
              Uncertain Matches
            </span>
            <HelpCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-amber-600">{uncertainCount.toLocaleString()}</span>
            <span className="text-xs text-amber-400">
              ({total > 0 ? Math.round((uncertainCount / total) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Card: Matched */}
        <div className="glass-panel p-5 border-emerald-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              Matched Songs
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-emerald-600">{matchedCount.toLocaleString()}</span>
            <span className="text-xs text-emerald-400">
              ({total > 0 ? Math.round((matchedCount / total) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
