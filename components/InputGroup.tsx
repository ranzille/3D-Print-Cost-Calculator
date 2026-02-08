import React from 'react';
import clsx from 'clsx';

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  prefix?: string;
  suffix?: string;
  hint?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({ 
  label, prefix, suffix, hint, className, ...props 
}) => {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-gray-400 text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          {...props}
          className={clsx(
            "w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 transition-all",
            prefix && "pl-8",
            suffix && "pr-10",
            className
          )}
        />
        {suffix && (
          <span className="absolute right-3 text-gray-400 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
};