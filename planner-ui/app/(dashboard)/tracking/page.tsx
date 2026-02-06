'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { fleetAPI } from '../../lib/api'
import { realtimeService, RealtimeEvent } from '../../lib/realtime'

const RouteMap = dynamic(() => import('../../components/RouteMap'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-2xl" />
})

export default function TrackingPage() {
    const [vehicles, setVehicles] = useState<any[]>([])
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)

    useEffect(() => {
        // 1. Initial Load - Real Fleet Locations
        const loadInitialLocations = async () => {
            try {
                const locations = await fleetAPI.getFleetLocations()
                const mapped = locations.map((loc: any) => ({
                    id: loc.vehicle_id,
                    plate: loc.license_plate || `V-${loc.vehicle_id?.slice(0, 4).toUpperCase()}`,
                    lat: loc.latitude,
                    lng: loc.longitude,
                    status: loc.status || 'offline',
                    speed: loc.speed_kmh,
                    heading: loc.heading
                }))
                setVehicles(mapped)
            } catch (err) {
                console.error('Failed to load initial tracking data:', err)
            }
        }
        loadInitialLocations()

        // 2. Real-time Telemetry
        const unsubscribe = realtimeService.subscribe((event: RealtimeEvent) => {
            if (event.type === 'LOCATION_UPDATE') {
                const { vehicle_id, latitude, longitude, speed_kmh, heading } = event.payload
                setVehicles(prev => prev.map(v =>
                    v.id === vehicle_id
                        ? { ...v, lat: latitude, lng: longitude, speed: speed_kmh, heading, status: v.status === 'offline' ? 'offline' : (speed_kmh > 0 ? 'moving' : 'stopped') }
                        : v
                ))
            }
        })
        return () => unsubscribe()
    }, [])

    const markers: { id: string; position: [number, number]; label: string; type: 'customer' | 'vehicle' | 'depot' }[] = vehicles
        .filter(v => v.status !== 'offline')
        .map(v => ({
            id: v.id,
            position: [v.lat, v.lng] as [number, number],
            label: v.plate,
            type: 'vehicle' as const
        }))

    // Calculate Real-time Stats
    const movingVehicles = vehicles.filter(v => v.status === 'moving')
    const movingCount = movingVehicles.length
    const onlineCount = vehicles.filter(v => v.status !== 'offline').length

    const avgSpeed = movingCount > 0
        ? (movingVehicles.reduce((sum, v) => sum + (v.speed || 0), 0) / movingCount).toFixed(0)
        : '0'

    const gpsHealth = vehicles.length > 0
        ? ((onlineCount / vehicles.length) * 100).toFixed(1)
        : '0.0'

    const selected = vehicles.find(v => v.id === selectedVehicle)

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col space-y-5" style={{ background: '#f8fafc', padding: '32px' }}>

            {/* Header */}
            <div className="flex justify-between items-center bg-white border border-gray-100 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg relative" style={{ background: '#eff6ff' }}>
                        🛰️
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>ติดตามยานพาหนะทั่วโลก (Global Fleet Tracking)</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <p className="text-[0.65rem] text-emerald-600 font-semibold uppercase tracking-widest">ระบบติดตามสดทำงานอยู่</p>
                        </div>
                    </div>
                </div>

                {/* Live Stats */}
                <div className="flex gap-6 px-6 border-l border-gray-100">
                    {[
                        { label: 'รถที่วิ่งอยู่', value: movingCount.toString(), sub: `/ ${vehicles.length}`, color: '#1f2937' },
                        { label: 'ความเร็วเฉลี่ย', value: avgSpeed, sub: 'km/h', color: '#2563eb' },
                        { label: 'สถานะ GPS', value: `${gpsHealth}%`, sub: 'Online', color: gpsHealth === '100.0' ? '#16a34a' : '#ea580c' },
                    ].map((stat, i) => (
                        <div key={i} className="text-right">
                            <p className="text-[0.6rem] text-gray-400 font-semibold uppercase tracking-widest mb-0.5">{stat.label}</p>
                            <p className="text-lg font-bold" style={{ color: stat.color, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                {stat.value} {stat.sub && <span className="text-[0.7rem] font-medium text-gray-400">{stat.sub}</span>}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-5 overflow-hidden">

                {/* Map */}
                <div className="lg:col-span-3 bg-gray-100 border border-gray-200 rounded-2xl overflow-hidden relative shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <RouteMap markers={markers} />

                    {/* Selected Vehicle Info Panel */}
                    {selectedVehicle && selected && (
                        <div className="absolute top-4 right-4 w-72 bg-white/95 backdrop-blur-xl border border-gray-100 p-5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] z-10">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: selected.status === 'moving' ? '#10b981' : '#ef4444' }}></div>
                                    <h3 className="font-bold text-gray-900 text-[0.88rem]">{selected.plate}</h3>
                                </div>
                                <button onClick={() => setSelectedVehicle(null)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors text-sm">✕</button>
                            </div>

                            <div className="space-y-3.5">
                                {/* Speed */}
                                <div className="flex justify-between items-center">
                                    <span className="text-[0.75rem] text-gray-500 font-medium">ความเร็วปัจจุบัน</span>
                                    <span className="text-lg font-bold font-mono text-blue-600">{selected.speed.toFixed(0)} <span className="text-[0.65rem] font-medium text-gray-400">km/h</span></span>
                                </div>

                                {/* Fuel */}
                                <div className="flex justify-between items-center">
                                    <span className="text-[0.75rem] text-gray-500 font-medium">ระดับน้ำมัน</span>
                                    <div className="flex gap-1">
                                        {[1, 2, 3].map(seg => (
                                            <div key={seg} className="w-7 h-2 rounded-full" style={{ background: seg <= 2 ? '#10b981' : '#e5e7eb' }}></div>
                                        ))}
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="pt-3.5 border-t border-gray-100 flex gap-2">
                                    <button className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-[0.7rem] font-semibold text-gray-600 transition-colors">ดูกล้อง</button>
                                    <button className="flex-1 py-1.5 text-white rounded-lg text-[0.7rem] font-semibold transition-colors"
                                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>ส่งข้อความ</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Fleet Sidebar */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            <input type="text" placeholder="ค้นหา ID..." className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-[0.75rem] text-gray-600 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {vehicles.map(v => {
                            const isSelected = selectedVehicle === v.id
                            const isMoving = v.status === 'moving'
                            return (
                                <div
                                    key={v.id}
                                    onClick={() => setSelectedVehicle(v.id)}
                                    className="p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                                    style={{
                                        background: isSelected ? '#eff6ff' : 'white',
                                        borderColor: isSelected ? '#93c5fd' : '#f0f0f0',
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-[0.82rem] text-gray-800">{v.plate}</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{
                                                background: v.status === 'moving' ? '#10b981' : (v.status === 'offline' ? '#94a3b8' : '#ef4444'),
                                                animation: v.status === 'moving' ? 'pulse 1.5s infinite' : 'none'
                                            }}></div>
                                            <span className="text-[0.6rem] font-semibold uppercase" style={{
                                                color: v.status === 'moving' ? '#16a34a' : (v.status === 'offline' ? '#64748b' : '#dc2626')
                                            }}>
                                                {v.status === 'moving' ? 'กำลังวิ่ง' : (v.status === 'offline' ? 'ออฟไลน์' : 'จอดนิ่ง')}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[0.7rem] text-gray-400 mb-2">
                                        {v.status === 'offline' ? 'ไม่เชื่อมต่อกับคนขับ' : (v.status === 'moving' ? `${v.speed.toFixed(0)} km/h` : 'ดับเครื่อง')}
                                    </p>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500" style={{
                                            width: `${v.speed}%`,
                                            background: isMoving ? '#3b82f6' : '#e5e7eb'
                                        }}></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    )
}