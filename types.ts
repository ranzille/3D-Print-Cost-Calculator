
export interface Material {
  id: string;
  name: string;
  costPerKg: number;
}

export interface ExtraCost {
  id: string;
  name: string;
  price: number | string;
}

export interface CalculatorInputs {
  // Job Info
  jobName: string;
  owner?: string; // New: Job Owner
  batchQty: number | string;
  notes?: string; // New: Job specific notes
  
  // Material
  materialCost: number | string;
  materialGrams: number | string;
  wastageMultiplier: number | string; // New: Wastage factor (e.g. 1.05)
  
  // Time
  timeHours: number | string;
  timeMinutes: number | string;
  dryingHours: number | string; 
  dryingMinutes: number | string; 
  dryingTimeSameAsPrintTime: boolean; 
  
  // Extras
  extras: ExtraCost[];

  // Machine Overhead
  machineCost: number | string;
  lifespanHours: number | string;
  powerWatts: number | string;
  dryerPowerWatts: number | string;
  elecRate: number | string; // Cost per kWh

  // Labor
  laborRate: number | string; // Hourly
  laborMins: number | string; // Prep time per batch
  failMargin: number | string; // Percentage

  // Commercial
  // Shopee PH Specific Structure
  usePlatformFees: boolean; // Toggle for platform fees
  platformCommissionFee: number | string; // % on Item Price
  platformTransactionFee: number | string; // % on (Item + Shipping)
  platformServiceFee: number | string; // % on Item Price
  platformFixedFee: number | string; // Fixed amount

  taxRate: number | string; // Percentage (VAT)
  packagingCost: number | string; // Per Unit
  shippingCost: number | string; // Per Unit
  markup: number | string; // Percentage
}

export interface CostBreakdown {
  material: number;
  energy: number;
  depreciation: number;
  labor: number;
  extras: number;
  failureRisk: number;
  
  // Commercial
  packaging: number;
  shipping: number;
  tax: number;
  platformFeeAmount: number;
  
  // Totals
  productionCost: number; // Raw cost to make
  totalCostBasis: number; // Cost + Ops + Tax + Ship
  profit: number;
  finalPrice: number;
}

export interface CalculatedResults {
  unit: CostBreakdown;
  batch: CostBreakdown;
  // Metadata for Math View
  meta: {
    printHours: number;
    dryingHours: number;
    printerEnergyCost: number;
    dryerEnergyCost: number;
    billedGrams: number;
  }
}

export interface HistoryItem {
  id: string;
  date: string; // Legacy string date
  createdAt: number; // Timestamp
  updatedAt?: number; // Timestamp of last edit
  name: string;
  owner?: string; // New: Owner top-level
  inputs: CalculatorInputs;
  // Snapshot of calculations at the time of save to prevent logic drift
  resultsSnapshot?: CalculatedResults; 
  finalPrice: number;
  status?: 'pending' | 'completed'; // New Status field
}

export interface CapitalItem {
  id: string;
  name: string; // "Purchases" in xls
  price: number;
  quantity: number; // Quantity of items
  category: 'Printer' | 'Filament' | 'Parts' | 'Other';
  
  // New Spreadsheet Fields
  platform: string; // e.g. "Shopee", "Website"
  store: string;    // e.g. "Makerlab", "Yan Plasticware"
  purchaseDate: string;
  dateReceived?: string;
  orderedBy: string; // Initials (RB, BB)
  paidBy: string;    // Initials (RB, BB, Shared)
  receiptLink?: string;
  remarks?: string;
  
  createdAt: number; // For sorting
}

// --- NEW COMMERCE TYPES ---

export interface Product {
  id: string;
  name: string;
  owner?: string; // New: Product Owner
  sku?: string;
  category: string;
  price: number; // Selling Price (VAT Inc)
  cost: number;  // Cost Basis
  laborCost?: number; // New: Track labor portion
  energyCost?: number; // New: Track energy portion
  taxRate: number; // VAT Rate included in price
  stock: number;
  imageUrl?: string;
  createdAt: number;
}

export interface SaleItem {
  type: 'product' | 'job';
  refId: string; // ID of the Product or HistoryItem
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number; // Snapshot for profit calc
  laborCost?: number; // New: Snapshot
  energyCost?: number; // New: Snapshot
  taxRate: number; // Snapshot of VAT rate at time of sale
  itemOwner?: string; // New: Owner of the specific item/job
}

export interface Sale {
  id: string;
  orderId?: string; // New: Grouping ID for multi-item purchases
  items: SaleItem[];
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  paymentMethod: 'cash' | 'gcash' | 'card' | 'other';
  owner?: string; // New: Who made the sale
  timestamp: number;
  dateStr: string;
  shipping?: number;
}
