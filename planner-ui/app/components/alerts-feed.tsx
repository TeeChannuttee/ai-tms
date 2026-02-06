import React from 'react';

interface AlertItem {
    id: string;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    time_ago: string;
}

interface AlertsFeedProps {
    alerts?: AlertItem[];
}

export const AlertsFeed: React.FC<AlertsFeedProps> = ({ alerts = [] }) => {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                Live Alerts
            </h3>
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[300px]">
                {alerts.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-10">No recent alerts</div>
                ) : (
                    alerts.map((alert) => (
                        <div key={alert.id} className="group p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden hover:shadow-sm"
                            style={{
                                background: alert.severity === 'high' ? '#fef2f2' : alert.severity === 'medium' ? '#fffbeb' : '#eff6ff',
                                borderColor: alert.severity === 'high' ? '#fecaca' : alert.severity === 'medium' ? '#fde68a' : '#bfdbfe',
                            }}>
                            <div className="absolute left-0 top-0 bottom-0 w-0.5"
                                style={{ background: alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#3b82f6' }}></div>
                            <div className="flex justify-between items-start mb-1 pl-3">
                                <span className="text-[0.65rem] font-bold uppercase tracking-widest"
                                    style={{ color: alert.severity === 'high' ? '#dc2626' : alert.severity === 'medium' ? '#d97706' : '#2563eb' }}>{alert.type}</span>
                                <span className="text-[0.65rem] text-gray-400 font-medium">{alert.time_ago}</span>
                            </div>
                            <p className="text-[0.8rem] text-gray-600 font-medium pl-3 leading-snug">
                                {alert.message}
                            </p>
                        </div>
                    ))
                )}
            </div>
            <button className="w-full mt-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-[0.7rem] font-semibold text-gray-500 hover:text-gray-700 transition-all uppercase tracking-widest border border-gray-100">
                View All Logs
            </button>
        </div>
    );
};
