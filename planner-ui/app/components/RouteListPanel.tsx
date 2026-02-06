import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface RouteStop {
    id: string; // Unique ID for DnD (e.g. "stop-1")
    orderId: string;
    customerName: string;
    address: string;
    arrivalTime: string;
    serviceTime: number; // minutes
    lateRisk: boolean; // From AI
}

export interface PlannerRoute {
    id: string;
    vehicleName: string;
    vehicleStatus: 'Active' | 'Idle' | 'Maintenance';
    driverId?: string | null;
    driverName?: string | null;
    stops: RouteStop[];
    totalDistance: number;
    totalDuration: number;
}

interface Driver {
    id: string;
    name: string;
}

interface RouteListPanelProps {
    routes: PlannerRoute[];
    activeRouteId: string | null;
    drivers?: Driver[];
    onRouteSelect: (id: string) => void;
    onAddRoute?: () => void;
    onAssignDriver?: (routeId: string, driverId: string) => void;
    onDelete?: (routeId: string) => void;
    onEdit?: (route: PlannerRoute) => void;
}

const SortableStopItem = ({ stop, routeId }: { stop: RouteStop; routeId: string }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: stop.id, data: { type: 'ROUTE_STOP', stop, routeId } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}
            className={`relative pl-8 pr-3 py-2.5 bg-white border border-gray-100 rounded-lg mb-1.5 shadow-sm hover:border-indigo-300 group ${stop.lateRisk ? 'border-l-4 border-l-red-500' : ''}`}>
            {/* Connector Line */}
            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-100 -z-10 group-first:top-1/2 group-last:bottom-1/2"></div>
            {/* Dot */}
            <div className={`absolute left-[11px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 border-2 border-white ${stop.lateRisk ? 'bg-red-500 shadow-red-200' : 'bg-indigo-500 shadow-indigo-200'} shadow-sm`}></div>

            <div className="flex justify-between items-start">
                <div>
                    <div className="font-semibold text-gray-800 text-xs">{stop.customerName}</div>
                    <div className="text-[0.65rem] text-gray-400 truncate max-w-[180px]">{stop.address}</div>
                </div>
                <div className="text-right">
                    <div className={`text-[0.65rem] font-mono font-semibold ${stop.lateRisk ? 'text-red-600' : 'text-gray-600'}`}>{stop.arrivalTime}</div>
                    <div className="text-[0.6rem] text-gray-400">{stop.serviceTime} นาที</div>
                </div>
            </div>
            {stop.lateRisk && (
                <div className="mt-1 flex items-center gap-1">
                    <span className="text-[0.6rem] text-red-600 font-bold bg-red-50 px-1.5 rounded">⚠ เสี่ยงล่าช้า</span>
                </div>
            )}
        </div>
    );
};

const RouteCard = ({ route, isActive, onClick, drivers, onAssignDriver, onDelete, onEdit }: {
    route: PlannerRoute,
    isActive: boolean,
    onClick: () => void,
    drivers?: Driver[],
    onAssignDriver?: (routeId: string, driverId: string) => void,
    onDelete?: (routeId: string) => void,
    onEdit?: (route: PlannerRoute) => void
}) => {
    const { setNodeRef } = useDroppable({
        id: `route-${route.id}`,
        data: { type: 'ROUTE', routeId: route.id }
    });

    return (
        <div
            ref={setNodeRef}
            className={`border rounded-xl mb-4 transition-all overflow-hidden ${isActive ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-100' : 'bg-white border-gray-200'}`}
        >
            {/* Header */}
            <div className="p-3 bg-white border-b border-gray-100">
                <div className="flex justify-between items-center cursor-pointer" onClick={onClick}>
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${route.vehicleStatus === 'Active' ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                        <div>
                            <div className="font-bold text-sm text-gray-800">{route.vehicleName}</div>
                            <div className="text-[0.65rem] text-gray-400 font-medium">{route.totalDistance} กม. • {Math.round(route.totalDuration / 60)} ชม. {route.totalDuration % 60} น.</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                            {route.stops.length} จุดส่ง
                        </div>
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(route); }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="แก้ไขเส้นทาง"
                            >
                                ✏️
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); if (confirm('คุณแน่ใจหรือไม่ที่จะลบเส้นทางนี้?')) onDelete(route.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="ลบเส้นทาง"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>

                {/* Driver Selector - Visible when Active */}
                {isActive && (
                    <div className="mt-3 pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                            <span className="text-[0.65rem] font-bold text-gray-400 uppercase">คนขับ:</span>
                            <select
                                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                value={route.driverId || ''}
                                onChange={(e) => onAssignDriver && onAssignDriver(route.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <option value="">-- ไม่ระบุ --</option>
                                {drivers?.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Stops List (Sortable) */}
            {isActive && (
                <div className="p-2 bg-gray-50/50 min-h-[50px]">
                    <SortableContext items={route.stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {route.stops.map(stop => (
                            <SortableStopItem key={stop.id} stop={stop} routeId={route.id} />
                        ))}
                    </SortableContext>
                    {route.stops.length === 0 && (
                        <div className="text-center py-4 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                            ลากออเดอร์มาที่นี่เพื่อมอบหมายงาน
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const RouteListPanel: React.FC<RouteListPanelProps> = ({ routes, activeRouteId, drivers, onRouteSelect, onAddRoute, onAssignDriver, onDelete, onEdit }) => {
    return (
        <div className="h-full flex flex-col bg-white border-r border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                    <h2 className="font-bold text-gray-800 text-lg">เส้นทางวิ่งวันนี้</h2>
                    <p className="text-[0.65rem] text-gray-400 font-medium">{routes.length} เส้นทางในวันนี้</p>
                </div>
                <button
                    onClick={onAddRoute}
                    className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    title="สร้างเส้นทางใหม่"
                >
                    <span className="text-xl">➕</span>
                </button>
            </div>
            <div className="p-2 bg-gray-50/50 border-b border-gray-100">
                <div className="flex gap-2 text-xs">
                    <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition">ทั้งหมด</button>
                    <button className="px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition">รถของฉัน</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
                {routes.map(route => (
                    <RouteCard
                        key={route.id}
                        route={route}
                        isActive={route.id === activeRouteId}
                        drivers={drivers}
                        onAssignDriver={onAssignDriver}
                        onClick={() => onRouteSelect(route.id)}
                        onDelete={onDelete}
                        onEdit={onEdit}
                    />
                ))}
            </div>
        </div>
    );
};
