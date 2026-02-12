
import React, { useState, useCallback } from 'react';
import { CalculatorInputs, CalculatedResults, HistoryItem } from '../types';
import { OWNERS } from '../constants';
import { InputGroup } from './InputGroup';
import { SummaryChart } from './SummaryChart';
import { HistoryPanel } from './HistoryPanel';
import { 
  Upload, Box, Zap, TrendingUp, Save, Copy, 
  Edit2, History, Loader2, Trash2, Plus, LayoutDashboard, ChevronLeft, ChevronRight, PackagePlus, X, ChevronDown, ChevronUp
} from 'lucide-react';
import clsx from 'clsx';

interface CalculatorViewProps {
  inputs: CalculatorInputs;
  setInputs: React.Dispatch<React.SetStateAction<CalculatorInputs>>;
  results: CalculatedResults;
  history: HistoryItem[];
  editingJobId: string | null;
  isSaving: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  onLoadJob: (job: HistoryItem) => void;
  onEditJob: (job: HistoryItem) => void;
  onDeleteJob: (id: string) => void;
  onSaveJob: (asCopy: boolean) => void;
  onCancel: () => void;
  onShowMath: () => void;
  onShowDashboard: () => void;
  onAddToInventory: () => void;
  handleFile: (file: File) => void;
  isParsing: boolean;
  currency: (val: number) => string;
  onToggleJobStatus?: (job: HistoryItem) => void;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  inputs, setInputs, results, history, editingJobId,
  isSaving, isSidebarOpen, setIsSidebarOpen,
  onLoadJob, onEditJob, onDeleteJob, onSaveJob, onCancel, onShowMath, onShowDashboard, onAddToInventory,
  handleFile, isParsing, currency, onToggleJobStatus
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<'unit' | 'batch'>('unit');
  
  // Section Visibility State
  const [sections, setSections] = useState({
      overhead: true,
      commercial: true
  });
  
