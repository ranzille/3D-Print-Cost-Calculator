
import React, { useState, useEffect } from 'react';
import { CalculatorInputs, CalculatedResults, HistoryItem, CapitalItem, Product, SaleItem, Sale } from './types';
import { calculateCosts } from './services/calculatorService';
import { parseGCodeFile } from './services/gcodeService';
import { 
  saveJob, getJobs, deleteJob, updateJob,
  saveCapitalItem, getCapitalItems, deleteCapitalItem, updateCapitalItem,
  getProducts, saveProduct, deleteProduct, updateProduct,
  saveSale, getSales, updateSale, deleteSale,
  getSyncStatus
} from './services/firebase';
import { loadSettings, saveSettings, mergeWithDefaults } from './services/settingsService';

// View Components
import { CalculatorView } from './components/CalculatorView';
import { DashboardView } from './components/DashboardView';
import { MathModal } from './components/MathModal';
import { ProductManager } from './components/ProductManager';
import { POSInterface } from './components/POSInterface';
import { ConfirmDialog } from './components/ConfirmDialog';

import { 
  Printer, Calculator, Package as PackageIcon, 
  ShoppingCart, LayoutDashboard, Cloud, Settings, Download, Upload, Loader2, X
} from 'lucide-react';
import clsx from 'clsx';

