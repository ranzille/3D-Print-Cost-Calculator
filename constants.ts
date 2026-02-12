
import { CalculatorInputs } from './types';

export const OWNERS = ['Baz', 'Ranz', 'Shared'];

export const DEFAULT_INPUTS: CalculatorInputs = {
  jobName: '',
  owner: 'Baz',
  batchQty: 1,
  notes: '',
  materialCost: 850,
  materialGrams: 0,
  wastageMultiplier: 1.05,
  timeHours: 0,
  timeMinutes: 0,
  dryingHours: 0,
  dryingMinutes: 0,
  dryingTimeSameAsPrintTime: false,
  extras: [],
  machineCost: 20000,
  lifespanHours: 3000,
  powerWatts: 150,
  dryerPowerWatts: 48,
  elecRate: 12,
  laborRate: 100,
  laborMins: 15,
  failMargin: 10,
  
  // Shopee PH Defaults (2025)
  usePlatformFees: true,
  platformCommissionFee: 7.24,
  platformTransactionFee: 2.24,
  platformServiceFee: 0,
  platformFixedFee: 0,

  taxRate: 12, // Default PH VAT
  packagingCost: 15,
  shippingCost: 0,
  markup: 50,
};

export const COLORS = {
  material: '#3b82f6', // blue-500
  labor: '#a855f7', // purple-500
  energy: '#eab308', // yellow-500
  profit: '#00AE42', // brand-600
  overhead: '#64748b', // slate-500
};
