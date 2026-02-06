"use client"

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { UnassignedStopsPanel, UnassignedOrder } from '../../components/UnassignedStopsPanel'
import { RouteListPanel, PlannerRoute, RouteStop } from '../../components/RouteListPanel'
import { ordersAPI, routesAPI, fleetAPI } from '../../lib/api'

// Dynamic import for Map
const RouteMap = dynamic(() => import('../../components/RouteMap'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center text-gray-400">กำลังโหลดแผนที่...</div>
})

export default function PlanningPage() {
    const [unassigned, setUnassigned] = useState<UnassignedOrder[]>([])
    const [routes, setRoutes] = useState<PlannerRoute[]>([])
    const [loading, setLoading] = useState(true)
    const [activeRouteId, setActiveRouteId] = useState<string | null>(null)
    const [activeDragItem, setActiveDragItem] = useState<any>(null)

    // Modal & New Route state
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [editingRouteId, setEditingRouteId] = useState<string | null>(null)

    const [availableVehicles, setAvailableVehicles] = useState<any[]>([])
    const [depots, setDepots] = useState<any[]>([])
    const [drivers, setDrivers] = useState<any[]>([])
    const [newRouteData, setNewRouteData] = useState({
        vehicle_id: '',
        depot_id: '',
        date: new Date().toISOString().split('T')[0]
    })

    // ... (sensors/refetchData skipped for brevity in replacement if contiguous, but here we insert new functions) ...

    // ... (handleDeleteRoute above) ...

    const handleAddRoute = async () => {
        setIsEditMode(false)
        setEditingRouteId(null)
        setNewRouteData({
            vehicle_id: '',
            depot_id: '',
            date: new Date().toISOString().split('T')[0]
        })

        setIsRouteModalOpen(true)
        try {
            const [vData, dData] = await Promise.all([
                fleetAPI.getVehicles(),
                fleetAPI.getDepots()
            ])
            setAvailableVehicles(vData || [])
            setDepots(dData || [])

            if (vData && vData.length > 0) {
                setNewRouteData(prev => ({ ...prev, vehicle_id: vData[0].id }))
            }
            if (dData && dData.length > 0) {
                setNewRouteData(prev => ({ ...prev, depot_id: dData[0].id }))
            }
        } catch (err) {
            console.error('Failed to fetch modal data:', err)
        }
    }

    const handleEditRoute = async (route: PlannerRoute) => {
        setIsEditMode(true)
        setEditingRouteId(route.id)

        // Find vehicle ID from vehicle Name (tricky if we don't store vehicleId in PlannerRoute)
        // Let's assume we can fetch details or just open modal with available data
        // Ideally PlannerRoute should have vehicleId. Let's check api.ts or just fetch vehicles first

        setIsRouteModalOpen(true)

        try {
            const [vData, dData] = await Promise.all([
                fleetAPI.getVehicles(),
                fleetAPI.getDepots()
            ])
            setAvailableVehicles(vData || [])
            setDepots(dData || [])

            // Try to find matching vehicle (by name or if we add vehicleId to PlannerRoute later)
            // For now, let's just default to first or try to match name.
            // Better: update PlannerRoute interface to include vehicleId (done in route mapping)
            // Let's assume fetchRoutes is updated to include vehicleId? No, we need to check mapping.
            // Mapping uses r.vehicle?.license_plate.

            // To do this right, we'll fetch the specific route details again
            const rData = await routesAPI.getRoute(route.id)

            setNewRouteData({
                vehicle_id: rData.vehicle_id || (vData && vData.length > 0 ? vData[0].id : ''),
                depot_id: rData.depot_id || (dData && dData.length > 0 ? dData[0].id : ''), // Mock depot if not in DB route model
                date: new Date().toISOString().split('T')[0] // Backend Route might not store date yet? check handlers
            })

        } catch (err) {
            console.error(err)
            alert('ไม่สามารถโหลดข้อมูลเส้นทางได้')
        }
    }

    const submitRouteForm = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (isEditMode && editingRouteId) {
                await (routesAPI as any).updateRoute(editingRouteId, newRouteData)
                alert('แก้ไขเส้นทางสำเร็จ!')
            } else {
                await routesAPI.createRoute(newRouteData)
                alert('สร้างเส้นทางสำเร็จ!')
            }
            setIsRouteModalOpen(false)
            await refetchData()
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err)
        }
    }

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 }
        })
    )

    const refetchData = async () => {
        setLoading(true)
        try {
            // Fetch Orders (Independent try-catch)
            try {
                const ordersData = await ordersAPI.getOrders('pending')
                const mappedOrders: UnassignedOrder[] = ordersData.map((o: any) => ({
                    id: o.id,
                    customerName: o.customer?.name || 'ไม่ระบุชื่อ',
                    address: o.delivery_address || 'ไม่ระบุที่อยู่',
                    weight: o.weight_kg || 0,
                    windowStart: o.required_by ? new Date(o.required_by).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00',
                    windowEnd: ''
                }))
                setUnassigned(mappedOrders)
            } catch (orderErr) {
                console.error("Failed to fetch pending orders:", orderErr)
                // Keep previous state or set to empty - handled by useState default
            }

            // Fetch Drivers
            try {
                const driversData = await fleetAPI.getDrivers()
                setDrivers(driversData || [])
            } catch (driverErr) {
                console.error("Failed to fetch drivers:", driverErr)
            }

            // Fetch Routes (Independent try-catch)
            try {
                const routesData = await routesAPI.getRoutes()
                const mappedRoutes: PlannerRoute[] = routesData.map((r: any) => ({
                    id: r.id,
                    vehicleName: r.vehicle?.license_plate || `เส้นทาง ${r.id.slice(0, 4)}`,
                    vehicleStatus: r.status === 'in_progress' ? 'Active' : 'Idle',
                    driverId: r.driver_id,
                    driverName: r.driver?.name,
                    totalDistance: r.total_distance_km || 0,
                    totalDuration: r.total_duration_min || 0,
                    stops: (r.stops || []).map((s: any) => ({
                        id: s.id,
                        orderId: s.order_id,
                        customerName: s.customer_name || 'ลูกค้าทั่วไป',
                        address: s.address || 'ที่อยู่จัดส่ง',
                        arrivalTime: new Date(s.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        serviceTime: s.service_time_minutes || 15,
                        lateRisk: false
                    }))
                }))
                setRoutes(mappedRoutes)
                // Only reset active route if none selected and routes exist
                if (mappedRoutes.length > 0 && !activeRouteId) {
                    setActiveRouteId(mappedRoutes[0].id)
                }
            } catch (routeErr) {
                console.error("Failed to fetch routes:", routeErr)
            }

        } catch (err) {
            console.error('Critical failure in refetchData:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refetchData()
    }, [])

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragItem(event.active.data.current)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveDragItem(null)

        if (!over) return

        const activeId = active.id
        const overId = over.id
        const activeData = active.data.current
        const overData = over.data.current

        // Case 1: Dragging Unassigned Order -> Route
        if (activeData?.type === 'UNASSIGNED' && overData?.type === 'ROUTE') {
            const order = activeData.order as UnassignedOrder
            const routeId = overData.routeId

            try {
                // Persistent Backend Call
                await routesAPI.addStopToRoute(routeId, order.id)

                // Optimistic UI Update
                setUnassigned(prev => prev.filter(o => o.id !== order.id))
                setRoutes(prev => prev.map(route => {
                    if (route.id === routeId) {
                        const newStop: RouteStop = {
                            id: `S-${Date.now()}`,
                            orderId: order.id,
                            customerName: order.customerName,
                            address: order.address,
                            arrivalTime: '--:--',
                            serviceTime: 15,
                            lateRisk: false
                        }
                        return { ...route, stops: [...route.stops, newStop] }
                    }
                    return route
                }))
            } catch (err) {
                alert('เกิดข้อผิดพลาดในการเพิ่มออเดอร์: ' + err)
            }
        }

        // Case 2: Dragging Route Stop -> Unassigned Zone
        if (activeData?.type === 'ROUTE_STOP' && overData?.type === 'UNASSIGNED_ZONE') {
            const stop = activeData.stop as RouteStop
            const routeId = activeData.routeId

            console.log("Removing stop:", stop.id, "from route:", routeId) // DEBUG Log

            try {
                // Persistent Backend Call
                await (routesAPI as any).removeStop(routeId, stop.id)

                // Optimistic UI Update
                // 1. Remove from Route
                setRoutes(prev => prev.map(route => {
                    if (route.id === routeId) {
                        return { ...route, stops: route.stops.filter(s => s.id !== stop.id) }
                    }
                    return route
                }))

                // 2. Add back to Unassigned List
                setUnassigned(prev => [
                    {
                        id: stop.orderId,
                        customerName: stop.customerName,
                        address: stop.address,
                        weight: 0, // Mock/Fetch if possible or store in stop data
                        windowStart: '08:00',
                        windowEnd: '17:00'
                    },
                    ...prev
                ])

            } catch (err) {
                alert('เกิดข้อผิดพลาดในการยกเลิกออเดอร์: ' + err)
            }
        }
    }

    const handleAssignDriver = async (routeId: string, driverId: string) => {
        try {
            await routesAPI.assignRoute(routeId, driverId)
            // Optimistic Update
            setRoutes(prev => prev.map(r => {
                if (r.id === routeId) {
                    const driver = drivers.find(d => d.id === driverId)
                    return { ...r, driverId, driverName: driver?.name }
                }
                return r
            }))
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการระบุคนขับ: ' + err)
        }
    }

    const handleDeleteRoute = async (routeId: string) => {
        console.log("Attempting to delete route:", routeId) // DEBUG Log
        try {
            await (routesAPI as any).deleteRoute(routeId)

            // Optimistic Update: Remove route from UI
            setRoutes(prev => prev.filter(r => r.id !== routeId))
            if (activeRouteId === routeId) {
                setActiveRouteId(null)
            }

            // Should also refresh unassigned orders as they are released
            // But for now, user can click refresh or drag them back first
            // Ideally: refetchData()
            setTimeout(refetchData, 500) // Delay slightly for backend processing

        } catch (err) {
            alert('เกิดข้อผิดพลาดในการลบเส้นทาง: ' + err)
        }
    }



    if (loading) return <div className="h-screen flex items-center justify-center bg-white text-gray-400">กำลังโหลดข้อมูลแผนงาน...</div>

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="h-[calc(100vh-80px)] w-full flex overflow-hidden bg-white">

                {/* Left Panel: Unassigned (20%) */}
                <div className="w-[300px] min-w-[300px] flex-shrink-0 z-20 shadow-[4px_0_16px_rgba(0,0,0,0.02)]">
                    <UnassignedStopsPanel orders={unassigned} />
                </div>

                {/* Center Panel: Routes (30%) */}
                <div className="w-[400px] min-w-[400px] flex-shrink-0 z-10 shadow-[4px_0_16px_rgba(0,0,0,0.02)]">
                    <RouteListPanel
                        routes={routes}
                        activeRouteId={activeRouteId}
                        drivers={drivers}
                        onRouteSelect={setActiveRouteId}
                        onAddRoute={handleAddRoute}
                        onAssignDriver={handleAssignDriver}
                        onDelete={handleDeleteRoute}
                        onEdit={handleEditRoute}
                    />
                </div>

                {/* Right Panel: Map (Flex Remaining) */}
                <div className="flex-1 relative bg-gray-50">
                    <div className="absolute inset-0">
                        <RouteMap
                            markers={[
                                { id: 'depot', position: [13.7563, 100.5018], label: 'Depot', type: 'depot' },
                                ...(routes.find(r => r.id === activeRouteId)?.stops.map((s, i) => ({
                                    id: s.id,
                                    position: [13.75 + (i * 0.01), 100.5 + (i * 0.01)] as [number, number],
                                    label: `${i + 1}`,
                                    type: 'customer' as const
                                })) || [])
                            ]}
                            routes={routes.filter(r => r.id === activeRouteId).map(r => ({
                                id: r.id,
                                coordinates: [[13.7563, 100.5018], ...r.stops.map((_, i) => [13.75 + (i * 0.01), 100.5 + (i * 0.01)] as [number, number])],
                                color: '#4f46e5'
                            }))}
                        />
                    </div>
                </div>

            </div>

            <DragOverlay>
                {activeDragItem?.type === 'UNASSIGNED' ? (
                    <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-xl opacity-90 w-[280px]">
                        <span className="font-bold text-gray-800">{activeDragItem.order.customerName}</span>
                    </div>
                ) : null}
            </DragOverlay>

            {/* New Route Modal */}
            {isRouteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-black text-gray-900">{isEditMode ? 'แก้ไขเส้นทาง' : 'สร้างเส้นทางใหม่'}</h2>
                            <button onClick={() => setIsRouteModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={submitRouteForm} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-1.5">เลือกรถขนส่ง</label>
                                <select
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                    value={newRouteData.vehicle_id}
                                    onChange={e => setNewRouteData({ ...newRouteData, vehicle_id: e.target.value })}
                                >
                                    {availableVehicles.map(v => (
                                        <option key={v.id} value={v.id}>{v.license_plate} ({v.type})</option>
                                    ))}
                                    {isEditMode && newRouteData.vehicle_id && !availableVehicles.some(v => v.id === newRouteData.vehicle_id) && (
                                        <option value={newRouteData.vehicle_id}>รถปัจจุบัน (ไม่ระบุทะเบียน)</option>
                                    )}
                                    {availableVehicles.length === 0 && <option value="" disabled>ไม่มีรถว่าง - เพิ่มรถในจัดการรถ</option>}
                                </select>
                                {availableVehicles.length === 0 && (
                                    <p className="mt-1 text-[0.6rem] text-red-500 font-bold uppercase">⚠ ข้อมูลรถไม่ครบถ้วน</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-1.5">เลือกคลังสินค้า</label>
                                <select
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                    value={newRouteData.depot_id}
                                    onChange={e => setNewRouteData({ ...newRouteData, depot_id: e.target.value })}
                                >
                                    <option value="" disabled>เลือกคลังสินค้า...</option>
                                    {depots.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                    {isEditMode && newRouteData.depot_id && !depots.some(d => d.id === newRouteData.depot_id) && (
                                        <option value={newRouteData.depot_id}>คลังปัจจุบัน</option>
                                    )}
                                </select>
                                {depots.length === 0 && (
                                    <p className="mt-1 text-[0.6rem] text-red-500 font-bold uppercase">⚠ ไม่พบคลังสินค้า</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-1.5">วันที่</label>
                                <input
                                    type="date"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all mb-4"
                                    value={newRouteData.date}
                                    onChange={e => setNewRouteData({ ...newRouteData, date: e.target.value })}
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsRouteModalOpen(false)}
                                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                        disabled={!newRouteData.vehicle_id || !newRouteData.depot_id}
                                    >
                                        {isEditMode ? 'บันทึกการแก้ไข' : 'เริ่มสร้างเส้นทาง'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DndContext>
    )
}
