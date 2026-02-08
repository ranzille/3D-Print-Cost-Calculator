
import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  type?: 'danger' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, title, message, onConfirm, onCancel, 
  confirmText = "Confirm", type = 'danger' 
}) => {
  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={clsx("p-3 rounded-full flex-none", isDanger ? "bg-red-100 text-red-600" : "bg-brand-100 text-brand-600")}>
                {isDanger ? <AlertTriangle size={24} /> : <Info size={24} />}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>
        <div className="bg-gray-50 p-4 flex justify-end gap-3 border-t border-gray-100">
            <button 
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={onConfirm}
                className={clsx(
                    "px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm",
                    isDanger ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"
                )}
            >
                {confirmText}
            </button>
        </div>
      </div>
    </div>
  );
};
