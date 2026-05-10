import React, { useState, useEffect, useMemo } from 'react';
import { Filament } from '../types';
import { getFilaments, saveFilament, deleteFilament, updateFilament } from '../services/firebase';
import { Plus, Trash2, Edit2, Loader2, Save, X, Image as ImageIcon, Download, Search, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';
import { ConfirmDialog } from './ConfirmDialog';
import * as htmlToImage from 'html-to-image';

interface FilamentInventoryProps {
  onAddFilamentCost?: (costPerGram: number) => void;
}

const MATERIAL_OPTIONS = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'Nylon', 'Other'];
const STATUS_OPTIONS = ['Dry', 'Needs Drying', 'In Use', 'Depleted', 'Unknown'];
const SPECIAL_PROPERTIES = ['Standard', 'Matte', 'Silk', 'Marble', 'Glow in the Dark', 'CF (Carbon Fiber)', 'GF (Glass Fiber)', 'Wood', 'Metal', 'Dual-Color', 'Tri-Color', 'Transparent', 'Translucent'];

const getDensity = (material: string) => {
  const mat = material.toUpperCase();
  if (mat.includes('PLA')) return 1.24;
  if (mat.includes('PETG')) return 1.27;
  if (mat.includes('ABS')) return 1.04;
  if (mat.includes('TPU')) return 1.21;
  if (mat.includes('ASA')) return 1.07;
  if (mat.includes('PC')) return 1.20;
  if (mat.includes('NYLON') || mat.includes('PA')) return 1.14;
  return 1.24; // Default to PLA-ish
};

const hexToHSL = (hex: string) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  let cmin = Math.min(r,g,b),
      cmax = Math.max(r,g,b),
      delta = cmax - cmin,
      h = 0,
      s = 0,
      l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  let S = +(s * 100).toFixed(1);
  let L = +(l * 100).toFixed(1);

  return { h, s: S, l: L };
};

const getColorFamily = (hex: string | undefined) => {
  if (!hex || !hex.startsWith('#')) return 'Neutrals/Grayscale';
  const { h, s, l } = hexToHSL(hex);
  
  if (s < 15 || l < 15 || l > 85) return 'Neutrals/Grayscale';
  if (h < 80 || h > 280) return 'Vibrants (Warm)';
  return 'Deep Tones (Cool)';
};

const calculateRemainingMeters = (netWeightGrams: number, diameterMm: number, material: string) => {
  if (netWeightGrams <= 0 || diameterMm <= 0) return 0;
  const density = getDensity(material);
  const radiusCm = (diameterMm / 2) / 10;
  const volumePerMeterCm3 = Math.PI * Math.pow(radiusCm, 2) * 100;
  const weightPerMeterGrams = volumePerMeterCm3 * density;
  return netWeightGrams / weightPerMeterGrams;
};

