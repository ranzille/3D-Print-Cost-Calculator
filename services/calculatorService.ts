
import { CalculatorInputs, CalculatedResults, CostBreakdown } from '../types';

const toNumber = (val: number | string | undefined): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

export const calculateCosts = (inputs: CalculatorInputs): CalculatedResults => {
  const qty = Math.max(1, toNumber(inputs.batchQty));
  
  // 1. Base Variable Costs (Total Batch)
  const rawGrams = toNumber(inputs.materialGrams);
  const billedGrams = rawGrams; 

  const totalMatCost = (toNumber(inputs.materialCost) / 1000) * billedGrams;
  
  const printHours = toNumber(inputs.timeHours) + (toNumber(inputs.timeMinutes) / 60);
  
  // Energy
  const printerEnergy = (toNumber(inputs.powerWatts) / 1000) * printHours * toNumber(inputs.elecRate);
  
  let dryingDuration = 0;
  if (inputs.dryingTimeSameAsPrintTime) {
      dryingDuration = printHours;
  } else {
      dryingDuration = toNumber(inputs.dryingHours) + (toNumber(inputs.dryingMinutes) / 60);
  }
  const dryerEnergy = (toNumber(inputs.dryerPowerWatts) / 1000) * dryingDuration * toNumber(inputs.elecRate);
  
  const totalEnergy = printerEnergy + dryerEnergy;
  
  // Depreciation
  const lifespan = toNumber(inputs.lifespanHours);
  const totalDepreciation = lifespan > 0 
    ? (toNumber(inputs.machineCost) / lifespan) * printHours 
    : 0;

  // Labor
  const totalLabor = (toNumber(inputs.laborRate) / 60) * toNumber(inputs.laborMins);

  // Extras
  const totalExtras = inputs.extras.reduce((acc, curr) => acc + toNumber(curr.price), 0);

  // Subtotal & Failure
  const subtotalProduction = totalMatCost + totalEnergy + totalDepreciation + totalLabor + totalExtras;
  const totalFailure = subtotalProduction * (toNumber(inputs.failMargin) / 100);
  
  const totalProductionCost = subtotalProduction + totalFailure;

  // --- Commercial Logic (Shopee Reverse Formula with VAT Inclusive) ---
  const unitProductionCost = totalProductionCost / qty;
  const unitPackaging = toNumber(inputs.packagingCost);
  const unitShipping = toNumber(inputs.shippingCost);
  
  // Step A: Operational Base (Production + Packaging)
  const unitOpCost = unitProductionCost + unitPackaging;

  // Step B: Profit (Markup on OpCost only)
  const unitProfit = unitOpCost * (toNumber(inputs.markup) / 100);

  // Target Net Ask: The amount we MUST receive in wallet to cover costs + profit
  const targetNetAsk = unitOpCost + unitProfit;

  // Step C: Solve for Listing Price (P)
  // Logic: P must cover Fees + Tax (VAT) + TargetNetAsk.
  // VAT is included in P (e.g., P is Gross Price). 
  // VAT Amount = P - (P / (1 + TaxRate))
  
  const useFees = inputs.usePlatformFees !== false; 
  const commRate = useFees ? toNumber(inputs.platformCommissionFee) / 100 : 0;
  const transRate = useFees ? toNumber(inputs.platformTransactionFee) / 100 : 0;
  const svcRate = useFees ? toNumber(inputs.platformServiceFee) / 100 : 0;
  const fixedFee = useFees ? toNumber(inputs.platformFixedFee) : 0;
  
  const taxRate = toNumber(inputs.taxRate) / 100;

  // Fees = P(Comm + Svc + Trans) + S(Trans) + Fixed
  // Tax = P(1 - 1/(1+TaxRate))
  // P - Fees - Tax = TargetNetAsk
  
  // Algebra:
  // P - P(Comm+Svc+Trans) - P(1 - 1/(1+TaxRate)) = TargetNetAsk + Fixed + S(Trans)
  // P * [ 1 - (Comm+Svc+Trans) - (1 - 1/(1+TaxRate)) ] = TargetNetAsk + Fixed + S(Trans)
  // P * [ 1/(1+TaxRate) - (Comm+Svc+Trans) ] = TargetNetAsk + Fixed + S(Trans)
  
  const sumFeeRates = commRate + svcRate + transRate;
  const taxFactor = 1 / (1 + taxRate);
  
  const numerator = targetNetAsk + fixedFee + (unitShipping * transRate);
  const denominator = taxFactor - sumFeeRates;

  let unitFinalPrice = 0;
  if (denominator > 0) {
      unitFinalPrice = numerator / denominator;
  } else {
      unitFinalPrice = 0; // Margin squeezed too tight (or negative)
  }

  // Calculate actual amounts for display based on the solved Price
  // 1. VAT Component
  const unitTax = unitFinalPrice - (unitFinalPrice / (1 + taxRate));

  // 2. Platform Fees
  const totalDeductions = (unitFinalPrice * commRate) + 
                          (unitFinalPrice * svcRate) + 
                          ((unitFinalPrice + unitShipping) * transRate) + 
                          fixedFee;

  // Total Cost Basis (Break even point)
  // OpCost + All Fees + Tax + Shipping
  const unitTotalCostBasis = unitOpCost + totalDeductions + unitTax + unitShipping;

  // --- Construct Unit Result ---
  const unitResult: CostBreakdown = {
    material: totalMatCost / qty,
    energy: totalEnergy / qty,
    depreciation: totalDepreciation / qty,
    labor: totalLabor / qty,
    extras: totalExtras / qty,
    failureRisk: totalFailure / qty,
    productionCost: unitProductionCost,
    packaging: unitPackaging,
    shipping: unitShipping,
    tax: unitTax,
    platformFeeAmount: totalDeductions,
    totalCostBasis: unitTotalCostBasis,
    profit: unitProfit,
    finalPrice: unitFinalPrice
  };

  // --- Construct Batch Result ---
  const batchResult: CostBreakdown = {
    material: totalMatCost,
    energy: totalEnergy,
    depreciation: totalDepreciation,
    labor: totalLabor,
    extras: totalExtras,
    failureRisk: totalFailure,
    productionCost: totalProductionCost,
    packaging: unitPackaging * qty,
    shipping: unitShipping * qty,
    tax: unitTax * qty,
    platformFeeAmount: totalDeductions * qty,
    totalCostBasis: unitTotalCostBasis * qty,
    profit: unitProfit * qty,
    finalPrice: unitFinalPrice * qty
  };

  return { 
      unit: unitResult, 
      batch: batchResult,
      meta: {
          printHours: printHours,
          dryingHours: dryingDuration,
          printerEnergyCost: printerEnergy,
          dryerEnergyCost: dryerEnergy,
          billedGrams: billedGrams
      }
  };
};
