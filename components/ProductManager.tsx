
import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { Plus, Trash2, Package, Search, Edit2, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';

interface ProductManagerProps {
  products: Product[];
  onAdd: (p: Omit<Product, 'id'>) => Promise<void>;
  onUpdate: (id: string, p: Partial<Product>) => Promise<void>;
  onDelete: (id: string) => void;
  currency: (val: number) => string;
}

type SortKey = 'name' | 'stock' | 'cost' | 'price' | 'profit';
interface SortConfig {
    key: SortKey;
    direction: 'asc' | 'desc';
}

export const ProductManager: React.FC<ProductManagerProps> = ({ products, onAdd, onUpdate, onDelete, currency }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

  // Form State
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newCategory, setNewCategory] = useState('Standard');
  const [newTaxRate, setNewTaxRate] = useState('12');

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewName('');
    setNewPrice('');
    setNewCost('');
    setNewStock('');
    setNewCategory('Standard');
    setNewTaxRate('12');
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setNewName(p.name);
    setNewPrice(p.price.toString());
    setNewCost(p.cost.toString());
    setNewStock(p.stock.toString());
    setNewCategory(p.category);
    setNewTaxRate(p.taxRate !== undefined ? p.taxRate.toString() : '12');
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice) return;

    const productData = {
      name: newName,
      price: parseFloat(newPrice),
      cost: parseFloat(newCost) || 0,
      stock: parseInt(newStock) || 0,
      category: newCategory,
      taxRate: parseFloat(newTaxRate) || 0
    };

    if (editingId) {
        await onUpdate(editingId, productData);
    } else {
        await onAdd({
            ...productData,
            createdAt: Date.now()
        });
    }

    resetForm();
  };

  const handleSort = (key: SortKey) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const processedProducts = useMemo(() => {
    let result = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    result.sort((a, b) => {
        const rateA = (a.taxRate !== undefined) ? a.taxRate : 0;
        const netPriceA = a.price / (1 + (rateA/100));
        const profitA = netPriceA - a.cost;

        const rateB = (b.taxRate !== undefined) ? b.taxRate : 0;
        const netPriceB = b.price / (1 + (rateB/100));
        const profitB = netPriceB - b.cost;

        let valA: any = a[sortConfig.key as keyof Product];
        let valB: any = b[sortConfig.key as keyof Product];

        // Handle computed keys
        if (sortConfig.key === 'profit') {
            valA = profitA;
            valB = profitB;
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
  }, [products, searchTerm, sortConfig]);

  // Live calculation for form
  const formPrice = parseFloat(newPrice) || 0;
  const formCost = parseFloat(newCost) || 0;
  const formTax = parseFloat(newTaxRate) || 0;
  const formNet = formPrice / (1 + (formTax/100));
  const formProfit = formNet - formCost;
  const formMargin = formNet > 0 ? (formProfit/formNet)*100 : 0;

  const SortHeader = ({ label, sKey, align = 'left' }: { label: string, sKey: SortKey, align?: string }) => (
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
    <div className="max-w-6xl mx-auto p-6">
      
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-brand-600" /> Product Inventory
           </h2>
           <p className="text-gray-500 text-sm mt-1">Manage standardized items for Point of Sale.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg shadow-brand-500/20"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Add/Edit Modal/Panel */}
      {isAdding && (
        <div className="mb-8 bg-white p-6 rounded-xl border border-brand-100 shadow-sm animate-in slide-in-from-top-4">
           <div className="flex justify-between items-start mb-4">
               <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                   {editingId ? 'Edit Product Details' : 'New Product Details'}
               </h3>
               {/* Live Profit Preview */}
               <div className="bg-gray-50 rounded px-3 py-1 text-right border border-gray-100">
                   <div className="text-[10px] text-gray-500 uppercase">Projected Profit</div>
                   <div className="text-sm font-bold text-brand-600">{currency(formProfit)} ({formMargin.toFixed(0)}%)</div>
               </div>
           </div>

           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-gray-500 mb-1">Item Name</label>
                 <input autoFocus className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-brand-500" placeholder="e.g. 3D Benchy - Red" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Selling Price (VAT Inc)</label>
                 <input type="number" step="0.01" className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-brand-500" placeholder="0.00" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Cost Basis</label>
                 <input type="number" step="0.01" className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-brand-500" placeholder="0.00" value={newCost} onChange={e => setNewCost(e.target.value)} />
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">VAT Rate %</label>
                 <input type="number" step="0.1" className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-brand-500" placeholder="12" value={newTaxRate} onChange={e => setNewTaxRate(e.target.value)} />
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Stock</label>
                 <input type="number" className="w-full text-sm border-gray-300 rounded-lg p-2.5 focus:ring-brand-500" placeholder="0" value={newStock} onChange={e => setNewStock(e.target.value)} />
              </div>
              <div className="md:col-span-6 flex justify-end gap-2 mt-2">
                 <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg">
                     {editingId ? 'Update Item' : 'Save Item'}
                 </button>
              </div>
           </form>
        </div>
      )}

      {/* Filter */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input 
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          placeholder="Search products by name..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
             <tr>
               <SortHeader label="Product" sKey="name" />
               <SortHeader label="Stock" sKey="stock" align="center" />
               <SortHeader label="Cost" sKey="cost" align="right" />
               <SortHeader label="Price (Inc)" sKey="price" align="right" />
               <SortHeader label="Profit" sKey="profit" align="right" />
               <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
             {processedProducts.map(p => {
               const rate = (p.taxRate !== undefined && p.taxRate !== null) ? p.taxRate : 0;
               const netPrice = p.price / (1 + (rate/100));
               const profit = netPrice - p.cost;
               const margin = netPrice > 0 ? (profit / netPrice) * 100 : 0;
               
               return (
               <tr key={p.id} className={clsx("hover:bg-gray-50 group transition-all", p.stock <= 0 && "opacity-60 grayscale bg-gray-50/50")}>
                 <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.category} {rate > 0 ? `• VAT ${rate}%` : ''}</div>
                 </td>
                 <td className="px-6 py-4 text-center">
                    <span className={clsx("px-2 py-1 rounded text-xs font-bold", p.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      {p.stock}
                    </span>
                 </td>
                 <td className="px-6 py-4 text-right text-sm text-gray-500">{currency(p.cost)}</td>
                 <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{currency(p.price)}</td>
                 <td className="px-6 py-4 text-right">
                    <div className="text-sm font-bold text-brand-600">{currency(profit)}</div>
                    <div className="text-[10px] text-gray-400">{margin.toFixed(0)}% margin</div>
                 </td>
                 <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-brand-600 p-1.5 hover:bg-brand-50 rounded">
                           <Edit2 size={16} />
                        </button>
                        <button onClick={() => onDelete(p.id)} className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded">
                           <Trash2 size={16} />
                        </button>
                    </div>
                 </td>
               </tr>
             )})}
             {processedProducts.length === 0 && (
               <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No products found.</td></tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
