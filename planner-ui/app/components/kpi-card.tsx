import React from 'react';

interface KPICardProps {
    title: string;
    value: string | number;
    change: string;
    isPositive: boolean;
    icon: string;
    accentColor: string;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, change, isPositive, icon, accentColor }) => {
    return (
        <div className="relative overflow-hidden bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 group">
            {/* Subtle accent glow */}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle, ${accentColor}12 0%, transparent 70%)` }}></div>

            <div className="flex items-start justify-between relative z-10">
                <div>
                    <h3 className="text-[0.7rem] font-semibold text-gray-400 uppercase tracking-widest mb-2">{title}</h3>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-2.5" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>{value}</div>
                    <div className={`inline-flex items-center gap-1 text-[0.7rem] font-semibold px-2 py-0.5 rounded-lg ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        <span>{isPositive ? '↗' : '↘'}</span>
                        <span>{change}</span>
                        <span className="text-gray-400 font-medium ml-0.5">vs yesterday</span>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform duration-300" style={{ background: `${accentColor}10` }}>
                    {icon}
                </div>
            </div>
        </div>
    );
};
