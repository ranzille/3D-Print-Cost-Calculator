
import { CalculatorInputs } from '../types';
import { DEFAULT_INPUTS } from '../constants';

const SETTINGS_KEY = 'bambuCalc_Settings';
const USER_DEFAULTS_KEY = 'bambuCalc_UserDefaults';

// Fields we want to remember
const PERSISTENT_FIELDS: (keyof CalculatorInputs)[] = [
  'owner',
  'materialCost',
  'wastageMultiplier',
  'machineCost',
  'lifespanHours',
  'powerWatts',
  'dryerPowerWatts', 
  'elecRate',
  'laborRate',
  'laborMins',
  'failMargin',
  // New Fee Structure
  'usePlatformFees',
  'platformCommissionFee',
  'platformTransactionFee',
  'platformServiceFee',
  'platformFixedFee',
  
  'taxRate',
  'packagingCost',
  'shippingCost',
  'markup'
];

export const loadSettings = (): Partial<CalculatorInputs> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return {};
    return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load settings", e);
    return {};
  }
};

export const saveSettings = (inputs: CalculatorInputs) => {
  if (typeof window === 'undefined') return;

  const settingsToSave: Partial<CalculatorInputs> = {};
  
  PERSISTENT_FIELDS.forEach(field => {
    // @ts-ignore
    settingsToSave[field] = inputs[field];
  });

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));
};

export const saveUserDefaults = (inputs: CalculatorInputs) => {
  if (typeof window === 'undefined') return;

  const defaultsToSave: Partial<CalculatorInputs> = {};
  
  PERSISTENT_FIELDS.forEach(field => {
    // @ts-ignore
    defaultsToSave[field] = inputs[field];
  });

  localStorage.setItem(USER_DEFAULTS_KEY, JSON.stringify(defaultsToSave));
};

export const loadUserDefaults = (): Partial<CalculatorInputs> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(USER_DEFAULTS_KEY);
    if (!saved) return {};
    return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load user defaults", e);
    return {};
  }
};

export const mergeWithDefaults = (saved: Partial<CalculatorInputs>): CalculatorInputs => {
  const userDefaults = loadUserDefaults();
  return {
    ...DEFAULT_INPUTS,
    ...userDefaults,
    ...saved,
    // Ensure transient fields are reset
    jobName: '',
    batchQty: 1,
    notes: '', 
    materialGrams: 0,
    timeHours: 0,
    timeMinutes: 0,
    dryingHours: 0,
    dryingMinutes: 0,
    dryingTimeSameAsPrintTime: false,
    extras: [] 
  };
};
