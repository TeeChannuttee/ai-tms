import React from 'react'

interface RouteTimelineProps {
    id: string;
    vehicleName: string;
    driverName: string;
    progress: number; // 0-100
    isDelayed: boolean;
    stops: Array<{ time: string, status: 'done' | 'current' | 'pending', label: string }>;
    onAction: (action: 'message' | 'reassign' | 'details') => void;
}

export default function RouteTimeline({ vehicleName, driverName, progress, isDelayed, stops, onAction }: RouteTimelineProps) {
    return (
        <div className="group border border-gray-100 bg-white rounded-xl p-4 transition-all hover:shadow-md hover:border-indigo-100">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-colors"
                        style={{ background: isDelayed ? '#fef2f2' : '#f5f3ff' }}>
                        {isDelayed ? '⚠' : '🚚'}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">{vehicleName}</h3>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">Driver: {driverName}</p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide"
                        style={{
                            background: isDelayed ? '#fef2f2' : '#ecfdf5',
                            color: isDelayed ? '#dc2626' : '#16a34a',
                        }}>
                        {isDelayed ? 'Delayed +15m' : 'On Time'}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onAction('message')} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">💬</button>
                        <button onClick={() => onAction('reassign')} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">🔄</button>
                    </div>
                </div>
            </div>

            {/* Timeline Progress */}
            <div className="relative h-14 bg-gray-50 border border-gray-100 rounded-xl flex items-center px-3 mb-2 overflow-visible">
                {/* Progress Bar */}
                <div className="absolute left-0 top-0 bottom-0 rounded-xl overflow-hidden pointer-events-none" style={{ width: `${progress}%` }}>
                    <div className="h-full rounded-xl opacity-20" style={{
                        background: isDelayed ? '#ef4444' : '#4f46e5'
                    }}></div>
                </div>

                {/* Progress Marker Line */}
                <div className="absolute top-0 bottom-0 w-0.5 z-0" style={{
                    left: `${progress}%`,
                    background: isDelayed ? '#ef4444' : '#4f46e5',
                    opacity: 0.6
                }}></div>

                {/* Stops */}
                <div className="w-full flex justify-between items-center relative z-10 px-2">
                    {stops.map((stop, i) => (
                        <div key={i} className="flex flex-col items-center group/stop relative cursor-pointer">
                            {/* Dot */}
                            <div className="w-3 h-3 rounded-full border-2 transition-all relative z-10 hover:scale-125"
                                style={{
                                    borderColor: stop.status === 'done' ? '#10b981' : stop.status === 'current' ? '#3b82f6' : '#d1d5db',
                                    background: stop.status === 'done' ? '#10b981' : stop.status === 'current' ? 'white' : 'white',
                                }}>
                                {stop.status === 'current' && <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-50"></div>}
                            </div>

                            {/* Label */}
                            <div className="absolute top-5 text-[0.6rem] text-gray-400 font-medium whitespace-nowrap opacity-0 group-hover/stop:opacity-100 transition-opacity">
                                {stop.time}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-between text-[0.65rem] text-gray-400 px-1">
                <span>Start</span>
                <span>{progress}% Completed</span>
                <span>End</span>
            </div>
        </div>
    )
}
