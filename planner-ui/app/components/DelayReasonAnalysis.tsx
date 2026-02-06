import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DelayReasonAnalysisProps {
    data: { reason: string; count: number; aiInsight: string }[];
}

export const DelayReasonAnalysis = ({ data }: DelayReasonAnalysisProps) => {
    // Top reason for insight highlight
    const topReason = data.reduce((max, curr) => curr.count > max.count ? curr : max, data[0]);

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 h-full shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">AI Delay Analysis</h3>
                    <p className="text-gray-500 text-xs font-semibold">Root cause classification by AI Model</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🤖</span>
                        <span className="text-[0.65rem] font-bold text-indigo-700 uppercase tracking-wider">AI Insight</span>
                    </div>
                    <p className="text-[0.75rem] text-gray-700 leading-snug font-medium">
                        {topReason ? `"${topReason.reason}" is the leading cause (${Math.round((topReason.count / data.reduce((a, b) => a + b.count, 0)) * 100)}%). ${topReason.aiInsight}` : 'No data available.'}
                    </p>
                </div>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} hide />
                        <YAxis 
                            dataKey="reason" 
                            type="category" 
                            stroke="#6b7280" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false} 
                            width={100} 
                        />
                        <Tooltip
                            cursor={{ fill: '#f9fafb' }}
                            contentStyle={{ 
                                backgroundColor: '#ffffff', 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                            itemStyle={{ color: '#1f2937', fontWeight: 600 }}
                        />
                        <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={28}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#9ca3af'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};