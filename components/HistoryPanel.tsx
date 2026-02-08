
import React, { useState, useMemo } from 'react';
import { HistoryItem } from '../types';
import { Edit2, Trash2, Search, Filter, CheckCircle, Circle, ArrowUpDown, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface HistoryPanelProps {
  items: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onEdit: (item: HistoryItem) => void;
  onDelete: (item: HistoryItem) => void;
  onToggleStatus: (item: HistoryItem) => void;
}

type SortOption = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'name';
type FilterStatus = 'all' | 'pending' | 'completed';

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ items, onLoad, onEdit, onDelete, onToggleStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // 1. Search
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(i => 
            i.name.toLowerCase().includes(lower) || 
            i.inputs.notes?.toLowerCase().includes(lower) ||
            i.date.includes(lower)
        );
    }

    // 2. Filter
    if (filterStatus !== 'all') {
        result = result.filter(i => (i.status || 'pending') === filterStatus);
    }

    // 3. Sort
    result.sort((a, b) => {
        switch (sortOption) {
            case 'date_asc': 
                return (a.createdAt || 0) - (b.createdAt || 0);
            case 'date_desc': 
                return (b.createdAt || 0) - (a.createdAt || 0);
            case 'price_desc': 
                return b.finalPrice - a.finalPrice;
            case 'price_asc': 
                return a.finalPrice - b.finalPrice;
            case 'name': 
                return a.name.localeCompare(b.name);
            default: return 0;
        }
    });

    return result;
  }, [items, searchTerm, sortOption, filterStatus]);

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-6 mx-4 border-2 border-dashed border-gray-200 rounded-xl">
        <p className="text-gray-400 text-xs">No history yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
        {/* Controls */}
        <div className="px-4 pb-2 space-y-2 border-b border-gray-100 mb-2">
            <div className="relative">
                <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
                <input 
                    className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                    placeholder="Search jobs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={clsx(
                        "absolute right-1 top-1 p-1 rounded hover:bg-gray-100 transition-colors",
                        showFilters ? "text-brand-600 bg-brand-50" : "text-gray-400"
                    )}
                >
                    <Filter size={14} />
                </button>
            </div>

            {showFilters && (
                <div className="grid grid-cols-2 gap-2 mt-2 animate-in slide-in-from-top-1">
                    <div className="relative">
                        <select 
                            className="w-full appearance-none bg-white border border-gray-300 text-gray-700 text-xs rounded-lg focus:ring-brand-500 focus:border-brand-500 block px-3 py-2 pr-6 shadow-sm"
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as SortOption)}
                        >
                            <option value="date_desc">Newest First</option>
                            <option value="date_asc">Oldest First</option>
                            <option value="price_desc">Highest Price</option>
                            <option value="price_asc">Lowest Price</option>
                            <option value="name">Name (A-Z)</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select 
                            className="w-full appearance-none bg-white border border-gray-300 text-gray-700 text-xs rounded-lg focus:ring-brand-500 focus:border-brand-500 block px-3 py-2 pr-6 shadow-sm"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            )}
        </div>

        {/* List */}
        <div className="space-y-2 px-2 overflow-y-auto flex-1">
            {filteredItems.map((job) => {
                const isCompleted = job.status === 'completed';
                return (
                <div 
                    key={job.id}
                    className={clsx(
                        "group flex flex-col p-3 border rounded-lg transition-all relative",
                        isCompleted ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200 hover:border-brand-500 hover:shadow-md"
                    )}
                >
                    <div 
                        className="cursor-pointer"
                        onClick={() => onLoad(job)}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <h4 className={clsx("font-semibold text-xs truncate max-w-[120px]", isCompleted ? "text-gray-500 line-through" : "text-gray-800")} title={job.name}>
                                {job.name || 'Untitled'}
                            </h4>
                            <span className="text-[10px] text-gray-400">{job.date}</span>
                        </div>
                        
                        {job.inputs.notes && (
                            <p className="text-[10px] text-gray-400 italic truncate mb-2">{job.inputs.notes}</p>
                        )}

                        <div className="flex justify-between items-end">
                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{job.inputs.batchQty} pcs</span>
                            <div className="text-right">
                                <div className={clsx("font-bold text-xs", isCompleted ? "text-gray-400" : "text-brand-600")}>
                                    ₱{(job.finalPrice || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 backdrop-blur pl-2 shadow-sm rounded border border-gray-100">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleStatus(job); }}
                            className={clsx(
                                "p-1 rounded-md border transition-colors",
                                isCompleted ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-100 text-gray-400 border-gray-200 hover:text-green-600 hover:border-green-300"
                            )}
                            title={isCompleted ? "Mark Pending" : "Mark Completed"}
                        >
                            {isCompleted ? <CheckCircle size={12} /> : <Circle size={12} />}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(job); }}
                            className="p-1 bg-gray-100 hover:bg-brand-50 hover:text-brand-600 text-gray-500 rounded-md border border-gray-200"
                            title="Edit Job"
                        >
                            <Edit2 size={12} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(job); }}
                            className="p-1 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-md border border-gray-200"
                            title="Delete Job"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            )})}
            
            {filteredItems.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400">
                    No matching jobs.
                </div>
            )}
        </div>
    </div>
  );
};
