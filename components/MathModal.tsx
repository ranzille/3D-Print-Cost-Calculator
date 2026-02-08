
import React from 'react';
import { X, Calculator } from 'lucide-react';
import { CalculatedResults, CalculatorInputs } from '../types';

interface MathModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: CalculatorInputs;
  results: CalculatedResults;
  currency: (val: number) => string;
}

export const MathModal: React.FC<MathModalProps> = ({ isOpen, onClose, inputs, results, currency }) => {
  if (!isOpen) return null;

  const toNumber = (val: number | string | undefined) => parseFloat(String(val || 0));
  
  // Inputs
  const materialCost = toNumber(inputs.materialCost);
  const grams = toNumber(inputs.materialGrams);
  
  const powerWatts = toNumber(inputs.powerWatts);
  const dryerWatts = toNumber(inputs.dryerPowerWatts);
  const rate = toNumber(inputs.elecRate);
  const printHours = results.meta.printHours;
  const dryingHours = results.meta.dryingHours;

  const machineCost = toNumber(inputs.machineCost);
  const lifespan = toNumber(inputs.lifespanHours);
  
  const laborRate = toNumber(inputs.laborRate);
  const laborMins = toNumber(inputs.laborMins);

  const failMargin = toNumber(inputs.failMargin);
  
  const markup = toNumber(inputs.markup);
  const taxRate = toNumber(inputs.taxRate);

  // Fee Inputs
  const useFees = inputs.usePlatformFees !== false;
  const commRate = useFees ? toNumber(inputs.platformCommissionFee) : 0;
  const transRate = useFees ? toNumber(inputs.platformTransactionFee) : 0;
  const svcRate = useFees ? toNumber(inputs.platformServiceFee) : 0;
  const fixedFee = useFees ? toNumber(inputs.platformFixedFee) : 0;

  // Batch Values for display
  const b = results.batch;
  
  // Helper for OpCost
  const opCost = b.productionCost + b.packaging;
  const targetNetAsk = opCost + b.profit;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 text-brand-600">
            <Calculator size={20} />
            <h2 className="text-lg font-bold text-gray-900">Cost Breakdown (Batch)</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 text-sm text-gray-700">
            
            {/* 1. Production Costs */}
            <Section title="A. Production Costs" total={currency(b.productionCost)}>
                
                <Item label="1. Material">
                    <Formula text="(Cost per kg / 1000) × Grams" />
                    <Calculation 
                        values={`(${currency(materialCost)} / 1000) × ${grams}g`} 
                        result={currency(b.material)} 
                    />
                </Item>

                <Item label="2. Energy (Printer + Dryer)">
                    <Formula text="((Watts / 1000) × Hours × Rate) + Dryer" />
                    <Calculation 
                        values={`P: (${powerWatts}W/1k × ${printHours.toFixed(2)}h × ${currency(rate)}) + D: (${dryerWatts}W/1k × ${dryingHours.toFixed(2)}h × ${currency(rate)})`} 
                        result={currency(b.energy)} 
                    />
                </Item>

                <Item label="3. Depreciation">
                    <Formula text="(Machine Cost / Lifespan) × Print Hours" />
                    <Calculation 
                        values={`(${currency(machineCost)} / ${lifespan}h) × ${printHours.toFixed(2)}h`} 
                        result={currency(b.depreciation)} 
                    />
                </Item>

                <Item label="4. Labor">
                    <Formula text="(Hourly Rate / 60) × Prep Minutes" />
                    <Calculation 
                        values={`(${currency(laborRate)} / 60) × ${laborMins}m`} 
                        result={currency(b.labor)} 
                    />
                </Item>

                <Item label="5. Extras">
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 text-xs">
                       <span>Hardware & Misc Items</span>
                       <span className="font-bold">{currency(b.extras)}</span>
                    </div>
                </Item>

                <Item label="6. Failure Margin">
                    <Formula text="(Sum of above) × Margin %" />
                    <Calculation 
                        values={`${currency(b.productionCost - b.failureRisk)} × ${failMargin}%`} 
                        result={currency(b.failureRisk)} 
                    />
                </Item>
            </Section>

            {/* 2. Commercial Costs */}
            <Section title="B. Commercial Costs (Pass-through / Ops)" total={currency(b.packaging + b.shipping)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SimpleCalc label="Packaging (Ops)" formula="Cost × Qty" val={currency(b.packaging)} />
                    <SimpleCalc label="Shipping (Pass-through)" formula="Cost × Qty" val={currency(b.shipping)} />
                </div>
            </Section>

            {/* 3. Pricing Logic */}
            <Section title={useFees ? "C. Pricing Strategy (Shopee Uplift + VAT)" : "C. Pricing Strategy (Direct Sale + VAT)"}>
                 
                 <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-4">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-blue-800">Operational Cost Base</span>
                        <span className="text-xs font-bold text-blue-800">{currency(opCost)}</span>
                     </div>
                     <p className="text-[10px] text-blue-600">Production Cost + Packaging</p>
                 </div>

                 <Item label="1. Profit Markup (On Operations Only)">
                    <Formula text="Op. Cost × Markup %" />
                    <Calculation 
                        values={`${currency(opCost)} × ${markup}%`} 
                        result={currency(b.profit)} 
                    />
                 </Item>

                 <div className="flex justify-between items-center py-2 border-t border-gray-100">
                    <span className="font-bold text-gray-600">Target Net Ask (Wallet)</span>
                    <span className="font-bold text-gray-900">{currency(targetNetAsk)}</span>
                 </div>
                 
                 <p className="text-[10px] text-gray-400 mb-4">* The amount you want to receive before Shipping deductions.</p>

                 {useFees ? (
                    <>
                        <Item label="2. Shopee + VAT Formula">
                            <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                                Calculates price required to cover <b>Fees</b> and <b>VAT ({taxRate}%)</b>. 
                                VAT is removed from the Gross Price first.
                            </p>
                            <Formula text="(Target + Fixed + Ship*Trans%) / (1/(1+VAT) - Comm% - Svc% - Trans%)" />
                            <Calculation 
                                values={`Numerator / (1/${1 + taxRate/100} - ${(commRate+svcRate+transRate)/100})`} 
                                result={currency(b.finalPrice)} 
                            />
                        </Item>

                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mt-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-orange-800">Total Deductions (Fees + Tax)</span>
                                <span className="text-xs font-bold text-orange-800">{currency(b.platformFeeAmount + b.tax)}</span>
                            </div>
                            <div className="space-y-1 mt-2 border-t border-orange-200/50 pt-2">
                                <SubFee label={`VAT (${taxRate}%)`} val={b.tax} currency={currency} />
                                <SubFee label={`Commission (${commRate}%)`} val={b.finalPrice * (commRate/100)} currency={currency} />
                                <SubFee label={`Service (${svcRate}%)`} val={b.finalPrice * (svcRate/100)} currency={currency} />
                                <SubFee label={`Transaction (${transRate}%)`} val={(b.finalPrice + b.shipping) * (transRate/100)} currency={currency} />
                                <SubFee label={`Fixed Fee`} val={fixedFee * (inputs.batchQty as number || 1)} currency={currency} />
                            </div>
                        </div>
                    </>
                 ) : (
                    <>
                         <Item label="2. Direct Sale + VAT Formula">
                            <Formula text="Target / (1 / (1 + VAT))" />
                             <Calculation 
                                values={`${currency(targetNetAsk)} / (1 / 1.${taxRate})`} 
                                result={currency(b.finalPrice)} 
                            />
                         </Item>
                         <div className="bg-green-50 p-3 rounded-lg border border-green-100 mt-2 flex justify-between items-center">
                            <span className="text-xs font-bold text-green-800">Final List Price (Inc. Tax)</span>
                            <span className="text-sm font-bold text-green-800">{currency(b.finalPrice)}</span>
                         </div>
                    </>
                 )}
            </Section>

            {/* Final */}
            <div className="bg-brand-50 border border-brand-200 p-4 rounded-xl flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-brand-900">Final List Price</h3>
                    <p className="text-xs text-brand-600">{useFees ? 'Shopee listing price' : 'Direct sale price'}</p>
                </div>
                <div className="text-3xl font-black text-brand-600">{currency(b.finalPrice)}</div>
            </div>

            {/* Break Even */}
            <div className="text-center">
                 <p className="text-[10px] text-gray-400 uppercase tracking-widest">Break-Even Point</p>
                 <p className="text-xs font-bold text-gray-500">{currency(b.totalCostBasis)}</p>
                 <p className="text-[9px] text-gray-400">(Op. Costs + Shipping + Tax + {useFees ? 'Fees' : 'Overheads'})</p>
            </div>

        </div>
      </div>
    </div>
  );
};