function App() {
  // --- STATE MANAGEMENT ---
  const [activeView, setActiveView] = useState<'calculator' | 'products' | 'pos' | 'dashboard'>('calculator');
  
  // Calculator State
  const [inputs, setInputs] = useState<CalculatorInputs>(() => {
    const saved = loadSettings();
    return mergeWithDefaults(saved);
  });
  const [results, setResults] = useState<CalculatedResults>(() => calculateCosts(inputs));
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Data State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [capitalHistory, setCapitalHistory] = useState<CapitalItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [syncStatus] = useState(getSyncStatus());

  // POS State (Lifted)
  const [cart, setCart] = useState<SaleItem[]>([]);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('bambuCalc_Sidebar');
        return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [showMathModal, setShowMathModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [productToImport, setProductToImport] = useState<{name: string, price: number, cost: number, taxRate: number} | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // --- EFFECT HOOKS ---

  // Initial Data Load
  const refreshAllData = async () => {
    return Promise.all([
      getJobs(),
      getCapitalItems(),
      getProducts(),
      getSales()
    ]).then(([j, c, p, s]) => {
      setHistory(j);
      setCapitalHistory(c);
      setProducts(p);
      setSales(s);
    });
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Recalculate when inputs change
  useEffect(() => {
    setResults(calculateCosts(inputs));
  }, [inputs]);

  // Persist settings
  useEffect(() => {
    saveSettings(inputs);
  }, [inputs]);

  const currency = (val: number) => '₱' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // --- HANDLERS ---

  // File Handler
  const handleFile = async (file: File) => {
    setIsParsing(true);
    try {
      const data = await parseGCodeFile(file);
      if (data.found) {
        setInputs(prev => ({
          ...prev,
          timeHours: data.hours,
          timeMinutes: data.minutes,
          materialGrams: data.grams,
          jobName: data.filename?.replace(/\.(gcode|3mf|txt)$/i, '') || prev.jobName
        }));
      } else {
        alert("Could not extract print time or weight from file.");
      }
    } catch (e) {
      console.error(e);
      alert("Error parsing file");
    } finally {
      setIsParsing(false);
    }
  };

  // Job Handlers
  const handleLoadJob = (job: HistoryItem) => {
    setInputs(job.inputs);
    setEditingJobId(job.id);
    setActiveView('calculator');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleEditJob = (job: HistoryItem) => {
    handleLoadJob(job);
  };

  const handleSaveJob = async (asCopy: boolean) => {
    setIsSaving(true);
    try {
      const jobData = {
        name: inputs.jobName || 'Untitled Job',
        date: new Date().toLocaleDateString(),
        inputs,
        resultsSnapshot: results,
        finalPrice: results.unit.finalPrice,
        status: 'pending' as const,
        createdAt: Date.now()
      };

      if (editingJobId && !asCopy) {
        await updateJob(editingJobId, { ...jobData, updatedAt: Date.now() });
        setEditingJobId(null);
      } else {
        await saveJob(jobData);
      }
      refreshAllData();
    } catch (e) {
      console.error(e);
      alert("Failed to save job");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleJobStatus = async (job: HistoryItem) => {
    const newStatus = job.status === 'completed' ? 'pending' : 'completed';
    await updateJob(job.id, { status: newStatus });
    refreshAllData();
  };

  const confirmDeleteJob = async () => {
    if (jobToDelete) {
      await deleteJob(jobToDelete);
      refreshAllData();
      setJobToDelete(null);
    }
  };

  const handleAddToInventory = () => {
      setProductToImport({
          name: inputs.jobName || 'Untitled Print',
          price: results.unit.finalPrice,
          cost: results.unit.productionCost,
          taxRate: typeof inputs.taxRate === 'number' ? inputs.taxRate : parseFloat(inputs.taxRate as string)
      });
      setActiveView('products');
  };

  // Capital Handlers
  const handleAddCapital = async (item: Omit<CapitalItem, 'id'>) => {
    await saveCapitalItem(item);
    refreshAllData();
  };

  const handleUpdateCapital = async (id: string, updates: Partial<CapitalItem>) => {
    await updateCapitalItem(id, updates);
    refreshAllData();
  };

  const confirmDeleteCapital = async (id: string) => {
    await deleteCapitalItem(id);
    refreshAllData();
  };

  // Product Handlers
  const handleAddProduct = async (p: Omit<Product, 'id'>) => {
    await saveProduct(p);
    refreshAllData();
  };

  const handleUpdateProduct = async (id: string, p: Partial<Product>) => {
    await updateProduct(id, p);
    refreshAllData();
  };

  const confirmDeleteProduct = async () => {
    if (productToDelete) {
      await deleteProduct(productToDelete);
      refreshAllData();
      setProductToDelete(null);
    }
  };

  // Sale/POS Handlers
  const handleCheckout = async (paymentMethod: Sale['paymentMethod'], shipping: number) => {
    let totalRevenue = 0;
    let totalCost = 0;
    
    // Calculate totals and deduct stock
    for (const item of cart) {
        totalRevenue += item.unitPrice * item.quantity;
        totalCost += item.unitCost * item.quantity;
        
        if (item.type === 'product') {
            const product = products.find(p => p.id === item.refId);
            if (product) {
                await updateProduct(product.id, { stock: product.stock - item.quantity });
            }
        }
    }
    
    const sale: Omit<Sale, 'id'> = {
        items: cart,
        totalRevenue: totalRevenue + shipping,
        totalCost,
        totalProfit: (totalRevenue + shipping) - totalCost,
        paymentMethod,
        shipping,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString()
    };
    
    await saveSale(sale);
    setCart([]);
    refreshAllData();
  };

  const handleUpdateSale = async (id: string, updates: Partial<Sale>) => {
    await updateSale(id, updates);
    refreshAllData();
  };

  const confirmDeleteSale = async () => {
    if (saleToDelete) {
      await deleteSale(saleToDelete);
      refreshAllData();
      setSaleToDelete(null);
    }
  };

  // --- BACKUP / RESTORE LOGIC ---

  const handleExportData = () => {
      const data = {
          jobs: history,
          products: products,
          sales: sales,
          capital: capitalHistory,
          exportedAt: new Date().toISOString()
      };
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `3d_print_data_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0]) return;
      const file = e.target.files[0];
      
      setIsImporting(true);
      try {
          const text = await file.text();
          const data = JSON.parse(text);
          
          // 1. Fetch existing data for de-duplication (checking against current loaded state + more if needed)
          // We can rely on the current state if it's reasonably fresh, or fetch fresh.
          // To be safe against a large DB not fully loaded in state, we should fetch ID lists or rely on state if `refreshAllData` was called.
          // For simplicity and performance in this client-side app, we'll dedupe against the currently loaded state `history`, `products`, etc.
          // *Better:* Fetch fresh full lists to be sure.
          
          const [exJobs, exProducts, exSales, exCapital] = await Promise.all([
             getJobs(2000), // Check last 2000 jobs
             getProducts(),
             getSales(2000),
             getCapitalItems(2000)
          ]);

          // Sets for fast lookup
          // Job: De-dupe by createdAt timestamp
          const jobTimestamps = new Set(exJobs.map(j => j.createdAt));
          // Product: De-dupe by Name (Case insensitive)
          const productNames = new Set(exProducts.map(p => p.name.toLowerCase()));
          // Sales: De-dupe by timestamp
          const saleTimestamps = new Set(exSales.map(s => s.timestamp));
          // Capital: De-dupe by Name + PurchaseDate + Price (Composite key)
          const getCapKey = (c: any) => `${c.name}|${c.purchaseDate}|${c.price}`;
          const capitalKeys = new Set(exCapital.map(c => getCapKey(c)));

          let added = 0;
          let skipped = 0;
          
          // Import Jobs
          if (data.jobs && Array.isArray(data.jobs)) {
              for (const job of data.jobs) {
                 if (job.createdAt && jobTimestamps.has(job.createdAt)) {
                     skipped++; continue;
                 }
                 // Legacy support: if no createdAt, maybe check name+date?
                 // For now, assume good export format.
                 const { id, ...rest } = job; 
                 await saveJob(rest);
                 added++;
              }
          }

          // Import Products
          if (data.products && Array.isArray(data.products)) {
              for (const p of data.products) {
                  if (p.name && productNames.has(p.name.toLowerCase())) {
                      skipped++; continue;
                  }
                  const { id, ...rest } = p;
                  await saveProduct(rest);
                  added++;
              }
          }

          // Import Sales
          if (data.sales && Array.isArray(data.sales)) {
              for (const s of data.sales) {
                  if (s.timestamp && saleTimestamps.has(s.timestamp)) {
                      skipped++; continue;
                  }
                  const { id, ...rest } = s;
                  await saveSale(rest);
                  added++;
              }
          }

          // Import Capital
          if (data.capital && Array.isArray(data.capital)) {
              for (const c of data.capital) {
                  const key = getCapKey(c);
                  if (capitalKeys.has(key)) {
                      skipped++; continue;
                  }
                  const { id, ...rest } = c;
                  await saveCapitalItem(rest);
                  added++;
              }
          }

          alert(`Import successful!\n\n✅ Added: ${added} new records\n🚫 Skipped: ${skipped} duplicates`);
          await refreshAllData();
          setShowSettingsModal(false);

      } catch (err) {
          console.error(err);
          alert("Failed to import file. Invalid format or corrupt file.");
      } finally {
          setIsImporting(false);
          // Reset file input
          e.target.value = '';
      }
  };

  // Navigation Helper
  const NavItem = ({ view, icon: Icon, label }: { view: typeof activeView, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveView(view)}
      className={clsx(
          "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-bold",
          activeView === view ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
      )}
    >
        <Icon size={18} />
        <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-white">
        {/* Top Navigation */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 flex-none bg-white z-40">
            <div className="flex items-center gap-3">
                <div className="bg-brand-600 text-white p-2 rounded-lg">
                    <Printer size={20} />
                </div>
                <div>
                    <h1 className="font-black text-lg text-gray-900 leading-none">BambuCalc</h1>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                        <Cloud size={10} /> {syncStatus.isCloud ? 'Cloud Sync Active' : 'Local Mode'}
                    </div>
                </div>
            </div>

            <nav className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                <NavItem view="calculator" icon={Calculator} label="Calculator" />
                <NavItem view="products" icon={PackageIcon} label="Inventory" />
                <NavItem view="pos" icon={ShoppingCart} label="POS" />
                <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            </nav>

            <div className="flex items-center gap-2 w-32 justify-end">
                 <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                    title="Settings & Data"
                 >
                    <Settings size={20} />
                 </button>
            </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-hidden relative">
            {activeView === 'calculator' && (
                <CalculatorView 
                    inputs={inputs}
                    setInputs={setInputs}
                    results={results}
                    history={history}
                    editingJobId={editingJobId}
                    isSaving={isSaving}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    onLoadJob={handleLoadJob}
                    onEditJob={handleEditJob}
                    onDeleteJob={id => setJobToDelete(id)}
                    onSaveJob={handleSaveJob}
                    onCancel={() => { setEditingJobId(null); setInputs(mergeWithDefaults({})); }}
                    onShowMath={() => setShowMathModal(true)}
                    onShowDashboard={() => setActiveView('dashboard')}
                    onAddToInventory={handleAddToInventory}
                    handleFile={handleFile}
                    isParsing={isParsing}
                    currency={currency}
                    onToggleJobStatus={handleToggleJobStatus}
                />
            )}

            {activeView === 'products' && (
                <ProductManager 
                    products={products}
                    onAdd={handleAddProduct}
                    onUpdate={handleUpdateProduct}
                    onDelete={id => setProductToDelete(id)}
                    currency={currency}
                />
            )}

            {activeView === 'pos' && (
                <POSInterface 
                    products={products}
                    jobs={history}
                    cart={cart}
                    currency={currency}
                    onAddToCart={item => {
                        const existing = cart.findIndex(c => c.type === item.type && c.refId === item.refId);
                        if (existing >= 0) {
                            const newCart = [...cart];
                            newCart[existing].quantity += item.quantity;
                            setCart(newCart);
                        } else {
                            setCart([...cart, item]);
                        }
                    }}
                    onUpdateCartQty={(idx, delta) => {
                         const newCart = [...cart];
                         newCart[idx].quantity += delta;
                         if (newCart[idx].quantity <= 0) newCart.splice(idx, 1);
                         setCart(newCart);
                    }}
                    onRemoveFromCart={idx => {
                        const newCart = [...cart];
                        newCart.splice(idx, 1);
                        setCart(newCart);
                    }}
                    onCheckout={handleCheckout}
                    onClearCart={() => setCart([])}
                />
            )}

            {activeView === 'dashboard' && (
                <DashboardView 
                    history={history}
                    capitalHistory={capitalHistory}
                    sales={sales}
                    onDeleteJob={id => setJobToDelete(id)}
                    onAddCapital={handleAddCapital}
                    onUpdateCapital={handleUpdateCapital}
                    onDeleteCapital={confirmDeleteCapital}
                    onUpdateSale={handleUpdateSale}
                    onDeleteSale={id => setSaleToDelete(id)}
                    currency={currency}
                />
            )}
        </main>

        {/* Modals */}
        <MathModal 
            isOpen={showMathModal} 
            onClose={() => setShowMathModal(false)}
            inputs={inputs}
            results={results}
            currency={currency}
        />

        {/* Settings Modal (Backup/Restore) */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="text-brand-600" /> Settings & Data
                    </h2>
                    <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                 </div>
                 
                 <div className="space-y-4">
                     <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                         <h3 className="text-sm font-bold text-gray-800 mb-2">Backup Data</h3>
                         <p className="text-xs text-gray-500 mb-3">Download a JSON file containing all jobs, products, sales, and expenses.</p>
                         <button 
                            onClick={handleExportData}
                            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-brand-500 text-gray-700 hover:text-brand-600 font-bold py-2 rounded-lg transition-colors text-sm shadow-sm"
                         >
                             <Download size={16} /> Download Backup
                         </button>
                     </div>

                     <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                         <h3 className="text-sm font-bold text-gray-800 mb-2">Restore Data</h3>
                         <p className="text-xs text-gray-500 mb-3">Import data from a backup file. Existing records will be skipped to prevent duplicates.</p>
                         <div className="relative">
                            <input 
                                type="file" 
                                accept=".json" 
                                onChange={handleImportData}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isImporting}
                            />
                            <button 
                                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-lg transition-colors text-sm shadow-md disabled:opacity-50"
                                disabled={isImporting}
                            >
                                {isImporting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                {isImporting ? 'Importing...' : 'Upload Backup File'}
                            </button>
                         </div>
                     </div>
                 </div>
                 
                 <div className="mt-6 text-center text-[10px] text-gray-400">
                     v1.2.1 • Data is synced to Google Firebase
                 </div>
             </div>
          </div>
        )}

        <ConfirmDialog 
            isOpen={!!jobToDelete}
            title="Delete Job?"
            message="This action cannot be undone. The job record will be permanently removed."
            onConfirm={confirmDeleteJob}
            onCancel={() => setJobToDelete(null)}
        />
        
        <ConfirmDialog 
            isOpen={!!productToDelete}
            title="Delete Product?"
            message="Are you sure? This will remove the product from inventory and POS."
            onConfirm={confirmDeleteProduct}
            onCancel={() => setProductToDelete(null)}
        />

        <ConfirmDialog 
            isOpen={!!saleToDelete}
            title="Delete Sale Record?"
            message="This will remove the transaction from your ledger."
            onConfirm={confirmDeleteSale}
            onCancel={() => setSaleToDelete(null)}
        />

        <ConfirmDialog 
            isOpen={!!productToImport}
            title="Import to Inventory"
            message={`Add "${productToImport?.name}" to Inventory?\nRecommended Price: ${currency(productToImport?.price || 0)}\nCost Basis: ${currency(productToImport?.cost || 0)}\nVAT Rate: ${productToImport?.taxRate}%`}
            onConfirm={() => {
                if (productToImport) {
                    saveProduct({
                        name: productToImport.name,
                        category: 'Printed',
                        price: productToImport.price,
                        cost: productToImport.cost,
                        taxRate: productToImport.taxRate,
                        stock: 0,
                        createdAt: Date.now()
                    }).then(() => {
                        refreshAllData();
                        setProductToImport(null);
                    });
                }
            }}
            onCancel={() => setProductToImport(null)}
            confirmText="Import"
            type="info"
        />
    </div>
  );
}

export default App;
