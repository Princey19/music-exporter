import React, { useState, useMemo } from 'react';
import { ExternalLink, ArrowUpDown, Search, AlertCircle, ShieldCheck, HelpCircle } from 'lucide-react';

export default function ResultsTabs({ results }) {
  const [activeTab, setActiveTab] = useState('missing'); // Default to Missing
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('viewCount'); // Default sort field
  const [sortDirection, setSortDirection] = useState('desc'); // Default sort descending

  const tabList = [
    { id: 'missing', name: 'Missing in Catalog', color: 'text-rose-600', bg: 'bg-rose-50', count: results?.missing?.length || 0, icon: AlertCircle },
    { id: 'uncertain', name: 'Uncertain Matches', color: 'text-amber-600', bg: 'bg-amber-50', count: results?.uncertain?.length || 0, icon: HelpCircle },
    { id: 'matched', name: 'Matched Songs', color: 'text-emerald-600', bg: 'bg-emerald-50', count: results?.matched?.length || 0, icon: ShieldCheck }
  ];

  // Retrieve current active list
  const activeList = useMemo(() => {
    return results?.[activeTab] || [];
  }, [results, activeTab]);

  // Handle column sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc'); // default to desc for views/confidence
    }
  };

  // Filter and Sort List
  const processedList = useMemo(() => {
    let list = [...activeList];

    // Apply internal search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => {
        const titleMatch = item.title?.toLowerCase().includes(q);
        const catalogMatch = item.matchedCatalogTitle?.toLowerCase().includes(q);
        const albumMatch = item.matchedSong?.album?.toLowerCase().includes(q);
        return titleMatch || catalogMatch || albumMatch;
      });
    }

    // Apply Sorting
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle nested fields or confidence
      if (sortField === 'confidence') {
        aVal = a.confidence || 0;
        bVal = b.confidence || 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        // Numbers or dates
        return sortDirection === 'asc'
          ? (aVal || 0) - (bVal || 0)
          : (bVal || 0) - (aVal || 0);
      }
    });

    return list;
  }, [activeList, searchQuery, sortField, sortDirection]);

  const SortButton = ({ field, label }) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-slate-700 transition-all font-semibold uppercase tracking-wider text-[10px]"
      >
        <span>{label}</span>
        <ArrowUpDown className={`w-3.5 h-3.5 ${isActive ? 'text-brand-500' : 'text-slate-300'}`} />
      </button>
    );
  };

  const formatViews = (views) => {
    return new Intl.NumberFormat().format(views);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toISOString().split('T')[0];
  };

  return (
    <div className="w-full glass-panel overflow-hidden mb-6 flex flex-col">
      {/* Tabs Header Toggle */}
      <div className="flex flex-col md:flex-row border-b border-slate-200 md:items-center justify-between p-3 gap-3">
        <div className="flex border border-slate-200 bg-slate-50 p-1 rounded-xl w-full md:w-auto">
          {tabList.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                  setSortField('viewCount');
                  setSortDirection('desc');
                }}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{tab.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tab.bg} ${tab.color}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Search Filter */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${activeTab} results...`}
            className="w-full bg-white border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Results Table Container */}
      <div className="overflow-x-auto max-h-[500px]">
        {processedList.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-4 bg-slate-50 border border-slate-200 text-slate-400 rounded-full">
              <Search className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">No items found</h4>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              {searchQuery
                ? 'No tracks match your current filter search. Try adjusting the query.'
                : `There are currently no items in the "${tabList.find(t => t.id === activeTab)?.name}" list.`
              }
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="p-3.5 pl-6 min-w-[280px]">
                  <SortButton field="title" label="YouTube Title" />
                </th>
                <th className="p-3.5 w-32">
                  <SortButton field="viewCount" label="View Count" />
                </th>
                <th className="p-3.5 w-36">
                  <SortButton field="publishedAt" label="Published Date" />
                </th>

                {/* Extra headers for matched/uncertain items */}
                {activeTab !== 'missing' && (
                  <>
                    <th className="p-3.5 min-w-[200px]">
                      <SortButton field="matchedCatalogTitle" label="Matched Catalog Song" />
                    </th>
                    <th className="p-3.5 w-28">
                      <SortButton field="confidence" label="Confidence" />
                    </th>
                  </>
                )}

                <th className="p-3.5 w-16 text-center">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedList.map(item => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition-all text-slate-700 group"
                >
                  {/* Thumbnail & Title */}
                  <td className="p-3 pl-6 flex items-center gap-3">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-12 h-9 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-9 bg-slate-100 rounded-lg border border-slate-200 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors line-clamp-2 leading-relaxed">
                      {item.title}
                    </span>
                  </td>

                  {/* Views */}
                  <td className="p-3 font-mono font-medium text-slate-500">
                    {formatViews(item.viewCount)}
                  </td>

                  {/* Publish date */}
                  <td className="p-3 text-slate-500">
                    {formatDate(item.publishedAt)}
                  </td>

                  {/* Closest Catalog match (for matched / uncertain) */}
                  {activeTab !== 'missing' && (
                    <>
                      <td className="p-3">
                        <div className="font-semibold text-slate-700">
                          {item.matchedCatalogTitle || 'N/A'}
                        </div>
                        {item.matchedSong && (
                          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                            Album: <span className="text-slate-600">{item.matchedSong.album}</span>
                            {item.matchedSong.releaseYear && (
                              <> | Year: <span className="text-slate-600">{item.matchedSong.releaseYear}</span></>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.confidence > 0.85
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : 'bg-amber-50 border-amber-200 text-amber-600'
                        }`}>
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </td>
                    </>
                  )}

                  {/* External YouTube Link */}
                  <td className="p-3 text-center">
                    <a
                      href={item.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex p-1.5 bg-white border border-slate-200 hover:bg-brand-50 hover:border-brand-300 text-slate-400 hover:text-brand-600 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
