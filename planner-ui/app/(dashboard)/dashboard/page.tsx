'use client'

import React from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'
import { KPICard } from '../../components/kpi-card'
import { AlertsFeed } from '../../components/alerts-feed'
import { AIHealthPanel } from '../../components/ai-health-panel'
import { analyticsAPI } from '../../lib/api'

const PIE_COLORS = ['#7c3aed', '#3b82f6', '#10b981']



const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-100 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-3.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }}></div>
                        <span className="text-gray-500 capitalize">{entry.dataKey}:</span>
                        <span className="font-semibold text-gray-800">{entry.value}</span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

export default function DashboardPage() {
    const [stats, setStats] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await analyticsAPI.getDashboard()
                setStats(data)
            } catch (err) {
                console.error('Failed to load dashboard stats:', err)
            } finally {
                setLoading(false)
            }
        }
        loadStats()
    }, [])

    const chartData = stats?.volume_trend?.map((p: any) => ({
        name: p.time,
        orders: p.orders,
        vehicles: p.vehicles,
        delay: Math.max(0, p.orders - p.vehicles)
    })) || []

    return (
        <div className="space-y-6" style={{ background: '#f8fafc', minHeight: '100%', padding: '32px' }}>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>ศูนย์ควบคุมการขนส่ง (Control Tower)</h1>
                    <p className="text-gray-400 text-sm mt-1">ภาพรวมระบบแบบเรียลไทม์ &nbsp;•&nbsp; <span className="text-emerald-500 font-semibold">สถานะระบบ {stats ? `${(stats.on_time_rate || 100).toFixed(1)}%` : '--'}</span></p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={async () => {
                            try {
                                const blob = await analyticsAPI.getWeeklyReport();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `weekly-report-${new Date().toISOString().split('T')[0]}.pdf`;
                                a.click();
                            } catch (error) {
                                console.error("Failed to download report", error);
                                alert("ไม่สามารถดาวน์โหลดรายงานได้ในขณะนี้");
                            }
                        }}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        ดาวน์โหลดรายงาน
                    </button>
                    <button
                        onClick={() => window.location.href = '/planning'}
                        className="px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-[0_4px_14px_rgba(99,102,241,0.3)] transition-all active:scale-[0.97]"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                        + สร้างแผนงานใหม่
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="ปริมาณงานรวม"
                    value={loading ? '...' : stats?.total_orders || '0'}
                    change={`${stats?.total_orders_change?.toFixed(1) || '0.0'}%`}
                    isPositive={(stats?.total_orders_change || 0) >= 0}
                    icon="📦"
                    accentColor="#7c3aed"
                />
                <KPICard
                    title="ส่งตรงเวลา"
                    value={loading ? '...' : `${stats?.on_time_rate || '0'}%`}
                    change={`${stats?.on_time_rate_change?.toFixed(1) || '0.0'}%`}
                    isPositive={(stats?.on_time_rate_change || 0) >= 0}
                    icon="⏱️"
                    accentColor="#3b82f6"
                />
                <KPICard
                    title="เส้นทางที่วิ่งอยู่"
                    value={loading ? '...' : stats?.active_routes || '0'}
                    change={`${stats?.active_routes_change?.toFixed(1) || '0.0'}%`}
                    isPositive={(stats?.active_routes_change || 0) >= 0}
                    icon="🚛"
                    accentColor="#10b981"
                />
                <KPICard
                    title="ต้นทุนโดยประมาณ"
                    value={loading ? '...' : `฿${(stats?.total_cost / 1000 || 0).toFixed(1)}k`}
                    change={`${stats?.total_cost_change?.toFixed(1) || '0.0'}%`}
                    isPositive={(stats?.total_cost_change || 0) <= 0} // Cost down is positive
                    icon="💰"
                    accentColor="#f59e0b"
                />
            </div>

            {/* Main Chart + Alerts & AI Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Live Logistics Pulse */}
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-base font-bold text-gray-800">สถานะการขนส่งแบบสด</h3>
                            <p className="text-[0.7rem] text-gray-400 uppercase tracking-widest font-semibold mt-0.5">ปริมาณออเดอร์เทียบกับความจุรถ</p>
                        </div>
                        <div className="flex items-center gap-4 mr-2">
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#7c3aed' }}></div>
                                    <span className="text-[0.7rem] text-gray-400 font-medium">ออเดอร์</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                                    <span className="text-[0.7rem] text-gray-400 font-medium">รถว่าง</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dx={-8} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="orders" stroke="#7c3aed" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOrders)" dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                                <Area type="monotone" dataKey="vehicles" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVehicles)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right Column: AI Health + Alerts */}
                <div className="flex flex-col gap-5">
                    <AIHealthPanel className="flex-shrink-0" />
                    <AlertsFeed alerts={stats?.recent_alerts} />
                </div>
            </div>

            {/* Fleet Distribution + Zone Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Fleet Distribution */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
                    <div className="flex-1 pr-4">
                        <h3 className="text-base font-bold text-gray-800 mb-1">การกระจายตัวของรถ</h3>
                        <p className="text-[0.7rem] text-gray-400 mb-6 max-w-[200px] leading-relaxed">การจัดสรรทรัพยากรตามโซนปฏิบัติงานจริงแบบเรียลไทม์</p>
                        <div className="space-y-4">
                            {(stats?.fleet_distribution || [
                                { label: 'กำลังวิ่งงาน', val: 0, color: '#7c3aed' },
                                { label: 'กำลังโหลดของ/ว่าง', val: 0, color: '#3b82f6' },
                                { label: 'ซ่อมบำรุง', val: 0, color: '#10b981' }
                            ]).map((item: any, i: number) => (
                                <div key={i}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || item.Color }}></div>
                                            <span className="text-[0.8rem] font-semibold text-gray-700">{item.label || item.Label}</span>
                                        </div>
                                        <span className="text-[0.8rem] font-bold text-gray-800">{item.val || item.Value || 0}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.val || item.Value || 0}%`, background: item.color || item.Color }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="h-[220px] w-[220px] relative shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={(stats?.fleet_distribution || []).map((d: any) => ({
                                        name: d.Label || d.label,
                                        value: d.Value || d.val
                                    }))}
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {(stats?.fleet_distribution || [0, 1, 2]).map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-bold text-gray-900" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                {stats?.fleet_distribution?.reduce((acc: number, curr: any) => acc + (curr.Value || curr.val || 0), 0) || 0}
                            </span>
                            <span className="text-[0.6rem] font-semibold text-gray-400 uppercase tracking-widest">ทั้งหมด</span>
                        </div>
                    </div>
                </div>

                {/* Zone Performance */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-base font-bold text-gray-800">ผลการดำเนินงานรายโซน</h3>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                            <span className="text-[0.7rem] text-gray-400 font-semibold uppercase">ออเดอร์</span>
                        </div>
                    </div>
                    <div className="h-[230px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barSize={28}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', radius: 6 }} />
                                <Bar dataKey="orders" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}