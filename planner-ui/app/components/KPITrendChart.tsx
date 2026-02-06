import React from 'react';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface KPITrendChartProps {
    title: string;
    data: any[];
    dataKey: string;
    color: string;
    description?: string;
}

export const KPITrendChart = ({ title, data, dataKey, color, description }: KPITrendChartProps) => {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 h-full flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
            {description && <p className="text-gray-500 text-xs font-semibold mb-5">{description}</p>}

            <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ 
                                backgroundColor: '#ffffff', 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                            itemStyle={{ color: '#1f2937', fontWeight: 600 }}
                            formatter={(value: number) => [value.toFixed(1), 'Value']}
                        />
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#color-${dataKey})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};