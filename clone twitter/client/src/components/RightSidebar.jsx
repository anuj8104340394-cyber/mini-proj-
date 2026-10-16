import React from 'react';
import { Search, MapPin, CheckCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function RightSidebar({
  searchQuery,
  setSearchQuery,
  selectedWard,
  setSelectedWard,
  selectedStatus,
  setSelectedStatus
}) {
  const commonWards = ['Ward 12', 'Ward 5', 'Civil Lines', 'South Zone', 'Model Town'];

  return (
    <aside className="hidden lg:flex flex-col w-80 h-screen sticky top-0 px-4 py-4 space-y-4 border-l border-slate-800 bg-slate-950/80 backdrop-blur overflow-y-auto">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        <input
          type="text"
          placeholder="Search complaints or issues..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
        />
      </div>

      {/* Filter by Status */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Complaint Status
        </h3>
        <div className="flex flex-wrap gap-2">
          {['All', 'Open', 'In Progress', 'Resolved'].map((status) => {
            const isSelected = selectedStatus === (status === 'All' ? '' : status);
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status === 'All' ? '' : status)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-sky-500 text-white font-semibold shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {status === 'Open' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                {status === 'In Progress' && <Clock className="w-3 h-3 text-amber-400" />}
                {status === 'Resolved' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                <span>{status}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter by Wards */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Civic Wards / Zones
          </h3>
          {selectedWard && (
            <button
              onClick={() => setSelectedWard('')}
              className="text-xs text-sky-400 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {commonWards.map((w) => {
            const isSelected = selectedWard.toLowerCase() === w.toLowerCase();
            return (
              <button
                key={w}
                onClick={() => setSelectedWard(isSelected ? '' : w)}
                className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition ${
                  isSelected
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <MapPin className="w-3 h-3 text-sky-400" />
                <span>{w}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Civic Guidelines Card */}
      <div className="bg-gradient-to-br from-slate-900 to-sky-950/30 border border-slate-800/80 rounded-2xl p-4">
        <div className="flex items-center space-x-2 text-sky-400 mb-2">
          <ShieldCheck className="w-5 h-5" />
          <h4 className="text-sm font-semibold text-white">How CivicX Works</h4>
        </div>
        <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
          <li>Post real civic issues with photos and accurate Ward tags.</li>
          <li>Upvote/Like complaints in your locality to increase priority.</li>
          <li>Ward officials and Admins review and update resolution status.</li>
        </ul>
      </div>

      {/* Mini Footer */}
      <div className="text-[11px] text-slate-500 px-2 leading-relaxed">
        © 2026 CivicX Microblog • Open Civic Reporting • Powered by Node + MongoDB
      </div>
    </aside>
  );
}
