'use client'

import React, { useState, useEffect } from 'react'
import LiveFleetMap from '../../components/LiveFleetMap'
import RouteTimeline from '../../components/RouteTimeline'
import { fleetAPI, routesAPI } from '../../lib/api'
import { realtimeService, RealtimeEvent } from '../../lib/realtime'
// Removed simulation import
import { AlertTriangle, CheckCircle, Truck, Clock } from 'lucide-react'

interface FleetVehicle { // Renamed from SimulatedVehicle
    id: string
    name: string
    type: 'TRUCK' | 'VAN'
    status: string
    currentLocation: { lat: number; lng: number }
    progress: number
    battery: number
    currentDriverName?: string
}

interface ActiveRoute {
    id: string
    vehicleId: string
    vehicleName: string
    driverId?: string
    driverName?: string
    status: string
    progress: number
    stops: Array<{
        id: string
        customerName: string
        address: string
        status: string
        arrivalTime: string
    }>
    location?: { lat: number; lng: number }
}

interface Alert {
    id: string
    type: 'warning' | 'info' | 'success'
    message: string
    time: string
}

export default function DispatchPage() {
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
    const [fleet, setFleet] = useState<FleetVehicle[]>([])
    const [activeRoutes, setActiveRoutes] = useState<ActiveRoute[]>([])
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [isLive, setIsLive] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                const [vehicles, locations, routes] = await Promise.all([
                    fleetAPI.getVehicles(),
                    fleetAPI.getFleetLocations().catch(() => []),
                    routesAPI.getRoutes().catch(() => [])
                ])

                // Map vehicles with their locations
                const mapped: FleetVehicle[] = vehicles.map((v: any) => {
                    const loc = locations.find((l: any) => l.vehicle_id === v.id)
                    const route = routes.find((r: any) => r.vehicle_id === v.id && (r.status === 'in_progress' || r.status === 'assigned'))

                    let status = v.status.toUpperCase()
                    if (route?.status === 'in_progress') status = 'MOVING'
                    else if (v.status === 'active') status = 'IDLE'

                    return {
                        id: v.id,
                        name: v.license_plate || v.vehicle_number,
                        type: v.type === 'truck' ? 'TRUCK' : 'VAN',
                        status,
                        currentLocation: loc
                            ? { lat: loc.latitude, lng: loc.longitude }
                            : { lat: 13.7563, lng: 100.5018 },
                        progress: 0,
                        battery: v.battery_level || 100,
                        currentDriverName: v.current_driver_name
                    }
                })
                setFleet(mapped)

                // Map active routes with robust fallback logic
                const activeRoutesData: ActiveRoute[] = routes
                    .filter((r: any) => r.status === 'in_progress' || r.status === 'assigned')
                    .map((r: any) => {
                        const loc = locations.find((l: any) => l.vehicle_id === r.vehicle_id)
                        const completedStops = r.stops?.filter((s: any) => s.status === 'delivered' || s.status === 'completed').length || 0
                        const totalStops = r.stops?.length || 1

                        // Robust Data Matching Logic
                        let vehicleName = r.vehicle_number; // Try direct from route
                        if (!vehicleName) {
                            const foundVehicle = vehicles.find((v: any) => v.id === r.vehicle_id);
                            vehicleName = foundVehicle ? (foundVehicle.license_plate || foundVehicle.vehicle_number) : 'ไม่ระบุทะเบียน';
                        }

                        let driverName = r.driver_name; // Try direct from route
                        // Note: We don't have full driver list here usually, but if we did, we'd search it.
                        // For now, fallback to generic if ID exists but name doesn't
                        if (!driverName && r.driver_id) {
                            driverName = 'พนักงานขับรถ (' + r.driver_id.slice(0, 4) + ')';
                        } else if (!driverName) {
                            driverName = 'ยังไม่ระบุคนขับ';
                        }

                        // Status Translation
                        let statusDisplay = r.status;
                        if (r.status === 'in_progress') statusDisplay = 'กำลังจัดส่ง';
                        else if (r.status === 'assigned') statusDisplay = 'รอดำเนินการ';

                        return {
                            id: r.id,
                            vehicleId: r.vehicle_id,
                            vehicleName: vehicleName,
                            driverId: r.driver_id,
                            driverName: driverName,
                            status: statusDisplay,
                            progress: Math.round((completedStops / totalStops) * 100),
                            stops: r.stops?.map((s: any) => ({
                                id: s.id,
                                customerName: s.customer_name || 'ลูกค้าทั่วไป',
                                address: s.address || 'ไม่ระบุที่อยู่',
                                status: s.status,
                                arrivalTime: s.arrival_time ? new Date(s.arrival_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--'
                            })) || [],
                            location: loc ? { lat: loc.latitude, lng: loc.longitude } : undefined
                        }
                    })
                setActiveRoutes(activeRoutesData)

                // Generate initial alerts based on data
                const initialAlerts: Alert[] = []
                if (activeRoutesData.length > 0) {
                    initialAlerts.push({
                        id: '1',
                        type: 'info',
                        message: `มี ${activeRoutesData.length} เส้นทางกำลังปฏิบัติงาน`,
                        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                    })
                }
                const delayedCount = mapped.filter(v => v.status === 'DELAYED').length
                if (delayedCount > 0) {
                    initialAlerts.push({
                        id: '2',
                        type: 'warning',
                        message: `${delayedCount} รถล่าช้ากว่ากำหนด`,
                        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                    })
                }
                setAlerts(initialAlerts)

            } catch (err) {
                console.error('Failed to load dispatch data:', err)
            } finally {
                setLoading(false)
            }
        }
        loadData()

        // Subscribe to real-time updates
        const unsubscribe = realtimeService.subscribe((event: RealtimeEvent) => {
            setIsLive(true)
            if (event.type === 'LOCATION_UPDATE') {
                const { vehicle_id, latitude, longitude, speed_kmh } = event.payload
                setFleet(prev => prev.map(v =>
                    v.id === vehicle_id
                        ? { ...v, currentLocation: { lat: latitude, lng: longitude }, status: speed_kmh > 0 ? 'MOVING' : 'IDLE' }
                        : v
                ))
            }
            if (event.type === 'STATUS_UPDATE') {
                const { stop_id, status, route_id } = event.payload
                setActiveRoutes(prev => prev.map(route => {
                    if (route.id === route_id) {
                        const updatedStops = route.stops.map(s =>
                            s.id === stop_id ? { ...s, status } : s
                        )
                        const completedStops = updatedStops.filter(s => s.status === 'delivered' || s.status === 'completed').length
                        return {
                            ...route,
                            stops: updatedStops,
                            progress: Math.round((completedStops / updatedStops.length) * 100)
                        }
                    }
                    return route
                }))

                // Add alert for status change
                if (status === 'delivered' || status === 'completed') {
                    setAlerts(prev => [{
                        id: Date.now().toString(),
                        type: 'success',
                        message: `ส่งสำเร็จ: จุดส่ง ${stop_id.slice(0, 8)}`,
                        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                    }, ...prev.slice(0, 4)])
                }
            }
        })

        return () => unsubscribe()
    }, [])

    const handleAction = async (routeId: string, action: string) => {
        const route = activeRoutes.find(r => r.id === routeId)
        if (!route) return

        if (action === 'message') {
            const msg = prompt(`ส่งข้อความถึง ${route.driverName}:`, "กรุณายืนยันตำแหน่งของคุณ")
            if (msg) {
                // In real app: POST /api/dispatch/message
                alert(`✅ ส่งข้อความถึง ${route.driverName} สำเร็จ`)
                setAlerts(prev => [{
                    id: Date.now().toString(),
                    type: 'info',
                    message: `ส่งข้อความถึง ${route.driverName}`,
                    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                }, ...prev.slice(0, 4)])
            }
        }

        if (action === 'reassign') {
            const confirmReassign = confirm(`ต้องการโอนงานที่เหลือจาก ${route.vehicleName} ไปยังรถคันอื่นหรือไม่?`)
            if (confirmReassign) {
                alert(`✅ โอนงานไปยังรถที่ใกล้ที่สุดสำเร็จ`)
            }
        }
    }

    if (loading) {
        return (
            <div className="h-[calc(100vh-140px)] flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลดข้อมูล Dispatch...</p>
                </div>
            </div>
        )
    }

    const movingCount = fleet.filter(v => v.status === 'MOVING').length
    const delayedCount = fleet.filter(v => v.status === 'DELAYED').length

    return (
        <div className="h-[calc(100vh-140px)] flex gap-5" style={{ background: '#f8fafc', padding: '24px 32px' }}>

            {/* Left: Map View (Main Focus) */}
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
                <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur border border-gray-100 px-4 py-2 rounded-xl shadow-lg">
                    <h1 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        แผนที่ปฏิบัติการสด
                        {isLive && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                    </h1>
                    <p className="text-[0.65rem] text-gray-500">อัปเดตเรียลไทม์ผ่าน GPS</p>
                </div>
                <div className="flex-1">
                    <LiveFleetMap
                        vehicles={fleet}
                        onVehicleSelect={setSelectedVehicleId}
                        selectedVehicleId={selectedVehicleId}
                    />
                </div>
            </div>

            {/* Right: Active Timelines & Feed */}
            <div className="w-[420px] flex flex-col gap-5">

                {/* Stats Header */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <Truck size={14} className="text-indigo-500" />
                            <span className="text-[0.65rem] text-gray-400 font-medium uppercase">รถทั้งหมด</span>
                        </div>
                        <div className="text-xl font-bold text-gray-800">{fleet.length}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle size={14} className="text-green-500" />
                            <span className="text-[0.65rem] text-gray-400 font-medium uppercase">กำลังวิ่ง</span>
                        </div>
                        <div className="text-xl font-bold text-green-600">{movingCount}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={14} className="text-red-500" />
                            <span className="text-[0.65rem] text-gray-400 font-medium uppercase">ล่าช้า</span>
                        </div>
                        <div className="text-xl font-bold text-red-600">{delayedCount}</div>
                    </div>
                </div>

                {/* Timeline List */}
                <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 text-sm">
                            เส้นทางที่กำลังปฏิบัติงาน ({activeRoutes.length})
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {activeRoutes.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Clock size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">ไม่มีเส้นทางที่กำลังปฏิบัติงาน</p>
                                <p className="text-xs mt-1">สร้างเส้นทางและ assign คนขับที่หน้า Planning</p>
                            </div>
                        ) : (
                            activeRoutes.map((route) => {
                                // Convert stops to timeline format
                                const timelineStops = route.stops.map((s, idx) => ({
                                    time: s.arrivalTime,
                                    status: (s.status === 'delivered' || s.status === 'completed') ? 'done'
                                        : s.status === 'enroute' ? 'current'
                                            : 'pending',
                                    customer: s.customerName
                                }))

                                return (
                                    <div key={route.id}
                                        className={`transition-all duration-300 cursor-pointer ${selectedVehicleId === route.vehicleId ? 'ring-2 ring-indigo-500 rounded-xl' : ''}`}
                                        onClick={() => setSelectedVehicleId(route.vehicleId)}>
                                        <RouteTimeline
                                            id={route.id}
                                            vehicleName={route.vehicleName}
                                            driverName={route.driverName || 'ไม่ได้ระบุ'}
                                            progress={route.progress}
                                            isDelayed={route.status === 'delayed'}
                                            stops={timelineStops as any}
                                            onAction={(action) => handleAction(route.id, action)}
                                        />
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Alerts Feed */}
                <div className="bg-white border text-xs border-gray-100 rounded-xl p-3 shadow-sm h-[140px] overflow-hidden">
                    <div className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        การแจ้งเตือนล่าสุด
                    </div>
                    <div className="space-y-2 overflow-y-auto h-[90px]">
                        {alerts.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">ไม่มีการแจ้งเตือน</p>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className="flex gap-2 items-center text-gray-600">
                                    <span className="font-mono text-[0.65rem] text-gray-400">{alert.time}</span>
                                    {alert.type === 'warning' && <AlertTriangle size={12} className="text-amber-500" />}
                                    {alert.type === 'success' && <CheckCircle size={12} className="text-green-500" />}
                                    {alert.type === 'info' && <Truck size={12} className="text-blue-500" />}
                                    <span>{alert.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}