  // Price Editing State
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInputValue, setPriceInputValue] = useState('');

  // --- Handlers ---
  const handleInputChange = (field: keyof CalculatorInputs, value: string | number | boolean) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const addExtra = () => {
    setInputs(prev => ({ ...prev, extras: [...prev.extras, { id: Date.now().toString(), name: '', price: 0 }] }));
  };

  const updateExtra = (id: string, field: 'name' | 'price', val: string) => {
    setInputs(prev => ({
      ...prev,
      extras: prev.extras.map(ex => ex.id === id ? { ...ex, [field]: val } : ex)
    }));
  };

  const removeExtra = (id: string) => {
    setInputs(prev => ({ ...prev, extras: prev.extras.filter(ex => ex.id !== id) }));
  };

  // --- Reverse Calculation Handler (VAT Inclusive) ---
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPriceInputValue(val);

    const numericVal = parseFloat(val);
    if (isNaN(numericVal) || numericVal < 0) return;

    // 1. Determine Target Unit Price (Gross)
    const qty = typeof inputs.batchQty === 'number' ? inputs.batchQty : parseFloat(inputs.batchQty as string) || 1;
    const grossPrice = viewMode === 'unit' ? numericVal : numericVal / qty;

    // 2. Op Cost
    const opCost = results.unit.productionCost + results.unit.packaging;
    if (opCost <= 0) return;

    // 3. Calculate Deductions (Tax + Fees)
    const useFees = inputs.usePlatformFees !== false;
    const comm = useFees ? (typeof inputs.platformCommissionFee === 'number' ? inputs.platformCommissionFee : parseFloat(inputs.platformCommissionFee as string) || 0) : 0;
    const svc = useFees ? (typeof inputs.platformServiceFee === 'number' ? inputs.platformServiceFee : parseFloat(inputs.platformServiceFee as string) || 0) : 0;
    const trans = useFees ? (typeof inputs.platformTransactionFee === 'number' ? inputs.platformTransactionFee : parseFloat(inputs.platformTransactionFee as string) || 0) : 0;
    const fixed = useFees ? (typeof inputs.platformFixedFee === 'number' ? inputs.platformFixedFee : parseFloat(inputs.platformFixedFee as string) || 0) : 0;
    
    const taxRate = typeof inputs.taxRate === 'number' ? inputs.taxRate : parseFloat(inputs.taxRate as string) || 0;
    
    // Tax Amount = P - P/(1+rate)
    const taxAmount = grossPrice - (grossPrice / (1 + (taxRate/100)));

    // Fees
    const feeAmount = (grossPrice * (comm/100)) + 
                      (grossPrice * (svc/100)) + 
                      ((grossPrice + results.unit.shipping) * (trans/100)) + 
                      fixed;

    // Net Received (Wallet) before Cost
    const netReceived = grossPrice - taxAmount - feeAmount;

    // Implied Profit
    const impliedProfit = netReceived - opCost;
    
    // Markup Calculation (No rounding to preserve precision)
    const newMarkup = (impliedProfit / opCost) * 100;

    setInputs(prev => ({
        ...prev,
        markup: newMarkup 
    }));
  };

  // --- Drag & Drop ---
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  return (
    <div className="flex h-full relative overflow-hidden">
      
      {/* Sidebar - Collapsible */}
      <div 
        className={clsx(
          "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-30 flex-none h-full",
          "fixed md:relative inset-y-0 left-0", // Fix to viewport on mobile, relative on desktop
          isSidebarOpen ? "w-72 shadow-2xl md:shadow-none translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden"
        )}
      >
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-none">
            <h3 className="font-bold text-gray-700 text-xs flex items-center gap-2 uppercase tracking-wide">
                <History size={14} /> Recent Jobs
            </h3>
            {/* Close button for mobile */}
            <button className="md:hidden text-gray-400" onClick={() => setIsSidebarOpen(false)}>
               <X size={20} />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
            <HistoryPanel 
                items={history} 
                onLoad={onLoadJob} 
                onEdit={onEditJob} 
                onDelete={(item) => onDeleteJob(item.id)}
                onToggleStatus={(item) => onToggleJobStatus && onToggleJobStatus(item)} 
            />
        </div>
      </div>

      {/* Sidebar Toggle - Custom Design */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={clsx(
            "absolute top-4 z-50 bg-white border border-gray-200 shadow-md h-8 w-6 rounded-r-lg flex items-center justify-center text-gray-400 hover:text-brand-600 transition-all duration-300 cursor-pointer border-l-0 hidden md:flex",
            isSidebarOpen ? "left-72" : "left-0"
        )}
        title={isSidebarOpen ? "Collapse History" : "Expand History"}
      >
        {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Mobile Toggle Button (Visible only when sidebar closed on mobile) */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className={clsx(
            "absolute top-4 left-0 z-20 bg-white border border-gray-200 shadow-md h-8 w-8 rounded-r-lg flex items-center justify-center text-gray-400 hover:text-brand-600 md:hidden",
            isSidebarOpen ? "hidden" : "flex"
        )}
      >
        <History size={16} />
      </button>
      
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
      )}

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-8 mb-16 md:mb-0">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: INPUTS */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* File Drop Zone */}
            <div 
                className={clsx(
                    "border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative group flex flex-col items-center justify-center min-h-[120px]", 
                    dragActive ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:border-brand-400 bg-white"
                )}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => document.getElementById('fileUpload')?.click()}
            >
                <input type="file" id="fileUpload" className="hidden" onChange={(e) => e.target.files && handleFile(e.target.files[0])} accept=".gcode,.txt,.3mf" />
                <div className={clsx("p-3 rounded-full transition-colors mb-2", dragActive ? "bg-brand-100 text-brand-600" : "bg-blue-50 text-blue-500 group-hover:bg-blue-100")}>
                     {isParsing ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                </div>
                <div className="text-sm font-bold text-gray-900">Import G-Code / 3MF</div>
                <p className="text-[10px] text-gray-400">Drag file or click to analyze</p>
            </div>

            {/* SECTION 01: JOB SPECIFICATIONS */}
            <Section title="01 // Job Specifications" icon={<Box size={18} className="text-gray-400" />}>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <InputGroup label="Job Name" placeholder="e.g. Iron Man Helmet" value={inputs.jobName} onChange={(e) => handleInputChange('jobName', e.target.value)} />
                    </div>
                     <div>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                                Owner
                            </label>
                            <input 
                                className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 transition-all"
                                list="owner-suggestions"
                                placeholder="e.g. Baz"
                                value={inputs.owner || ''}
                                onChange={(e) => handleInputChange('owner', e.target.value)}
                            />
                            <datalist id="owner-suggestions">
                                {OWNERS.map(o => <option key={o} value={o} />)}
                            </datalist>
                        </div>
                    </div>
                    <div>
                        <InputGroup label="Batch Quantity" type="number" suffix="pcs" value={inputs.batchQty} onChange={(e) => handleInputChange('batchQty', e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <InputGroup label="Material Cost (1kg)" type="number" prefix="₱" value={inputs.materialCost} onChange={(e) => handleInputChange('materialCost', e.target.value)} />
                    </div>
                    <div>
                        <InputGroup label="Filament Used" type="number" suffix="g" value={inputs.materialGrams} onChange={(e) => handleInputChange('materialGrams', e.target.value)} />
                    </div>
                     <div>
                        <InputGroup label="Print Time (Hrs)" type="number" value={inputs.timeHours} onChange={(e) => handleInputChange('timeHours', e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div>
                        <InputGroup label="Print Time (Mins)" type="number" value={inputs.timeMinutes} onChange={(e) => handleInputChange('timeMinutes', e.target.value)} />
                    </div>
                </div>

                {/* Notes Field */}
                <div>
                   <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                      Job Notes
                   </label>
                   <textarea 
                      className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 transition-all"
                      rows={2}
                      placeholder="Add specific details, customer requests, or printing notes..."
                      value={inputs.notes || ''}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                   />
                </div>

                {/* Drying Time (Yellow Box) */}
                <div className="bg-orange-50/50 rounded-lg border border-orange-100 p-4">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Drying Time</label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                                checked={inputs.dryingTimeSameAsPrintTime}
                                onChange={(e) => handleInputChange('dryingTimeSameAsPrintTime', e.target.checked)}
                            />
                            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wide">Sync with Print Time</span>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                            <InputGroup 
                            label="" 
                            type="number" 
                            suffix="hrs" 
                            className={clsx("mb-0 bg-white", inputs.dryingTimeSameAsPrintTime && "opacity-50 pointer-events-none bg-gray-100")}
                            value={inputs.dryingTimeSameAsPrintTime ? inputs.timeHours : inputs.dryingHours} 
                            onChange={(e) => handleInputChange('dryingHours', e.target.value)} 
                            placeholder="0"
                            />
                            <InputGroup 
                            label="" 
                            type="number" 
                            suffix="min" 
                            className={clsx("mb-0 bg-white", inputs.dryingTimeSameAsPrintTime && "opacity-50 pointer-events-none bg-gray-100")}
                            value={inputs.dryingTimeSameAsPrintTime ? inputs.timeMinutes : inputs.dryingMinutes} 
                            onChange={(e) => handleInputChange('dryingMinutes', e.target.value)} 
                            placeholder="0"
                            />
                    </div>
                </div>

                {/* Extras */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hardware & Extras</span>
                        <button onClick={addExtra} className="text-[10px] text-brand-600 font-bold hover:bg-brand-50 px-2 py-1 rounded border border-transparent hover:border-brand-200 transition-colors flex items-center gap-1">
                            <Plus size={12} /> Add Item
                        </button>
                    </div>
                    <div className="space-y-2">
                        {inputs.extras.map((extra) => (
                            <div key={extra.id} className="flex gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <input 
                                    className="flex-1 text-sm border-gray-300 rounded-md px-3 py-2 focus:ring-brand-500 focus:border-brand-500" 
                                    value={extra.name} 
                                    onChange={(e) => updateExtra(extra.id, 'name', e.target.value)} 
                                    placeholder="Item name (e.g. Magnets)" 
                                />
                                <div className="relative w-32">
                                    <span className="absolute left-3 top-2 text-gray-400 text-sm">₱</span>
                                    <input 
                                        className="w-full text-sm border-gray-300 rounded-md pl-7 pr-3 py-2 focus:ring-brand-500 focus:border-brand-500" 
                                        type="number" 
                                        value={extra.price} 
                                        onChange={(e) => updateExtra(extra.id, 'price', e.target.value)} 
                                        placeholder="0.00" 
                                    />
                                </div>
                                <button onClick={() => removeExtra(extra.id)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-md transition-colors">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ))}
                        {inputs.extras.length === 0 && (
                            <p className="text-xs text-gray-400 italic text-center py-2">No extras added</p>
                        )}
                    </div>
                </div>
            </Section>

            {/* SECTION 02: FACTORY OVERHEAD */}
            <Section 
                title="02 // Factory Overhead" 
                icon={<Zap size={18} className="text-gray-400" />}
                isOpen={sections.overhead}
                onToggle={() => setSections(prev => ({ ...prev, overhead: !prev.overhead }))}
            >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <InputGroup label="Machine Cost" prefix="₱" value={inputs.machineCost} onChange={(e) => handleInputChange('machineCost', e.target.value)} />
                    <InputGroup label="Lifespan" suffix="hrs" value={inputs.lifespanHours} onChange={(e) => handleInputChange('lifespanHours', e.target.value)} />
                    <InputGroup label="Power Draw" suffix="W" value={inputs.powerWatts} onChange={(e) => handleInputChange('powerWatts', e.target.value)} />
                    <InputGroup label="Dryer Power" suffix="W" value={inputs.dryerPowerWatts} onChange={(e) => handleInputChange('dryerPowerWatts', e.target.value)} />
                    
                    <InputGroup label="Elec. Rate" prefix="₱" suffix="/kWh" value={inputs.elecRate} onChange={(e) => handleInputChange('elecRate', e.target.value)} />
                    <InputGroup label="Labor Rate" prefix="₱" suffix="/hr" value={inputs.laborRate} onChange={(e) => handleInputChange('laborRate', e.target.value)} />
                    <InputGroup label="Prep Time" suffix="min" value={inputs.laborMins} onChange={(e) => handleInputChange('laborMins', e.target.value)} />
                </div>
            </Section>

            {/* SECTION 03: COMMERCIAL */}
            <Section 
                title="03 // Commercial" 
                icon={<TrendingUp size={18} className="text-gray-400" />}
                isOpen={sections.commercial}
                onToggle={() => setSections(prev => ({ ...prev, commercial: !prev.commercial }))}
                action={
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                         <label 
                            onClick={() => handleInputChange('usePlatformFees', !inputs.usePlatformFees)}
                            className="text-xs font-bold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 transition-colors"
                         >
                             Platform Fees
                         </label>
                         <div 
                           className={clsx(
                               "w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors", 
                               inputs.usePlatformFees !== false ? "bg-brand-500" : "bg-gray-300"
                           )}
                           onClick={() => handleInputChange('usePlatformFees', !inputs.usePlatformFees)}
                         >
                            <div className={clsx(
                                "w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200", 
                                inputs.usePlatformFees !== false ? "translate-x-4" : "translate-x-0"
                            )} />
                         </div>
                    </div>
                }
            >
                <div>
                    {/* Fee Grid - Conditionally Rendered */}
                    {inputs.usePlatformFees !== false && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <InputGroup label="Commission %" suffix="%" value={inputs.platformCommissionFee} onChange={(e) => handleInputChange('platformCommissionFee', e.target.value)} />
                            <InputGroup label="Transaction %" suffix="%" value={inputs.platformTransactionFee} onChange={(e) => handleInputChange('platformTransactionFee', e.target.value)} />
                            <InputGroup label="Service %" suffix="%" value={inputs.platformServiceFee} onChange={(e) => handleInputChange('platformServiceFee', e.target.value)} />
                            <InputGroup label="Fixed Fee" prefix="₱" value={inputs.platformFixedFee} onChange={(e) => handleInputChange('platformFixedFee', e.target.value)} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <InputGroup label="Fail Margin" suffix="%" value={inputs.failMargin} onChange={(e) => handleInputChange('failMargin', e.target.value)} />
                        <InputGroup label="VAT Rate" suffix="%" value={inputs.taxRate} onChange={(e) => handleInputChange('taxRate', e.target.value)} />
                        <InputGroup label="Packaging" prefix="₱" value={inputs.packagingCost} onChange={(e) => handleInputChange('packagingCost', e.target.value)} />
                        <InputGroup label="Shipping" prefix="₱" value={inputs.shippingCost} onChange={(e) => handleInputChange('shippingCost', e.target.value)} />
                        
                        <div className="col-span-2">
                             <InputGroup 
                                label="Markup Goal" suffix="%" 
                                value={inputs.markup} onChange={(e) => handleInputChange('markup', e.target.value)} 
                                className="font-bold text-brand-600 bg-brand-50 border-brand-200"
                            />
                        </div>
                    </div>
                </div>
            </Section>

          </div>

          {/* RIGHT COLUMN: HUD */}
          <div className="xl:col-span-4 space-y-6">
            <div className="sticky top-6">
                <div className="bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800 ring-1 ring-white/10">
                    
                    {/* Header & Toggle */}
                    <div className="p-6 pb-0">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
                                Live Pricing
                            </span>
                            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                                <button 
                                    onClick={() => setViewMode('unit')}
                                    className={clsx(
                                        "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-wide", 
                                        viewMode === 'unit' ? "bg-brand-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Per Unit
                                </button>
                                <button 
                                    onClick={() => setViewMode('batch')}
                                    className={clsx(
                                        "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-wide", 
                                        viewMode === 'batch' ? "bg-brand-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Total Batch
                                </button>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="flex justify-center h-48 mb-2">
                           <SummaryChart data={viewMode === 'unit' ? results.unit : results.batch} currency={currency} />
                        </div>
                    </div>

                    {/* Breakdown List */}
                    <div className="px-6 py-4 space-y-3">
                        <LineItem 
                            label="Material" 
                            value={viewMode === 'unit' ? results.unit.material : results.batch.material} 
                            color="bg-blue-500" currency={currency} 
                        />
                        <LineItem 
                            label="Labor" 
                            value={viewMode === 'unit' ? results.unit.labor : results.batch.labor} 
                            color="bg-purple-500" currency={currency} 
                        />
                        <LineItem 
                            label="Energy/Machine" 
                            value={viewMode === 'unit' ? (results.unit.energy + results.unit.depreciation) : (results.batch.energy + results.batch.depreciation)} 
                            color="bg-yellow-500" currency={currency} 
                        />
                        <LineItem 
                            label="Risk/Extras" 
                            value={viewMode === 'unit' ? (results.unit.failureRisk + results.unit.extras) : (results.batch.failureRisk + results.batch.extras)} 
                            color="bg-slate-500" currency={currency} 
                        />

                        <div className="border-t border-slate-800 my-4 pt-4">
                            <div className="flex justify-between items-center text-white font-medium text-sm mb-3">
                                <span>Production Cost</span>
                                <span>{currency(viewMode === 'unit' ? results.unit.productionCost : results.batch.productionCost)}</span>
                            </div>
                            
                            <div className="space-y-1.5 pl-3 border-l-2 border-slate-800/50">
                                <SubItem label="+ Packaging" value={viewMode === 'unit' ? results.unit.packaging : results.batch.packaging} currency={currency} />
                                <SubItem label={`+ VAT (${inputs.taxRate}%)`} value={viewMode === 'unit' ? results.unit.tax : results.batch.tax} currency={currency} />
                                <SubItem label="+ Shipping" value={viewMode === 'unit' ? results.unit.shipping : results.batch.shipping} currency={currency} />
                                <SubItem label="+ Shopee Fees" value={viewMode === 'unit' ? results.unit.platformFeeAmount : results.batch.platformFeeAmount} currency={currency} color="text-red-400/80" />
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2">
                             <div className="text-slate-300 font-bold text-sm">Cost Basis</div>
                             <button 
                                onClick={onShowMath}
                                className="text-[10px] text-brand-400 hover:text-brand-300 hover:underline flex items-center gap-1"
                             >
                                View Math
                             </button>
                        </div>
                        <div className="text-right text-slate-300 font-bold text-sm">
                            {currency(viewMode === 'unit' ? results.unit.totalCostBasis : results.batch.totalCostBasis)}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-slate-800/80 p-6 border-t border-slate-700 backdrop-blur-sm">
                        <div className="text-center mb-6">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Recommended List Price (VAT Inc)</p>
                            
                            {/* Editable Price Input */}
                            <div className="relative group">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-2xl pl-2 pointer-events-none">₱</div>
                                <input 
                                    type="number" 
                                    className="w-full bg-transparent text-4xl font-black text-white tracking-tight text-center border-b border-transparent hover:border-slate-600 focus:border-brand-500 focus:outline-none transition-all pb-1"
                                    value={isEditingPrice ? priceInputValue : (viewMode === 'unit' ? results.unit.finalPrice : results.batch.finalPrice).toFixed(2)}
                                    onFocus={(e) => {
                                        setIsEditingPrice(true);
                                        setPriceInputValue((viewMode === 'unit' ? results.unit.finalPrice : results.batch.finalPrice).toFixed(2));
                                        e.target.select();
                                    }}
                                    onBlur={() => setIsEditingPrice(false)}
                                    onChange={handlePriceChange}
                                />
                                <Edit2 size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>

                            <div className="text-brand-500 font-bold text-xs mt-2 bg-brand-500/10 inline-block px-3 py-1 rounded-full">
                                {currency(viewMode === 'unit' ? results.unit.profit : results.batch.profit)} Profit
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {editingJobId ? (
                                <>
                                    <button 
                                        onClick={onCancel}
                                        className="col-span-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all text-sm"
                                    >
                                        <X size={16} /> Cancel
                                    </button>
                                    <button 
                                        onClick={() => onSaveJob(false)}
                                        disabled={isSaving}
                                        className="col-span-1 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-900/20 disabled:opacity-50 text-sm"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Edit2 size={16} />}
                                        Update
                                    </button>
                                    <button 
                                        onClick={() => onSaveJob(true)}
                                        disabled={isSaving}
                                        className="col-span-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
                                    >
                                        <Copy size={16} /> Save as New Copy
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={onCancel}
                                        className="col-span-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all text-sm"
                                    >
                                        <X size={16} /> Clear
                                    </button>
                                    <button 
                                        onClick={() => onSaveJob(false)}
                                        disabled={isSaving}
                                        className="col-span-1 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-900/20 disabled:opacity-50 text-sm"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        Save Job
                                    </button>
                                </>
                            )}
                            
                            <button 
                                onClick={() => {
                                    const text = `Quote: ${inputs.jobName}\nPrice: ${currency(results.unit.finalPrice)}`;
                                    navigator.clipboard.writeText(text);
                                    alert('Copied!');
                                }}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
                            >
                                <Copy size={14} /> Copy
                            </button>
                             <button 
                                onClick={onShowDashboard}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all text-xs"
                            >
                                <LayoutDashboard size={14} /> Dash
                            </button>

                            <button 
                                onClick={onAddToInventory}
                                className="col-span-2 bg-brand-600/10 hover:bg-brand-600/20 text-brand-600 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all text-xs border border-brand-200 mt-1"
                            >
                                <PackagePlus size={16} /> Add to Inventory
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const Section = ({ title, icon, children, isOpen = true, onToggle, action }: any) => {
    return (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div 
                className={clsx(
                    "px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors",
                    !isOpen && "border-b-0"
                )}
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <h2 className="text-xs font-bold text-gray-700 uppercase tracking-widest">{title}</h2>
                </div>
                <div className="flex items-center gap-3">
                    {action}
                    {onToggle && (
                        <div className="text-gray-400">
                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                    )}
                </div>
            </div>
            
            {isOpen && (
                <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </section>
    );
};

const LineItem = ({ label, value, color, currency }: { label: string, value: number, color: string, currency: (val: number) => string }) => (
    <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className={clsx("w-2 h-2 rounded-full", color)}></div>
            <span className="text-xs font-bold text-slate-400">{label}</span>
        </div>
        <span className="text-xs font-bold text-white">{currency(value)}</span>
    </div>
);

const SubItem = ({ label, value, currency, color }: { label: string, value: number, currency: (val: number) => string, color?: string }) => (
    <div className={clsx("flex justify-between items-center text-[10px] font-medium", color || "text-slate-500")}>
        <span>{label}</span>
        <span>{currency(value)}</span>
    </div>
);
