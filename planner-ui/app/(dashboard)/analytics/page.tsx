'use client'

import React, { useState, useEffect } from 'react'
import { DateRangeFilter } from '../../components/DateRangeFilter'
import { KPITrendChart } from '../../components/KPITrendChart'
import { DelayReasonAnalysis } from '../../components/DelayReasonAnalysis'
import { analyticsAPI, fleetAPI } from '../../lib/api'



export default function AnalyticsPage() {
    const [dateRange, setDateRange] = useState('7d')
    const [stats, setStats] = useState<any>(null)
    const [drivers, setDrivers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                setLoading(true)
                const [dashData, driversData] = await Promise.all([
                    analyticsAPI.getDashboard(),
                    fleetAPI.getDrivers()
                ])
                setStats(dashData)
                setDrivers(driversData)
            } catch (err) {
                console.error('Failed to load analytics:', err)
            } finally {
                setLoading(false)
            }
        }
        loadAnalytics()
    }, [dateRange])

    const handleRangeChange = (val: string) => {
        setDateRange(val)
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-white text-gray-400">Loading Operational Intelligence...</div>

    // Map volume trend for charts
    const chartData = stats?.volume_trend?.map((p: any) => ({
        name: p.time,
        onTime: p.on_time_rate,
        cost: p.cost,
        late: p.late
    })) || []

    const formatChange = (val: number) => {
        if (!val) return '0%'
        return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end bg-white border border-gray-100 p-6 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">การวิเคราะห์ประสิทธิภาพ (Analytics)</h1>
                    <p className="text-gray-600 text-sm font-semibold">เจาะลึกประสิทธิภาพการดำเนินงานและปัจจัยต้นทุน</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <DateRangeFilter value={dateRange} onChange={handleRangeChange} />
                </div>
            </div>

            {/* KPI Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                    { label: 'อัตราส่งตรงเวลา', val: `${stats?.on_time_rate || 0}%`, change: formatChange(stats?.on_time_rate_change), up: (stats?.on_time_rate_change || 0) >= 0 },
                    { label: 'ระยะทางเฉลี่ย', val: `${(stats?.average_distance || 0).toFixed(1)} km`, change: 'Trending', up: true },
                    { label: 'การใช้รถ', val: `${(stats?.vehicle_utilization || 0).toFixed(0)}%`, change: 'Live', up: true },
                    { label: 'ต้นทุนรวม', val: `฿${(stats?.total_cost || 0).toLocaleString()}`, change: formatChange(stats?.total_cost_change), up: (stats?.total_cost_change || 0) <= 0 },
                ].map((stat, i) => (
                    <div key={i} className="bg-white border border-gray-100 p-5 rounded-2xl hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all group">
                        <p className="text-[0.65rem] text-gray-500 font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                        <div className="flex items-end gap-2.5">
                            <span className="text-3xl font-black text-gray-900 tracking-tight">{stat.val}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg mb-1 ${stat.up ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                {stat.change}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <KPITrendChart
                    title="ชีพจรปริมาณงาน (ออเดอร์)"
                    description="ปริมาณออเดอร์เรียลไทม์จากระบบ"
                    data={chartData}
                    dataKey="onTime"
                    color="#10b981"
                />

                <KPITrendChart
                    title="ต้นทุนโดยประมาณ (รายวัน)"
                    description="ต้นทุนการดำเนินงานโดยประมาณทั้งหมด"
                    data={chartData}
                    dataKey="cost"
                    color="#8b5cf6"
                />
            </div>

            {/* Lower Section: AI Analysis & Drivers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <DelayReasonAnalysis data={stats?.delay_analysis || []} />
                    {stats?.general_insight && (
                        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                            <h4 className="text-[0.65rem] font-bold text-indigo-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <span>🤖</span> AI Dashboard Insight
                            </h4>
                            <p className="text-[0.7rem] text-indigo-900 leading-relaxed font-semibold">
                                {stats.general_insight}
                            </p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">พนักงานขับรถดีเด่น (Top Drivers)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[0.65rem] text-gray-500 font-bold uppercase tracking-widest border-b border-gray-100">
                                    <th className="pb-3 pl-4">คนขับ</th>
                                    <th className="pb-3">การจัดส่ง</th>
                                    <th className="pb-3">ตรงเวลา %</th>
                                    <th className="pb-3">คะแนน</th>
                                    <th className="pb-3 text-right pr-4">เบอร์โทร</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {drivers.slice(0, 5).map((d) => (
                                    <tr key={d.id} className="group hover:bg-gray-50 transition-colors">
                                        <td className="py-4 pl-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg shadow-sm">🏆</div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{d.name}</p>
                                                <p className="text-xs text-gray-500 font-semibold">{d.status}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 font-mono text-gray-700 font-semibold">{d.deliveries}</td>
                                        <td className="py-4 text-emerald-600 font-black">{d.on_time_rate.toFixed(1)}%</td>
                                        <td className="py-4 text-amber-400 text-sm">★★★★★</td>
                                        <td className="py-4 text-right pr-4 font-mono text-gray-500">{d.phone}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
