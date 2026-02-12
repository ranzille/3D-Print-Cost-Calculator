
import React, { useState } from 'react';
import { Product, HistoryItem, SaleItem, Sale } from '../types';
import { OWNERS } from '../constants';
import { ShoppingCart, Plus, Minus, Trash2, Search, FileText, Package, CreditCard, Banknote, Truck, ArrowRight, Grid, User } from 'lucide-react';
import clsx from 'clsx';

interface POSInterfaceProps {
  products: Product[];
  jobs: HistoryItem[];
  cart: SaleItem[];
  currency: (val: number) => string;
  onAddToCart: (item: SaleItem) => void;
  onUpdateCartQty: (index: number, delta: number) => void;
  onRemoveFromCart: (index: number) => void;
  onCheckout: (paymentMethod: Sale['paymentMethod'], shipping: number) => Promise<void>;
  onClearCart: () => void;
}

export const POSInterface: React.FC<POSInterfaceProps> = ({ 
  products, jobs, cart, currency, 
  onAddToCart, onUpdateCartQty, onRemoveFromCart, onCheckout, onClearCart
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'jobs'>('products');
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog'); // Mobile View Toggle
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [shipping, setShipping] = useState<string>(''); 

  // Cart Totals
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const shippingCost = parseFloat(shipping) || 0;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Tax Total for display (optional)
  const totalTax = cart.reduce((sum, item) => {
      const rate = item.taxRate || 0;
      const netPrice = item.unitPrice / (1 + (rate/100));
      return sum + ((item.unitPrice - netPrice) * item.quantity);
  }, 0);

  const finalTotal = subtotal + shippingCost;

  // Filtering
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredJobs = jobs.filter(j => j.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleProductClick = (p: Product) => {
    // Check stock limit
    const existingItem = cart.find(i => i.refId === p.id && i.type === 'product');
    const currentQty = existingItem ? existingItem.quantity : 0;
    
    if (currentQty >= p.stock) {
        return; // Do nothing if stock exhausted
    }

    onAddToCart({
      type: 'product',
      refId: p.id,
      name: p.name,
      quantity: 1,
      unitPrice: p.price,
      unitCost: p.cost,
      laborCost: p.laborCost || 0, // Pass labor cost, default to 0
      energyCost: p.energyCost || 0, // Pass energy cost, default to 0
      taxRate: p.taxRate || 0,
      itemOwner: p.owner || 'Baz' // Pass ownership, default to Baz if undefined
    });
  };

  const handleJobClick = (j: HistoryItem) => {
    // Attempt to extract tax rate from job inputs
    let tax = 0;
    if (j.inputs && j.inputs.taxRate) {
        tax = typeof j.inputs.taxRate === 'number' ? j.inputs.taxRate : parseFloat(j.inputs.taxRate as string);
    }
    
    // Extract Labor & Energy from snapshot if available
    const labor = j.resultsSnapshot?.unit.labor;
    // Energy cost usually includes depreciation in "machine time" context, but strictly energy is energy.
    // Let's pass the raw energy value from snapshot.
    const energy = j.resultsSnapshot?.unit.energy;

    onAddToCart({
      type: 'job',
      refId: j.id,
      name: j.name,
      quantity: typeof j.inputs.batchQty === 'string' ? parseFloat(j.inputs.batchQty) : j.inputs.batchQty,
      unitPrice: j.resultsSnapshot?.unit.finalPrice || 0,
      unitCost: j.resultsSnapshot?.unit.productionCost || 0,
      laborCost: labor || 0,
      energyCost: energy || 0,
      taxRate: tax || 0,
      itemOwner: j.owner || 'Baz' // Pass ownership, default to Baz if undefined
    });
  };

  const handleQtyChange = (index: number, delta: number) => {
      const item = cart[index];
      if (item.type === 'product' && delta > 0) {
          const product = products.find(p => p.id === item.refId);
          if (product && item.quantity >= product.stock) {
              return; // Limit reached
          }
      }
      onUpdateCartQty(index, delta);
  };

  const handlePayment = (method: Sale['paymentMethod']) => {
      onCheckout(method, shippingCost);
      setPaymentModalOpen(false);
      setShipping(''); // Reset shipping after checkout
      setMobileView('catalog'); // Return to catalog
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] overflow-hidden relative">
      
      {/* LEFT PANEL: CATALOG */}
      <div className={clsx(
          "flex-1 flex flex-col bg-gray-50 border-r border-gray-200 h-full",
          mobileView === 'cart' ? 'hidden md:flex' : 'flex'
      )}>
        {/* Search & Tabs */}
        <div className="p-4 bg-white border-b border-gray-200 shadow-sm z-10">
          <div className="flex gap-2 mb-4">
             <button 
                onClick={() => setActiveTab('products')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${activeTab === 'products' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
             >
               <Package size={16} /> Products
             </button>
             <button 
                onClick={() => setActiveTab('jobs')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${activeTab === 'jobs' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
             >
               <FileText size={16} /> Saved Jobs
             </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
              placeholder="Search items..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Grid/List Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
          {activeTab === 'products' ? (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
               {filteredProducts.map(p => {
                 const inCart = cart.find(i => i.refId === p.id && i.type === 'product')?.quantity || 0;
                 const isOutOfStock = p.stock <= 0 || inCart >= p.stock;

                 return (
                    <div 
                        key={p.id} 
                        onClick={() => !isOutOfStock && handleProductClick(p)}
                        className={clsx(
                            "bg-white p-3 rounded-xl border border-gray-200 shadow-sm transition-all flex flex-col justify-between h-32",
                            isOutOfStock ? "opacity-50 grayscale cursor-not-allowed bg-gray-50" : "hover:border-brand-500 hover:shadow-md cursor-pointer"
                        )}
                    >
                        <div>
                        <h4 className="font-bold text-gray-800 text-sm line-clamp-2">{p.name}</h4>
                        <p className={clsx("text-xs mt-1", p.stock === 0 ? "text-red-500 font-bold" : "text-gray-500")}>
                            {p.stock === 0 ? "Out of Stock" : `${p.stock} in stock`}
                        </p>
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="font-bold text-brand-600 text-lg">{currency(p.price)}</div>
                            {p.taxRate > 0 && <span className="text-[10px] text-gray-400">VAT {p.taxRate}%</span>}
                        </div>
                    </div>
                 );
               })}
             </div>
          ) : (
             <div className="space-y-2">
               {filteredJobs.map(j => (
                 <div 
                    key={j.id} 
                    onClick={() => handleJobClick(j)}
                    className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-brand-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center"
                 >
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{j.name}</h4>
                      <p className="text-xs text-gray-500">{j.date}</p>
                    </div>
                    <div className="text-right">
                       <div className="font-bold text-brand-600">{currency(j.resultsSnapshot?.unit.finalPrice || 0)}</div>
                       <div className="text-xs text-gray-400">per unit</div>
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>
        
        {/* Mobile View Cart Button */}
        <div className="md:hidden absolute bottom-4 right-4 z-20">
             <button 
                onClick={() => setMobileView('cart')}
                className="bg-brand-600 text-white p-4 rounded-full shadow-lg flex items-center gap-2 relative"
             >
                 <ShoppingCart size={24} />
                 {cartItemCount > 0 && (
                     <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                         {cartItemCount}
                     </span>
                 )}
             </button>
        </div>
      </div>

      {/* RIGHT PANEL: CART */}
      <div className={clsx(
          "w-full md:w-96 flex-col bg-white shadow-xl z-20 h-full",
          mobileView === 'cart' ? 'flex' : 'hidden md:flex'
      )}>
         <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
                <button onClick={() => setMobileView('catalog')} className="md:hidden text-gray-400 hover:text-white">
                    <ArrowRight className="rotate-180" size={20} />
                </button>
                <h2 className="font-bold flex items-center gap-2"><ShoppingCart size={20} /> Current Sale</h2>
            </div>
            <button onClick={onClearCart} className="text-xs text-gray-400 hover:text-white">Clear</button>
         </div>
         
         <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.map((item, idx) => {
                const product = item.type === 'product' ? products.find(p => p.id === item.refId) : null;
                const isMax = product ? item.quantity >= product.stock : false;

                return (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</h4>
                                <span className="text-[10px] text-gray-400 bg-white px-1.5 rounded border border-gray-200">{item.itemOwner || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center pr-2 mt-1">
                                <div className="text-xs text-brand-600 font-bold">{currency(item.unitPrice)}</div>
                                {item.taxRate > 0 && <span className="text-[9px] text-gray-400">Inc {item.taxRate}% Tax</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded px-1 shadow-sm">
                            <button onClick={() => handleQtyChange(idx, -1)} className="p-1 text-gray-500 hover:text-red-600 transition-colors"><Minus size={12}/></button>
                            <span className="text-xs font-bold w-6 text-center text-gray-800 select-none">{item.quantity}</span>
                            <button 
                                onClick={() => handleQtyChange(idx, 1)} 
                                disabled={isMax}
                                className={clsx("p-1 transition-colors", isMax ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-green-600")}
                            >
                                <Plus size={12}/>
                            </button>
                        </div>
                        <button onClick={() => onRemoveFromCart(idx)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                    </div>
                );
            })}
            {cart.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm italic">
                Cart is empty. Select items from the catalog.
              </div>
            )}
         </div>

         <div className="p-4 border-t border-gray-200 bg-gray-50 mb-16 md:mb-0">
             
            <div className="flex justify-between items-center mb-1 text-gray-500 text-xs">
               <span>Subtotal (Gross)</span>
               <span>{currency(subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center mb-1 text-gray-500 text-xs">
               <span className="flex items-center gap-1"><Truck size={12}/> Shipping</span>
               <div className="flex items-center w-24">
                 <span className="mr-1 text-gray-400">₱</span>
                 <input 
                   type="number" 
                   min="0"
                   step="0.01"
                   className="w-full text-right border border-gray-200 rounded px-1 py-0.5 text-xs bg-white focus:ring-1 focus:ring-brand-500 focus:outline-none"
                   placeholder="0.00"
                   value={shipping}
                   onChange={e => setShipping(e.target.value)}
                 />
               </div>
            </div>

            <div className="flex justify-between items-center mb-4 text-gray-400 text-xs">
               <span>Included VAT/Tax</span>
               <span>{currency(totalTax)}</span>
            </div>
            
            <div className="flex justify-between items-center mb-4 border-t border-gray-100 pt-2">
               <span className="text-gray-900 font-bold text-lg">Total</span>
               <span className="text-2xl font-black text-gray-900">{currency(finalTotal)}</span>
            </div>
            
            <button 
              disabled={cart.length === 0}
              onClick={() => setPaymentModalOpen(true)}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-brand-500/30 transition-all"
            >
              Checkout
            </button>
         </div>
      </div>

      {/* Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
           <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Select Payment Method</h3>
              <div className="space-y-3">
                 <button onClick={() => handlePayment('cash')} className="w-full flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 font-bold text-gray-700">
                    <Banknote className="text-green-600" /> Cash
                 </button>
                 <button onClick={() => handlePayment('gcash')} className="w-full flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 font-bold text-gray-700">
                    <span className="text-blue-600 font-black">G</span> GCash
                 </button>
                 <button onClick={() => handlePayment('card')} className="w-full flex items-center justify-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 font-bold text-gray-700">
                    <CreditCard className="text-purple-600" /> Card / Other
                 </button>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="mt-4 w-full py-2 text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
           </div>
        </div>
      )}

    </div>
  );
};
