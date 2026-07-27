import React from "react";
import { Menu } from "lucide-react";

export default function Header({ onOpenSidebar }) {
  return (
    <header className="w-full mb-8 relative">
      <button
        onClick={onOpenSidebar}
        className="lg:hidden absolute left-0 top-1 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
      >
        <Menu className="w-4 h-4" />
        Instructions
      </button>

      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 text-center">
        YouTube Music Search
      </h1>
      {/* <p className="text-sm text-slate-500 text-center mt-2">
        Find an artist's songs on YouTube and cross-check them against your
        company catalog.
      </p> */}
    </header>
  );
}