const Section = ({ title, total, children }: any) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">{title}</h3>
            {total && <span className="font-bold text-gray-900">{total}</span>}
        </div>
        <div className="space-y-4 pl-2">
            {children}
        </div>
    </div>
);

const Item = ({ label, children }: any) => (
    <div>
        <h4 className="text-xs font-bold text-gray-700 mb-1">{label}</h4>
        {children}
    </div>
);

const SimpleCalc = ({ label, formula, val }: any) => (
    <div className="bg-gray-50 p-3 rounded border border-gray-100">
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className="text-[10px] text-gray-400 mb-1">{formula}</div>
        <div className="font-bold text-gray-900">{val}</div>
    </div>
);

const SubFee = ({ label, val, currency }: any) => (
    <div className="flex justify-between text-[10px] text-orange-700/80">
        <span>{label}</span>
        <span>{currency(val)}</span>
    </div>
);

const Formula = ({ text }: any) => (
    <div className="text-[10px] text-gray-400 font-mono mb-1 bg-gray-50 inline-block px-1.5 py-0.5 rounded border border-gray-100">
        {text}
    </div>
);

const Calculation = ({ values, result }: any) => (
    <div className="flex text-xs bg-blue-50/50 p-2 rounded border border-blue-100 items-center justify-between">
        <span className="font-mono text-blue-800">{values}</span>
        <span className="font-bold text-blue-700">= {result}</span>
    </div>
);
