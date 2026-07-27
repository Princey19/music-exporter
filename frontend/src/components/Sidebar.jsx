import React from "react";
import {
  Music,
  X,
  Upload,
  Search,
  ListChecks,
  Download,
  Info,
} from "lucide-react";

const STEPS = [
  {
    //icon: Upload,
    title: "1. Upload catalog file",
    body: "Drag & drop the catalog file as a csv or excel file.",
  },
  {
    //icon: ListChecks,
    title: "2. Select column header",
    body: "Select the column header that holds the Song Title (required), and Artist, Album, Release Year (optional). The app tries to do that automatically",
  },
  {
    //icon: Search,
    title: "3. Enter an artist & search",
    body: "Type the artist name and set a minimum YouTube view count if you want to ignore very small uploads, then click Search.",
  },
  {
    //icon: ListChecks,
    title: "4. Review the results",
    body: "Videos are sorted into Missing, Uncertain, and Matched tabs based on how closely their youtube titles match the catalog.",
  },
  {
    //icon: Download,
    title: "5. Export a report",
    body: "Pick which result (Missing, Uncertain, Matched) you want and choose the format (excel or csv).",
  },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 overflow-y-auto
        lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-0 lg:shrink-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-6 space-y-6">
          {/* Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-600 flex items-center justify-center">
                <Music className="w-6 h-6" />
              </div> */}
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  YouTube Music
                  <br />
                  Search
                </h1>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Instructions header */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            {/* <Info className="w-4 h-4 text-brand-500" /> */}
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider pt-2">
              How to use this app
            </h2>
          </div>

          {/* Steps */}
          <ol className="space-y-5">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <li key={idx} className="flex gap-3">
                  {/* <div className="shrink-0 p-2 bg-slate-50 border border-slate-200 rounded-lg text-brand-500 h-fit">
                    <Icon className="w-4 h-4" />
                  </div> */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                      {step.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Footer note
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              This tool is shared across the team. If a search fails with a
              "YouTube API key is not configured" error, let your admin know
              &mdash; it's set once in the server's{" "}
              <code className="text-slate-700">.env</code> file for everyone,
              not per-person.
            </p>
          </div> */}
        </div>
      </aside>
    </>
  );
}
