
import React, { useMemo, useState } from 'react';
import { HistoryItem, CapitalItem, Sale } from '../types';
import { Download, TrendingUp, DollarSign, Wallet, ShoppingCart, Edit2, X, Trash2, Plus, Calendar, User, Truck, Tag, Link as LinkIcon, Store, Search, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';

interface DashboardViewProps {
  history: HistoryItem[];
  capitalHistory: CapitalItem[];
  sales: Sale[];
  onDeleteJob: (id: string) => void;
  onAddCapital: (item: Omit<CapitalItem, 'id'>) => Promise<void>;
  onUpdateCapital: (id: string, updates: Partial<CapitalItem>) => Promise<void>;
  onDeleteCapital: (id: string) => void;
  onUpdateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
  onDeleteSale: (id: string) => void;
  currency: (val: number) => string;
}

interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  history, capitalHistory, sales,
  onDeleteJob, onAddCapital, onUpdateCapital, onDeleteCapital, onUpdateSale, onDeleteSale, currency 
}) => {
  const [activeTab, setActiveTab] = React.useState<'sales' | 'expenses'>('sales');
  
  // Sale Edit State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // Sorting & Searching State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  
  // Date Filtering State
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Expense Add/Edit State
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  const DEFAULT_EXPENSE = {
      name: '',
      category: 'Parts',
      platform: 'Shopee',
      store: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      dateReceived: '',
      orderedBy: 'BB',
      paidBy: 'BB',
      receiptLink: '',
      remarks: '',
      quantity: 1,
      unitPrice: ''
  };

  const [newExpense, setNewExpense] = useState<{
      name: string;
      category: string;
      platform: string;
      store: string;
      purchaseDate: string;
      dateReceived?: string;
      orderedBy: string;
      paidBy: string;
      receiptLink?: string;
      remarks?: string;
      quantity: number | '';
      unitPrice: string;
  }>(DEFAULT_EXPENSE);
  
  // Calculate aggregates
  const stats = useMemo(() => {
    // 1. Sales Revenue (Realized)
    let totalSalesRev = 0;
    let totalSalesProfit = 0;
    let totalTaxCollected = 0;

    sales.forEach(s => {
      totalSalesRev += s.totalRevenue;
      totalSalesProfit += s.totalProfit;
      
      // Calculate tax portion for stats
      if (s.items) {
          s.items.forEach(i => {
              const rate = i.taxRate || 0;
              const netPrice = i.unitPrice / (1 + (rate/100));
              totalTaxCollected += (i.unitPrice - netPrice) * i.quantity;
          });
      }
    });

    // 2. Potential Value (Saved Jobs)
    let potentialRev = 0;
    history.forEach(job => {
       potentialRev += job.finalPrice || 0;
    });

    // 3. Capital
    const totalCapital = capitalHistory.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const netPosition = totalSalesProfit - totalCapital;

    return { totalSalesRev, totalSalesProfit, totalCapital, netPosition, potentialRev, totalTaxCollected };
  }, [history, capitalHistory, sales]);

  // Handle Sort
  const handleSort = (key: string) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  // Filter and Sort Sales
  const processedSales = useMemo(() => {
      let result = [...sales];
      
      // 1. Search
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          result = result.filter(s => 
              s.dateStr.toLowerCase().includes(lower) || 
              s.paymentMethod.toLowerCase().includes(lower) || 
              s.items.some(i => i.name.toLowerCase().includes(lower))
          );
      }
      
      // 2. Date Filter
      if (dateRange.start) {
        const startTs = new Date(dateRange.start).setHours(0,0,0,0);
        result = result.filter(s => s.timestamp >= startTs);
      }
      if (dateRange.end) {
        const endTs = new Date(dateRange.end).setHours(23,59,59,999);
        result = result.filter(s => s.timestamp <= endTs);
      }

      // 3. Sort
      result.sort((a, b) => {
          let valA: any = a[sortConfig.key as keyof Sale];
          let valB: any = b[sortConfig.key as keyof Sale];

          // Special Keys
          if (sortConfig.key === 'date') {
              valA = a.timestamp;
              valB = b.timestamp;
          }

          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
      return result;
  }, [sales, searchTerm, sortConfig, dateRange]);

  // Filter and Sort Expenses
  const processedExpenses = useMemo(() => {
    let result = [...capitalHistory];
    
    // 1. Search
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(e => 
            e.name.toLowerCase().includes(lower) ||
            e.store.toLowerCase().includes(lower) ||
            e.platform.toLowerCase().includes(lower) || 
            e.category.toLowerCase().includes(lower)
        );
    }

    // 2. Date Filter
    if (dateRange.start) {
       result = result.filter(e => e.purchaseDate >= dateRange.start);
    }
    if (dateRange.end) {
       result = result.filter(e => e.purchaseDate <= dateRange.end);
    }

    // 3. Sort
    result.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof CapitalItem];
        let valB: any = b[sortConfig.key as keyof CapitalItem];

        // Special Keys
        if (sortConfig.key === 'date') {
            valA = new Date(a.purchaseDate).getTime();
            valB = new Date(b.purchaseDate).getTime();
        }

        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return result;
  }, [capitalHistory, searchTerm, sortConfig, dateRange]);


  const downloadCSV = () => {
      let content = "";
      let filename = "";

      if (activeTab === 'sales') {
        const headers = ['Date', 'Type', 'Total', 'VAT', 'Profit', 'Payment'];
        const rows = processedSales.map(s => {
            let tax = 0;
            s.items.forEach(i => {
                const rate = i.taxRate || 0;
                const net = i.unitPrice / (1 + (rate/100));
                tax += (i.unitPrice - net) * i.quantity;
            });
            return [
                s.dateStr, 
                'Sale', 
                s.totalRevenue.toFixed(2), 
                tax.toFixed(2), 
                s.totalProfit.toFixed(2), 
                s.paymentMethod
            ].join(',');
        });
        content = [headers.join(','), ...rows].join('\n');
        filename = 'sales_ledger.csv';
      } else {
        const headers = ['Purchase Date', 'Item', 'Qty', 'Category', 'Total Price', 'Store', 'Platform', 'Ordered By', 'Paid By'];
        const rows = processedExpenses.map(c => [
            c.purchaseDate, c.name, c.quantity || 1, c.category, c.price.toFixed(2), c.store, c.platform, c.orderedBy, c.paidBy
        ].join(','));
        content = [headers.join(','), ...rows].join('\n');
        filename = 'capital_expenses.csv';
      }

      const csvContent = "data:text/csv;charset=utf-8," + encodeURI(content);
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleSaveSaleEdit = async () => {
      if (!editingSale) return;
      const newProfit = editingSale.totalRevenue - editingSale.totalCost; // Simplified logic, assumes cost doesn't change
      await onUpdateSale(editingSale.id, {
          dateStr: editingSale.dateStr,
          paymentMethod: editingSale.paymentMethod,
          totalRevenue: editingSale.totalRevenue,
          totalProfit: newProfit
      });
      setEditingSale(null);
  };

  const handleEditExpense = (item: CapitalItem) => {
      setNewExpense({
          name: item.name,
          category: item.category,
          platform: item.platform || '',
          store: item.store || '',
          purchaseDate: item.purchaseDate,
          dateReceived: item.dateReceived || '',
          orderedBy: item.orderedBy || 'BB',
          paidBy: item.paidBy || 'BB',
          receiptLink: item.receiptLink || '',
          remarks: item.remarks || '',
          quantity: item.quantity || 1,
          unitPrice: item.quantity > 0 ? (item.price / item.quantity).toFixed(2) : item.price.toFixed(2)
      });
      setEditingExpenseId(item.id);
      setIsAddingExpense(true);
  };

  const closeExpenseModal = () => {
      setIsAddingExpense(false);
      setEditingExpenseId(null);
      setNewExpense(DEFAULT_EXPENSE);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const qty = Number(newExpense.quantity) || 1;
      const unit = parseFloat(newExpense.unitPrice) || 0;
      const total = unit * qty;

      if (!newExpense.name || total <= 0) {
          alert("Please enter a valid Name and Price.");
          return;
      }

      const expenseData = {
          name: newExpense.name,
          price: total,
          quantity: qty,
          category: newExpense.category as any,
          platform: newExpense.platform || '',
          store: newExpense.store || '',
          purchaseDate: newExpense.purchaseDate || new Date().toLocaleDateString(),
          dateReceived: newExpense.dateReceived || null,
          orderedBy: newExpense.orderedBy || 'BB',
          paidBy: newExpense.paidBy || 'BB',
          receiptLink: newExpense.receiptLink || null,
          remarks: newExpense.remarks || null,
      };

      try {
        if (editingExpenseId) {
            await onUpdateCapital(editingExpenseId, expenseData);
        } else {
            await onAddCapital({
                ...expenseData,
                createdAt: Date.now()
            });
        }
        closeExpenseModal();
      } catch (err) {
        alert("Failed to save expense. Please try again.");
        console.error(err);
      }
  };

  const SortHeader = ({ label, sKey, align = 'left' }: { label: string, sKey: string, align?: string }) => (
      <th 
        className={`px-6 py-3 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:text-brand-600 hover:bg-gray-100 transition-colors text-${align}`}
        onClick={() => handleSort(sKey)}
      >
          <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
            {label}
            {sortConfig.key === sKey && (
                sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>
            )}
          </div>
      </th>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden relative">
        
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 flex-none">
            <StatsCard 
              icon={<DollarSign size={20} />} 
              label="Realized Revenue" 
              value={currency(stats.totalSalesRev)} 
              subValue={`${currency(stats.totalTaxCollected)} VAT included`}
              color="text-blue-600" bg="bg-blue-50" 
            />
             <StatsCard 
              icon={<TrendingUp size={20} />} 
              label="Net Profit" 
              value={currency(stats.totalSalesProfit)} 
              color="text-green-600" bg="bg-green-50" 
            />
             <StatsCard 
              icon={<ShoppingCart size={20} />} 
              label="Capital Expenses" 
              value={currency(stats.totalCapital)} 
              color="text-orange-600" bg="bg-orange-50" 
            />
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                <div className={clsx("p-2 rounded-lg", stats.netPosition >= 0 ? "bg-brand-50 text-brand-600" : "bg-red-50 text-red-600")}>
                    <Wallet size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Net Position</p>
                    <p className={clsx("text-xl font-bold", stats.netPosition >= 0 ? "text-brand-600" : "text-red-600")}>
                      {stats.netPosition < 0 ? '-' : '+'}{currency(Math.abs(stats.netPosition))}
                    </p>
                </div>
            </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between flex-none gap-4 pb-0 pt-4 md:py-0">
          <div className="flex gap-6">
            <TabButton active={activeTab === 'sales'} onClick={() => { setActiveTab('sales'); setSearchTerm(''); }} label="Sales Ledger" />
            <TabButton active={activeTab === 'expenses'} onClick={() => { setActiveTab('expenses'); setSearchTerm(''); }} label="Capital Expenses" />
          </div>
          
          <div className="flex items-center gap-3 pb-3 md:pb-0">
             {/* Date Filters */}
             <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1.5 shadow-sm">
                <input 
                    type="date" 
                    className="text-xs text-gray-700 border-none focus:ring-0 p-0 bg-transparent w-auto font-medium"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="text-gray-400 text-xs px-1">to</span>
                <input 
                    type="date" 
                    className="text-xs text-gray-700 border-none focus:ring-0 p-0 bg-transparent w-auto font-medium"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
                {(dateRange.start || dateRange.end) && (
                    <button 
                        onClick={() => setDateRange({ start: '', end: '' })}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors ml-1"
                    >
                        <X size={12} />
                    </button>
                )}
             </div>

             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                <input 
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500 w-32 md:w-48 shadow-sm"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {activeTab === 'expenses' && (
                <button 
                    onClick={() => { closeExpenseModal(); setIsAddingExpense(true); }}
                    className="text-xs font-bold bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 flex items-center gap-1 shadow-sm whitespace-nowrap transition-colors"
                >
                    <Plus size={14} /> Add
                </button>
            )}
            <button onClick={downloadCSV} className="text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center gap-1 px-3 py-1.5 rounded-lg shadow-sm transition-colors">
                <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
             
             {/* SALES LEDGER TABLE */}
             {activeTab === 'sales' && (
                <table className="w-full text-left border-collapse bg-white rounded-xl shadow-sm overflow-hidden">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <SortHeader label="Date" sKey="date" />
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Items</th>
                            <SortHeader label="Method" sKey="paymentMethod" />
                            <SortHeader label="Total" sKey="totalRevenue" align="right" />
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">VAT</th>
                            <SortHeader label="Profit" sKey="totalProfit" align="right" />
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {processedSales.map((sale) => {
                            // Calculate Sales Tax for display row
                            const tax = sale.items.reduce((acc, i) => {
                                const rate = i.taxRate || 0;
                                const net = i.unitPrice / (1 + (rate/100));
                                return acc + ((i.unitPrice - net) * i.quantity);
                            }, 0);

                            return (
                            <tr key={sale.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{sale.dateStr}</td>
                                <td className="px-6 py-3 text-sm text-gray-900">
                                <div className="flex flex-col">
                                    {sale.items.map((i, idx) => (
                                    <span key={idx} className="text-xs text-gray-600">{i.quantity}x {i.name}</span>
                                    ))}
                                </div>
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-500 capitalize">{sale.paymentMethod}</td>
                                <td className="px-6 py-3 text-sm text-gray-900 font-bold text-right">{currency(sale.totalRevenue)}</td>
                                <td className="px-6 py-3 text-sm text-gray-400 text-right">{currency(tax)}</td>
                                <td className="px-6 py-3 text-sm text-green-600 font-bold text-right">{currency(sale.totalProfit)}</td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => setEditingSale(sale)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => onDeleteSale(sale.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )})}
                        {processedSales.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No sales recorded matching criteria.</td></tr>}
                    </tbody>
                </table>
             )}

             {/* CAPITAL EXPENSES TABLE */}
             {activeTab === 'expenses' && (
                <table className="w-full text-left border-collapse bg-white rounded-xl shadow-sm overflow-hidden">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <SortHeader label="Item Details" sKey="name" />
                            <SortHeader label="Source" sKey="store" />
                            <SortHeader label="Logistics" sKey="date" />
                            <SortHeader label="Personnel" sKey="paidBy" />
                            <SortHeader label="Amount" sKey="price" align="right" />
                            <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {processedExpenses.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-3">
                                    <div className="flex flex-col">
                                        <div className="font-bold text-gray-900 text-sm">
                                            {item.quantity && item.quantity > 1 && <span className="text-gray-500 mr-1">{item.quantity}x</span>}
                                            {item.name}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={clsx(
                                                "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                                                item.category === 'Filament' && "bg-blue-100 text-blue-700",
                                                item.category === 'Printer' && "bg-purple-100 text-purple-700",
                                                item.category === 'Parts' && "bg-orange-100 text-orange-700",
                                                item.category === 'Other' && "bg-gray-100 text-gray-700"
                                            )}>
                                                {item.category}
                                            </span>
                                            {item.remarks && <span className="text-xs text-gray-400 italic truncate max-w-[150px]">{item.remarks}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                                            <Tag size={12} className="text-gray-400" /> {item.platform || '—'}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <Store size={12} className="text-gray-400" /> {item.store || '—'}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1 text-xs text-gray-600" title="Ordered">
                                            <Calendar size={12} className="text-gray-400" /> 
                                            {/* Legacy data support: item.date might exist instead of purchaseDate */}
                                            {item.purchaseDate || (item as any).date}
                                        </div>
                                        {item.dateReceived && (
                                            <div className="flex items-center gap-1 text-xs text-green-600 font-medium" title="Received">
                                                <Truck size={12} /> {item.dateReceived}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex gap-2">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] text-gray-400 uppercase">Ord</span>
                                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-1.5 rounded">{item.orderedBy || '-'}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] text-gray-400 uppercase">Paid</span>
                                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-1.5 rounded">{item.paidBy || '-'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="font-bold text-gray-900 text-sm">{currency(item.price)}</div>
                                    {item.quantity > 1 && <div className="text-[10px] text-gray-400">@{currency(item.price/item.quantity)}/ea</div>}
                                    {item.receiptLink && (
                                        <a href={item.receiptLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-600 hover:underline flex items-center justify-end gap-1">
                                            <LinkIcon size={10} /> Receipt
                                        </a>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button 
                                            onClick={() => handleEditExpense(item)}
                                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => onDeleteCapital(item.id)} 
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {processedExpenses.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">No expenses recorded matching criteria.</td></tr>}
                    </tbody>
                </table>
             )}
        </div>
        
        {/* ... (Modals remain unchanged, just referencing context closing) */}
        {/* Edit Sale Modal */}
        {editingSale && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-900">Edit Transaction</h3>
                        <button onClick={() => setEditingSale(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                            <input 
                                type="text" 
                                className="w-full text-sm border-gray-300 rounded-lg p-2.5"
                                value={editingSale.dateStr}
                                onChange={(e) => setEditingSale({...editingSale, dateStr: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Payment Method</label>
                            <select 
                                className="w-full text-sm border-gray-300 rounded-lg p-2.5"
                                value={editingSale.paymentMethod}
                                // @ts-ignore
                                onChange={(e) => setEditingSale({...editingSale, paymentMethod: e.target.value})}
                            >
                                <option value="cash">Cash</option>
                                <option value="gcash">GCash</option>
                                <option value="card">Card</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Total Revenue (Adjustment)</label>
                            <input 
                                type="number" 
                                className="w-full text-sm border-gray-300 rounded-lg p-2.5 font-bold"
                                value={editingSale.totalRevenue}
                                onChange={(e) => setEditingSale({...editingSale, totalRevenue: parseFloat(e.target.value) || 0})}
                            />
                            <p className="text-[10px] text-orange-500 mt-1">Warning: Changing revenue affects calculated profit.</p>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2">
                        <button onClick={() => setEditingSale(null)} className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancel</button>
                        <button onClick={handleSaveSaleEdit} className="px-4 py-2 text-sm bg-brand-600 text-white font-bold hover:bg-brand-700 rounded-lg">Save Changes</button>
                    </div>
                </div>
            </div>
        )}

        {/* Add/Edit Expense Modal */}
        {isAddingExpense && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <ShoppingCart size={18} className="text-brand-600"/> 
                            {editingExpenseId ? 'Edit Capital Expense' : 'Add Capital Expense'}
                        </h3>
                        <button onClick={closeExpenseModal} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleSaveExpense} className="overflow-y-auto p-6">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Item Name</label>
                                <input required autoFocus className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-brand-500" placeholder="e.g. Bambu Lab X1C" value={newExpense.name} onChange={e => setNewExpense({...newExpense, name: e.target.value})} />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Qty</label>
                                        <input type="number" min="1" className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-brand-500" placeholder="1" value={newExpense.quantity} onChange={e => setNewExpense({...newExpense, quantity: e.target.value === '' ? '' : parseInt(e.target.value)})} />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Unit Price</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₱</span>
                                            <input required type="number" step="0.01" className="w-full text-sm border-gray-300 rounded-lg pl-7 pr-3 py-2.5 focus:ring-brand-500" placeholder="0.00" value={newExpense.unitPrice} onChange={e => setNewExpense({...newExpense, unitPrice: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-right text-gray-400 mt-1">
                                    Total: {currency((parseFloat(newExpense.unitPrice)||0) * (Number(newExpense.quantity)||1))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
                                <select className="w-full text-sm border-gray-300 rounded-lg p-2.5" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as any})}>
                                    <option value="Printer">Printer</option>
                                    <option value="Filament">Filament</option>
                                    <option value="Parts">Parts</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Platform</label>
                                <input className="w-full text-sm border-gray-300 rounded-lg p-2.5" placeholder="e.g. Shopee" value={newExpense.platform} onChange={e => setNewExpense({...newExpense, platform: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Store Name</label>
                                <input className="w-full text-sm border-gray-300 rounded-lg p-2.5" placeholder="e.g. Makerlab" value={newExpense.store} onChange={e => setNewExpense({...newExpense, store: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Purchase Date</label>
                                <input type="date" className="w-full text-sm border-gray-300 rounded-lg p-2.5" value={newExpense.purchaseDate} onChange={e => setNewExpense({...newExpense, purchaseDate: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Date Received (Optional)</label>
                                <input type="date" className="w-full text-sm border-gray-300 rounded-lg p-2.5" value={newExpense.dateReceived || ''} onChange={e => setNewExpense({...newExpense, dateReceived: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Ordered By</label>
                                <select className="w-full text-sm border-gray-300 rounded-lg p-2.5" value={newExpense.orderedBy} onChange={e => setNewExpense({...newExpense, orderedBy: e.target.value})}>
                                    <option value="BB">BB</option>
                                    <option value="RB">RB</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Paid By</label>
                                <select className="w-full text-sm border-gray-300 rounded-lg p-2.5" value={newExpense.paidBy} onChange={e => setNewExpense({...newExpense, paidBy: e.target.value})}>
                                    <option value="BB">BB</option>
                                    <option value="RB">RB</option>
                                    <option value="Shared">Shared</option>
                                </select>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Remarks / Receipt Link</label>
                            <input className="w-full text-sm border-gray-300 rounded-lg p-2.5 mb-2" placeholder="http://..." value={newExpense.receiptLink || ''} onChange={e => setNewExpense({...newExpense, receiptLink: e.target.value})} />
                            <textarea className="w-full text-sm border-gray-300 rounded-lg p-2.5" rows={2} placeholder="Additional notes..." value={newExpense.remarks || ''} onChange={e => setNewExpense({...newExpense, remarks: e.target.value})} />
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                            <button type="button" onClick={closeExpenseModal} className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancel</button>
                            <button type="submit" className="px-6 py-2 text-sm bg-brand-600 text-white font-bold hover:bg-brand-700 rounded-lg">
                                {editingExpenseId ? 'Update Expense' : 'Add Expense'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

interface StatsCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    color: string;
    bg: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value, subValue, color, bg }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
        <div className={clsx("p-2 rounded-lg flex items-center justify-center", bg, color)}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={clsx("text-xl font-bold", color || "text-gray-900")}>
                {value}
            </p>
            {subValue && <p className="text-[10px] text-gray-400">{subValue}</p>}
        </div>
    </div>
);

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, label }) => (
    <button 
        onClick={onClick}
        className={clsx(
            "pb-3 text-sm font-bold border-b-2 transition-colors",
            active ? "border-brand-600 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
        )}
    >
        {label}
    </button>
);
