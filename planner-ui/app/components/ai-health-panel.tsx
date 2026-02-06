import React, { useEffect, useState } from 'react';
import { modelMonitoringAPI } from '../../lib/api';

interface AIHealthPanelProps {
    className?: string;
}

interface ModelStatus {
    name: string;
    status: 'healthy' | 'degraded' | 'critical' | 'unknown';
    latency: number;
    drift: boolean;
}

export const AIHealthPanel: React.FC<AIHealthPanelProps> = ({ className }) => {
    const [models, setModels] = useState<ModelStatus[]>([
        { name: 'eta_predictor', status: 'unknown', latency: 0, drift: false },
        { name: 'service_time_predictor', status: 'unknown', latency: 0, drift: false },
    ]);

    useEffect(() => {
        const fetchHealth = async () => {
            const updatedModels = await Promise.all(models.map(async (model) => {
                try {
                    // Fetch latest metrics to get latency
                    const metrics = await modelMonitoringAPI.getMetrics(model.name, 1);
                    const latestMetric = metrics[0]; // Assuming sorted DESC

                    // Check drift status
                    const driftRes = await modelMonitoringAPI.checkDrift(model.name);

                    const latency = latestMetric ? latestMetric.metric_value : 0;
                    const isDrift = driftRes.drift_detected;

                    let status: ModelStatus['status'] = 'healthy';
                    if (isDrift) status = 'critical';
                    else if (latency > 500) status = 'degraded'; // Arbitrary threshold

                    return { ...model, status, latency, drift: isDrift };
                } catch (e) {
                    console.error(`Failed to fetch health for ${model.name}`, e);
                    return { ...model, status: 'unknown' as const };
                }
            }));
            setModels(updatedModels);
        };

        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div 
            className={`bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] ${className}`}
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg relative" style={{ background: '#eff6ff' }}>
                    🧠
                </div>
                <div>
                    <h3 className="text-base font-bold text-gray-900 tracking-tight">
                        AI System Health
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-[0.65rem] text-emerald-600 font-semibold uppercase tracking-widest">Auto-refresh 30s</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {models.map((model) => (
                    <div 
                        key={model.name} 
                        className="p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                        style={{
                            background: 'white',
                            borderColor: '#f0f0f0',
                        }}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                                <div 
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        model.status === 'healthy' 
                                            ? 'bg-emerald-500' 
                                            : model.status === 'degraded' 
                                            ? 'bg-amber-500' 
                                            : model.status === 'critical' 
                                            ? 'bg-red-500' 
                                            : 'bg-gray-300'
                                    }`}
                                    style={{
                                        animation: (model.status === 'healthy' || model.status === 'critical') ? 'pulse 1.5s infinite' : 'none'
                                    }}
                                />
                                <span className="font-bold text-[0.82rem] text-gray-800 capitalize">
                                    {model.name.replace(/_/g, ' ')}
                                </span>
                            </div>
                            
                            {model.drift && (
                                <span className="text-[0.6rem] font-semibold uppercase text-red-600">
                                    DRIFT
                                </span>
                            )}
                            {!model.drift && model.status === 'healthy' && (
                                <span className="text-[0.6rem] font-semibold uppercase" style={{ color: '#16a34a' }}>
                                    Stable
                                </span>
                            )}
                            {!model.drift && model.status === 'degraded' && (
                                <span className="text-[0.6rem] font-semibold uppercase text-amber-600">
                                    Slow
                                </span>
                            )}
                        </div>
                        <p className="text-[0.7rem] text-gray-400 mb-2 pl-3.5">
                            Latency: <span className="font-mono text-gray-600">{model.latency.toFixed(0)}ms</span>
                        </p>
                        
                        {/* Status bar */}
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{
                                    width: model.status === 'healthy' ? '100%' : model.status === 'degraded' ? '60%' : model.status === 'critical' ? '30%' : '0%',
                                    background: model.status === 'healthy' ? '#10b981' : model.status === 'degraded' ? '#f59e0b' : model.status === 'critical' ? '#ef4444' : '#e5e7eb'
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
};