export const FilamentInventory: React.FC<FilamentInventoryProps> = ({ onAddFilamentCost }) => {
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Filament>>({});
  
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Filament>>({
      brand: '',
      material: 'PLA',
      color: '',
      colorHex: '#000000',
      specialProperty: 'Standard',
      td: '',
      diameter: 1.75,
      purchasePrice: 0,
      purchaseWeight: 1000,
      costPerGram: 0.00,
      spoolTare: 250,
      currentGross: 1000,
      status: 'Dry'
  });

  const [filamentToDelete, setFilamentToDelete] = useState<string | null>(null);
  const [showMenuExport, setShowMenuExport] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [materialFilter, setMaterialFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const requestSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
      if (!sortConfig || sortConfig.key !== key) return null;
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="inline ml-1" /> : <ArrowDown size={14} className="inline ml-1" />;
  };

  const processedFilaments = useMemo(() => {
      let result = filaments.map(f => {
          const remainingNet = Math.max(0, (f.currentGross || 0) - (f.spoolTare || 0));
          const metersLeft = calculateRemainingMeters(remainingNet, f.diameter || 1.75, f.material || 'PLA');
          return { ...f, remainingNet, metersLeft };
      });

      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          result = result.filter(f => 
              (f.brand || '').toLowerCase().includes(q) || 
              (f.color || '').toLowerCase().includes(q) ||
              (f.material || '').toLowerCase().includes(q)
          );
      }
      if (statusFilter !== 'All') {
          result = result.filter(f => f.status === statusFilter);
      }
      if (materialFilter !== 'All') {
          result = result.filter(f => f.material === materialFilter);
      }

      if (sortConfig) {
          result.sort((a, b) => {
              let aVal: any = (a as any)[sortConfig.key];
              let bVal: any = (b as any)[sortConfig.key];
              
              if (typeof aVal === 'string') aVal = aVal.toLowerCase();
              if (typeof bVal === 'string') bVal = bVal.toLowerCase();
              if (aVal === undefined || aVal === null) aVal = '';
              if (bVal === undefined || bVal === null) bVal = '';

              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }

      return result;
  }, [filaments, searchQuery, statusFilter, materialFilter, sortConfig]);

  const refreshFilaments = async () => {
    setIsLoading(true);
    try {
      const data = await getFilaments();
      setFilaments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshFilaments();
  }, []);

  const handleAdd = async () => {
    if (!addForm.brand || !addForm.material) {
        alert("Brand and Material are required.");
        return;
    }
    
    // Auto-calculate cost per gram if purchase info is provided
    let calcCostPerGram = addForm.costPerGram || 0;
    if (addForm.purchasePrice && addForm.purchaseWeight && addForm.purchaseWeight > 0) {
        calcCostPerGram = addForm.purchasePrice / addForm.purchaseWeight;
    }
    
    try {
      await saveFilament({
          brand: addForm.brand || '',
          material: addForm.material || 'PLA',
          color: addForm.color || '',
          colorHex: addForm.colorHex || '#000000',
          specialProperty: addForm.specialProperty || 'Standard',
          purchasePrice: Number(addForm.purchasePrice) || 0,
          purchaseWeight: Number(addForm.purchaseWeight) || 1000,
          td: addForm.td || '',
          diameter: Number(addForm.diameter) || 1.75,
          costPerGram: calcCostPerGram,
          spoolTare: Number(addForm.spoolTare) || 0,
          currentGross: Number(addForm.currentGross) || 0,
          status: addForm.status || 'Unknown',
          createdAt: Date.now()
      });
      setIsAdding(false);
      setAddForm({
          brand: '',
          material: 'PLA',
          color: '',
          colorHex: '#000000',
          specialProperty: 'Standard',
          td: '',
          diameter: 1.75,
          purchasePrice: 0,
          purchaseWeight: 1000,
          costPerGram: 0.00,
          spoolTare: 250,
          currentGross: 1000,
          status: 'Dry'
      });
      refreshFilaments();
    } catch (e) {
        console.error(e);
        alert("Failed to save filament.");
    }
  };

  const handleSaveEdit = async () => {
    if (!isEditing) return;
    
    // Auto-calculate cost per gram if purchase info is provided
    let calcCostPerGram = editForm.costPerGram || 0;
    if (editForm.purchasePrice && editForm.purchaseWeight && editForm.purchaseWeight > 0) {
        calcCostPerGram = editForm.purchasePrice / editForm.purchaseWeight;
    }
    
    try {
        await updateFilament(isEditing, {
            ...editForm,
            costPerGram: calcCostPerGram,
            updatedAt: Date.now()
        });
        setIsEditing(null);
        refreshFilaments();
    } catch (e) {
        console.error(e);
        alert("Failed to update filament.");
    }
  };

  const startEdit = (f: Filament) => {
      setIsEditing(f.id);
      setIsAdding(false);
      setEditForm(f);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
      if (!filamentToDelete) return;
      try {
          await deleteFilament(filamentToDelete);
          setFilamentToDelete(null);
          refreshFilaments();
      } catch (e) {
          console.error(e);
          alert("Failed to delete filament.");
      }
  };

  const currency = (val: number) => '₱' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 mb-16 md:mb-0 space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Filament Inventory</h2>
          <p className="text-sm text-gray-500">Track spools, usage, and estimated remaining meters.</p>
        </div>
        <div className="flex gap-2">
            <button
              onClick={() => setShowMenuExport(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <ImageIcon size={20} />
              <span>Export Menu</span>
            </button>
            <button
              onClick={() => {
                if (isAdding || isEditing) {
                  setIsAdding(false);
                  setIsEditing(null);
                } else {
                  setIsAdding(true);
                }
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
            >
              {(isAdding || isEditing) ? <X size={20} /> : <Plus size={20} />}
              <span>{(isAdding || isEditing) ? 'Cancel' : 'Add Filament'}</span>
            </button>
        </div>
      </div>

      {(isAdding || isEditing) && (() => {
        const activeForm = isEditing ? editForm : addForm;
        const setFormValue = (key: string, val: any) => isEditing ? setEditForm(prev => ({ ...prev, [key]: val })) : setAddForm(prev => ({ ...prev, [key]: val }));

        return (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-100 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">{isEditing ? 'Edit Spool' : 'Add New Spool'}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Brand</label>
                      <input type="text" value={activeForm.brand || ''} onChange={e => setFormValue('brand', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white transition" placeholder="Polymaker" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Material</label>
                      <select value={activeForm.material || 'PLA'} onChange={e => setFormValue('material', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white transition">
                          {MATERIAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Color Name</label>
                      <input type="text" value={activeForm.color || ''} onChange={e => setFormValue('color', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white transition" placeholder="Teal" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Color HEX</label>
                      <div className="flex gap-2">
                          <input type="color" value={activeForm.colorHex || '#000000'} onChange={e => setFormValue('colorHex', e.target.value)} className="h-9 w-12 rounded border border-gray-200 cursor-pointer" />
                          <input type="text" value={activeForm.colorHex || '#000000'} onChange={e => setFormValue('colorHex', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 uppercase focus:bg-white transition" placeholder="#008080" />
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Special Property</label>
                      <select value={activeForm.specialProperty || 'Standard'} onChange={e => setFormValue('specialProperty', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white transition">
                          {SPECIAL_PROPERTIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                      <select value={activeForm.status || 'Dry'} onChange={e => setFormValue('status', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white transition">
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Diameter (mm)</label>
                      <input type="number" step="0.01" value={activeForm.diameter || ''} onChange={e => setFormValue('diameter', parseFloat(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white transition" placeholder="1.75" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Total Price (Bought)</label>
                      <input type="number" step="0.01" value={activeForm.purchasePrice || ''} onChange={e => setFormValue('purchasePrice', parseFloat(e.target.value))} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-blue-50 focus:bg-white transition" placeholder="900" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Initial Net Weight (g)</label>
                      <input type="number" step="1" value={activeForm.purchaseWeight || ''} onChange={e => setFormValue('purchaseWeight', parseFloat(e.target.value))} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-blue-50 focus:bg-white transition" placeholder="1000" title="Used with Total Price to auto-calculate Cost per Gram" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Override Cost/g (₱)</label>
                      <input type="number" step="0.01" value={activeForm.costPerGram || ''} onChange={e => setFormValue('costPerGram', parseFloat(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white transition" placeholder="0.90" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Transmission Distance (TD)</label>
                      <input type="text" value={activeForm.td || ''} onChange={e => setFormValue('td', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white transition" placeholder="3.5" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Spool Tare (g)</label>
                      <input type="number" value={activeForm.spoolTare || ''} onChange={e => setFormValue('spoolTare', parseFloat(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white transition" placeholder="250" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Current Gross (g)</label>
                      <input type="number" value={activeForm.currentGross || ''} onChange={e => setFormValue('currentGross', parseFloat(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white transition" placeholder="1000" />
                  </div>
              </div>
              <div className="flex justify-end pt-2 gap-2">
                  <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                      Cancel
                  </button>
                  <button onClick={isEditing ? handleSaveEdit : handleAdd} className="flex items-center space-x-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition">
                      <Save size={18} />
                      <span>{isEditing ? 'Save Changes' : 'Save Spool'}</span>
                  </button>
              </div>
          </div>
        );
      })()}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {filaments.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-4 border-b border-gray-100 gap-4 shrink-0">
              <div className="relative w-full sm:w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                 <input type="text" placeholder="Search brand, color..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                  <select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1 sm:flex-none bg-white">
                      <option value="All">All Materials</option>
                      {MATERIAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1 sm:flex-none bg-white">
                      <option value="All">All Statuses</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center p-12 text-gray-400">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        ) : filaments.length === 0 ? (
          <div className="text-center p-12 text-gray-500">
            <p>No filaments in inventory.</p>
            <p className="text-sm">Click "Add Filament" to start tracking.</p>
          </div>
        ) : processedFilaments.length === 0 ? (
          <div className="text-center p-12 text-gray-500">
            <p>No filaments match your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('brand')}>Brand {getSortIcon('brand')}</th>
                  <th className="p-4 font-medium cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('material')}>Material {getSortIcon('material')}</th>
                  <th className="p-4 font-medium cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('color')}>Color {getSortIcon('color')}</th>
                  <th className="p-4 font-medium cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('specialProperty')}>Special {getSortIcon('specialProperty')}</th>
                  <th className="p-4 font-medium text-right cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('costPerGram')}>Cost/g {getSortIcon('costPerGram')}</th>
                  <th className="p-4 font-medium text-right cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('currentGross')}>Current Gross {getSortIcon('currentGross')}</th>
                  <th className="p-4 font-medium text-right cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('remainingNet')}>Net Remaining {getSortIcon('remainingNet')}</th>
                  <th className="p-4 font-medium text-right cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('metersLeft')}>Meters left {getSortIcon('metersLeft')}</th>
                  <th className="p-4 font-medium cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {processedFilaments.map((f) => {
                  const remainingNet = f.remainingNet;
                  const metersLeft = f.metersLeft;
                  const isDepleted = remainingNet <= 0;

                  return (
                    <tr key={f.id} className={clsx("hover:bg-gray-50/50 transition", isEditing === f.id && "bg-brand-50/20")}>
                      <td className="p-4 py-3">
                        <div className="font-semibold text-gray-900">{f.brand}</div>
                        {f.td && <div className="text-xs text-gray-500">TD: {f.td}</div>}
                      </td>
                      <td className="p-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                           {f.material}
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">{f.diameter}mm</div>
                      </td>
                      <td className="p-4 py-3 text-gray-700">
                          <div className="flex items-center gap-3">
                              {f.colorHex && <div className={clsx("w-8 h-8 flex-shrink-0 rounded-full border-2 border-gray-200/60 shadow-sm", (f.specialProperty === 'Transparent' || f.specialProperty === 'Translucent') && "opacity-40")} style={{ backgroundColor: f.colorHex }} title={f.colorHex} />}
                              <span className="font-medium">{f.color}</span>
                          </div>
                      </td>
                      <td className="p-4 py-3">
                          {f.specialProperty && f.specialProperty !== 'Standard' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 uppercase tracking-wider">
                                  {f.specialProperty}
                              </span>
                          )}
                      </td>
                      <td className="p-4 py-3 text-right">
                          <div className="font-mono text-gray-700">{currency(f.costPerGram || 0)}</div>
                      </td>
                      <td className="p-4 py-3 text-right text-gray-700">
                          <div><span className="font-medium text-gray-900">{f.currentGross}</span> g</div>
                          <div className="text-xs text-gray-400" title="Spool Tare">({f.spoolTare}g spool)</div>
                      </td>
                      <td className="p-4 py-3 text-right">
                          <span className={clsx("font-bold text-base", isDepleted ? 'text-red-500' : 'text-gray-900')}>
                              {remainingNet} g
                          </span>
                      </td>
                      <td className="p-4 py-3 text-right text-gray-700 font-mono">
                          {metersLeft.toFixed(1)} m
                      </td>
                      <td className="p-4 py-3">
                          <span className={clsx(
                              "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
                              f.status === 'Dry' ? 'bg-green-100 text-green-800' :
                              f.status === 'Needs Drying' ? 'bg-yellow-100 text-yellow-800' :
                              f.status === 'Depleted' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                          )}>
                              {f.status}
                          </span>
                      </td>
                      <td className="p-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                           {onAddFilamentCost && (
                               <button 
                                 onClick={() => onAddFilamentCost(f.costPerGram)}
                                 className="text-white bg-brand-500 hover:bg-brand-600 px-2 py-1 rounded text-xs transition"
                                 title="Use cost in calculator"
                               >
                                   Use Cost
                               </button>
                           )}
                          <button
                            onClick={() => startEdit(f)}
                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setFilamentToDelete(f.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!filamentToDelete}
        title="Delete Filament"
        message="Are you sure you want to delete this filament from inventory? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setFilamentToDelete(null)}
      />

      {showMenuExport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center p-4 sm:p-8 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">Export Filament Menu</h3>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    const node = document.getElementById('filament-menu-export');
                    if (!node) return;
                    try {
                      const dataUrl = await htmlToImage.toPng(node, { quality: 1, backgroundColor: '#ffffff', pixelRatio: 2 });
                      const link = document.createElement('a');
                      link.download = 'Filament-Menu.png';
                      link.href = dataUrl;
                      link.click();
                    } catch (err) {
                      console.error('Export failed', err);
                      alert('Failed to export image. Make sure image generation is possible.');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex gap-2 items-center text-sm"
                >
                  <Download size={16} /> Export PNG
                </button>
                <button onClick={() => setShowMenuExport(false)} className="p-2 text-gray-500 hover:text-gray-900 rounded bg-gray-100 hover:bg-gray-200">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-8 bg-gray-100/50 overflow-x-auto flex justify-center flex-1">
              {/* This is the area getting captured */}
              <div id="filament-menu-export" className="bg-white p-12 shadow-sm rounded border max-w-[800px] min-w-[600px]">
                 <div className="mb-10 text-center">
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">Available Colors</h1>
                    <p className="text-gray-500 uppercase tracking-widest text-sm font-semibold">Premium 3D Printing Materials</p>
                 </div>
                 
                 <div className="space-y-12">
                     {['Vibrants (Warm)', 'Deep Tones (Cool)', 'Neutrals/Grayscale'].map(family => {
                         const familyFilaments = filaments.filter(f => f.status !== 'Depleted' && getColorFamily(f.colorHex) === family);
                         if (familyFilaments.length === 0) return null;
                         return (
                             <div key={family}>
                                 <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-6">{family}</h2>
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10">
                                    {familyFilaments.map(f => (
                                       <div key={f.id} className="flex gap-4 items-center">
                                          <div 
                                              className={clsx("w-16 h-16 rounded-full border-2 shadow-inner border-gray-100 flex-shrink-0", (f.specialProperty === 'Transparent' || f.specialProperty === 'Translucent') && "opacity-40")} 
                                              style={{ backgroundColor: f.colorHex || '#ddd' }}
                                          ></div>
                                          <div>
                                            <div className="text-xs text-brand-600 font-bold tracking-wider uppercase mb-0.5">{f.material}</div>
                                            <div className="font-bold text-gray-900 leading-tight mb-1">{f.color}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                                               <span>{f.brand}</span>
                                               <span className="text-[10px] text-gray-400 font-mono uppercase">({f.colorHex})</span>
                                               {f.specialProperty && f.specialProperty !== 'Standard' && (
                                                   <span className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                                                       {f.specialProperty}
                                                   </span>
                                               )}
                                            </div>
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
                 
                 {filaments.filter(f => f.status !== 'Depleted').length === 0 && (
                     <div className="text-center text-gray-400 py-10">No active filaments found.</div>
                 )}
                 
                 <div className="mt-16 pt-6 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                    <div>Menu generated on {new Date().toLocaleDateString()}</div>
                    <div>3D Print Command Center</div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
