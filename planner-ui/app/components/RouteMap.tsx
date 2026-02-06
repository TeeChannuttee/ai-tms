'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface RouteMapProps {
    center?: [number, number]
    zoom?: number
    markers?: Array<{
        id: string
        position: [number, number]
        label: string
        type: 'depot' | 'customer' | 'vehicle'
    }>
    routes?: Array<{
        id: string
        coordinates: Array<[number, number]>
        color: string
    }>
}

export default function RouteMap({
    center = [13.7563, 100.5018], // Bangkok
    zoom = 12,
    markers = [],
    routes = [],
}: RouteMapProps) {
    const mapRef = useRef<L.Map | null>(null)
    const mapContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return

        // Initialize map
        const map = L.map(mapContainerRef.current).setView(center, zoom)

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map)

        mapRef.current = map

        return () => {
            map.remove()
            mapRef.current = null
        }
    }, [])

    // Update markers
    useEffect(() => {
        if (!mapRef.current) return

        const map = mapRef.current
        const markerLayers: L.Marker[] = []

        markers.forEach((marker) => {
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `
          <div class="flex flex-col items-center" style="font-family: 'DM Sans', system-ui, sans-serif;">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-lg ${
                marker.type === 'depot'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                    : marker.type === 'customer'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600'
            }" style="box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              ${marker.type === 'depot' ? '🏭' : marker.type === 'customer' ? '📍' : '🚛'}
            </div>
            <div class="bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-md text-[0.7rem] font-bold mt-1.5 whitespace-nowrap text-gray-800" style="box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              ${marker.label}
            </div>
          </div>
        `,
                iconSize: [40, 60],
                iconAnchor: [20, 60],
            })

            const markerLayer = L.marker(marker.position, { icon }).addTo(map)
            markerLayers.push(markerLayer)
        })

        return () => {
            markerLayers.forEach((m) => m.remove())
        }
    }, [markers])

    // Update routes
    useEffect(() => {
        if (!mapRef.current) return

        const map = mapRef.current
        const routeLayers: L.Polyline[] = []

        routes.forEach((route) => {
            const polyline = L.polyline(route.coordinates, {
                color: route.color,
                weight: 4,
                opacity: 0.7,
            }).addTo(map)

            routeLayers.push(polyline)
        })

        // Fit bounds if routes exist
        if (routes.length > 0) {
            const allCoords = routes.flatMap((r) => r.coordinates)
            if (allCoords.length > 0) {
                const bounds = L.latLngBounds(allCoords)
                map.fitBounds(bounds, { padding: [50, 50] })
            }
        }

        return () => {
            routeLayers.forEach((r) => r.remove())
        }
    }, [routes])

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainerRef} className="w-full h-full rounded-xl" />
        </div>
    )
}