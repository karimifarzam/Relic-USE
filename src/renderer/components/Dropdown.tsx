import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface DropdownFieldProps {
  label: string;
  value: string;
  icon: React.ElementType;
  options: string[];
  onChange?: (value: string) => void;
  showCheckbox?: boolean;
  checkboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const DropdownField = ({
  label,
  value,
  icon: Icon,
  options,
  onChange,
  showCheckbox = false,
  checkboxChecked = false,
  onCheckboxChange,
  disabled = false,
}: DropdownFieldProps) => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option: string) => {
    onChange?.(option);
    setIsOpen(false);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onCheckboxChange?.(e.target.checked);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <label className={`text-[9px] uppercase tracking-industrial-wide font-mono font-bold ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`}>
          {label}
        </label>
        {showCheckbox && (
          <input
            type="checkbox"
            checked={checkboxChecked}
            onChange={handleCheckboxChange}
            className={`w-3.5 h-3.5 rounded border cursor-pointer ${isDark ? 'border-industrial-border bg-industrial-black-tertiary accent-industrial-orange' : 'border-gray-300 bg-white accent-blue-500'}`}
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg transition-all ${
          isDark
            ? 'bg-industrial-black-tertiary border-industrial-border'
            : 'bg-gray-50 border-gray-300'
        } ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover-lift'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
          <span className={`text-[11px] font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 ${isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'}`} strokeWidth={1.5} />
      </button>

      {isOpen && (
        <div className={`absolute w-full mt-1 border rounded-lg shadow-industrial-lg z-10 overflow-hidden ${isDark ? 'bg-industrial-black-secondary border-industrial-border' : 'bg-white border-gray-300'}`}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`w-full px-3 py-2 text-left text-[11px] font-mono transition-colors border-b last:border-b-0 ${
                isDark
                  ? 'text-white hover:bg-industrial-black-tertiary border-industrial-border-subtle'
                  : 'text-gray-900 hover:bg-gray-100 border-gray-200'
              }`}
              onClick={() => handleSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownField;
