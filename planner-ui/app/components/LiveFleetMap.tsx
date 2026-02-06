'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { realtimeService, RealtimeEvent } from '../lib/realtime'
import { fleetAPI } from '../lib/api'

// Import Leaflet types (we need to cast L since it's client-side only)
import * as Leaflet from 'leaflet'

interface FleetVehicle {
    id: string
    name: string
    type: 'TRUCK' | 'VAN'
    status: string
    currentLocation: { lat: number; lng: number }
    progress: number
    battery: number
    currentDriverName?: string
}

// Dynamic import for Leaflet map to avoid SSR issues
const LeafletMap = dynamic(
    () => Promise.resolve(({ vehicles, onVehicleSelect, selectedVehicleId }: { vehicles: FleetVehicle[], onVehicleSelect: (id: string) => void, selectedVehicleId: string | null }) => {
        const mapContainerRef = useRef<HTMLDivElement>(null)
        const mapRef = useRef<Leaflet.Map | null>(null)
        const markersRef = useRef<{ [id: string]: Leaflet.Marker }>({})

        useEffect(() => {
            import('leaflet').then((L) => {
                if (!mapContainerRef.current || mapRef.current) return

                const map = L.map(mapContainerRef.current).setView([13.7563, 100.5400], 12)

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19,
                }).addTo(map)

                mapRef.current = map
            })

            return () => {
                if (mapRef.current) {
                    mapRef.current.remove()
                    mapRef.current = null
                }
            }
        }, [])

        // Update Markers
        useEffect(() => {
            import('leaflet').then((L) => {
                if (!mapRef.current) return

                const map = mapRef.current

                vehicles.forEach(v => {
                    const existingMarker = markersRef.current[v.id]
                    const isSelected = v.id === selectedVehicleId

                    const newIcon = L.divIcon({
                        className: 'custom-fleet-marker',
                        html: `
                            <div class="relative transition-all duration-300 ${isSelected ? 'z-50' : 'z-10'}" style="transform: scale(${isSelected ? 1.2 : 1})">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white shadow-lg border-2 transition-colors" 
                                     style="border-color: ${v.status === 'DELAYED' ? '#ef4444' : v.status === 'IDLE' ? '#9ca3af' : '#4f46e5'}; box-shadow: 0 4px 12px ${v.status === 'DELAYED' ? '#ef4444' : v.status === 'IDLE' ? '#9ca3af' : '#4f46e5'}40;">
                                    ${v.type === 'TRUCK' ? '🚛' : v.type === 'VAN' ? '🚐' : '🛵'}
                                </div>
                                ${v.currentDriverName ? `
                                <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-2 py-0.5 rounded-md shadow-sm border border-gray-100 whitespace-nowrap">
                                    <p class="text-[0.6rem] font-bold text-gray-700">${v.currentDriverName}</p>
                                </div>
                                ` : ''}
                                ${v.status === 'DELAYED' ? `
                                <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[0.6rem] text-white font-bold animate-pulse">!</div>
                                ` : ''}
                            </div>
                        `,
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                    })

                    if (existingMarker) {
                        existingMarker.setLatLng([v.currentLocation.lat, v.currentLocation.lng])
                        existingMarker.setIcon(newIcon)
                        existingMarker.setZIndexOffset(isSelected ? 1000 : 0)
                    } else {
                        const marker = L.marker([v.currentLocation.lat, v.currentLocation.lng], { icon: newIcon })
                            .addTo(map)
                            .on('click', () => onVehicleSelect(v.id))

                        markersRef.current[v.id] = marker
                    }
                })
            })
        }, [vehicles, selectedVehicleId])

        return <div ref={mapContainerRef} className="w-full h-full rounded-2xl z-0" />
    }),
    { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-2xl" /> }
)

export default function LiveFleetMap({
    vehicles,
    onVehicleSelect,
    selectedVehicleId
}: {
    vehicles: FleetVehicle[],
    onVehicleSelect: (id: string) => void,
    selectedVehicleId: string | null
}) {
    // Internal state removed - controlled by parent

    return (
        <div className="relative w-full h-full">
            <LeafletMap vehicles={vehicles} onVehicleSelect={onVehicleSelect} selectedVehicleId={selectedVehicleId} />

            {/* Live Indicator */}
            <div className="absolute top-4 left-24 z-[400] px-3 py-1 rounded-full text-[0.6rem] font-bold flex items-center gap-1.5 shadow-sm border transition-all bg-emerald-50 text-emerald-600 border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE DATA
            </div>

            {/* Legend Overlay */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur border border-gray-100 p-2.5 rounded-xl shadow-lg z-[400] text-xs">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Moving
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Delayed
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span> Idle
                </div>
            </div>
        </div>
    )
}
