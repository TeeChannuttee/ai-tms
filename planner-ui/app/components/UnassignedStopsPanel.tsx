import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

export interface UnassignedOrder {
    id: string;
    customerName: string;
    address: string;
    weight: number;
    windowStart: string;
    windowEnd: string;
}

interface UnassignedStopsPanelProps {
    orders: UnassignedOrder[];
}

const DraggableOrderCard = ({ order }: { order: UnassignedOrder }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `unassigned-${order.id}`,
        data: { type: 'UNASSIGNED', order }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}
            className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-2 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-gray-800 text-sm">{order.customerName}</span>
                <span className="text-[0.65rem] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">#{order.id}</span>
            </div>
            <div className="text-xs text-gray-500 mb-2 truncate">{order.address}</div>
            <div className="flex gap-2">
                <span className="text-[0.65rem] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-semibold">{order.weight}kg</span>
                <span className="text-[0.65rem] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-semibold">🕒 {order.windowStart}-{order.windowEnd}</span>
            </div>
        </div>
    );
};

export const UnassignedStopsPanel: React.FC<UnassignedStopsPanelProps> = ({ orders }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'unassigned-zone',
        data: { type: 'UNASSIGNED_ZONE' }
    });

    return (
        <div ref={setNodeRef} className={`h-full flex flex-col border-r border-gray-200 transition-colors ${isOver ? 'bg-indigo-50/50' : 'bg-gray-50'}`}>
            <div className="p-4 border-b border-gray-200 bg-white">
                <h2 className="font-bold text-gray-800 flex items-center justify-between">
                    ออเดอร์รอจัดส่ง
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{orders.length}</span>
                </h2>
                <input
                    type="text"
                    placeholder="ค้นหาออเดอร์..."
                    className="mt-3 w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
                {orders.map(order => (
                    <DraggableOrderCard key={order.id} order={order} />
                ))}
                {orders.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">
                        ลากออเดอร์มาที่นี่เพื่อยกเลิกการจัดส่ง
                    </div>
                )}
            </div>
        </div>
    );
};
