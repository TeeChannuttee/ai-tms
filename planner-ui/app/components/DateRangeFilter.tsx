import React from 'react';

interface DateRangeFilterProps {
    value: string;
    onChange: (value: string) => void;
}

export const DateRangeFilter = ({ value, onChange }: DateRangeFilterProps) => {
    const options = [
        { label: 'Last 7 Days', value: '7d' },
        { label: 'This Month', value: 'this_month' },
        { label: 'Q1 2026', value: 'q1_26' },
        { label: 'Year to Day', value: 'ytd' },
    ];

    return (
        <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1 gap-1">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        value === opt.value
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};