'use client'

import React, { useState, useEffect } from 'react'
import { ordersAPI, fleetAPI } from '../../lib/api'
import {
    Package,
    Search,
    Plus,
    FileDown,
    Filter,
    MoreVertical,
    Clock,
    CheckCircle2,
    Truck,
    AlertTriangle,
    XCircle,
    Calendar,
    User,
    MapPin,
    X,
    Send,
    Edit,
    Trash2
} from 'lucide-react'

const statusConfig: Record<string, { bg: string; border: string; text: string; dot: string; label: string; icon: any }> = {
    'pending': { bg: '#fefce8', border: '#fde047', text: '#a16207', dot: '#ca8a04', label: 'รอดำเนินการ', icon: Clock },
    'assigned': { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#3b82f6', label: 'มอบหมายแล้ว', icon: User },
    'picked_up': { bg: '#f5f3ff', border: '#c4b5fd', text: '#6d28d9', dot: '#7c3aed', label: 'กำลังจัดส่ง', icon: Truck },
    'delivered': { bg: '#ecfdf5', border: '#a7f3d0', text: '#15803d', dot: '#10b981', label: 'จัดส่งแล้ว', icon: CheckCircle2 },
    'cancelled': { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: '#ef4444', label: 'ยกเลิก', icon: XCircle },
    'failed': { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', dot: '#f97316', label: 'ล้มเหลว', icon: AlertTriangle },
}

export default function OrderManagementPage() {
    // ... (state vars same as above) ...
    const [filter, setFilter] = useState('All')
    const [orders, setOrders] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateModalOpen, setCreateModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingOrder, setEditingOrder] = useState<any>(null)

    // Form State
    const [formData, setFormData] = useState({
        customer_id: '',
        pickup_address: '123 Rama IV Road, Bangkok (Central Depot)',
        delivery_address: '',
        pickup_time: new Date().toISOString().slice(0, 16),
        delivery_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        priority: 'normal',
        notes: ''
    })

    const filters = [
        { label: 'ทั้งหมด', value: 'All' },
        { label: 'รอดำเนินการ', value: 'pending' },
        { label: 'มอบหมายแล้ว', value: 'assigned' },
        { label: 'กำลังจัดส่ง', value: 'picked_up' },
        { label: 'จัดส่งแล้ว', value: 'delivered' },
        { label: 'ยกเลิก', value: 'cancelled' }
    ]

    const fetchData = async () => {
        setLoading(true)
        try {
            const [ordersData, customersData] = await Promise.all([
                ordersAPI.getOrders(filter === 'All' ? undefined : filter),
                fleetAPI.getCustomers()
            ])
            setOrders(ordersData)
            setCustomers(customersData)
            setError(null)
        } catch (err) {
            console.error("Failed to fetch data:", err)
            setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบว่า Backend ทำงานอยู่หรือไม่")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [filter])

    const handleOrderAction = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const payload = {
                ...formData,
                pickup_time: new Date(formData.pickup_time).toISOString(),
                delivery_time: new Date(formData.delivery_time).toISOString()
            }

            if (editingOrder) {
                await ordersAPI.updateOrder(editingOrder.id, payload)
            } else {
                await ordersAPI.createOrder(payload)
            }

            setCreateModalOpen(false)
            setEditingOrder(null)
            setFormData({
                customer_id: '',
                pickup_address: '123 Rama IV Road, Bangkok (Central Depot)',
                delivery_address: '',
                pickup_time: new Date().toISOString().slice(0, 16),
                delivery_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                priority: 'normal',
                notes: ''
            })
            fetchData() // Refresh list
        } catch (err) {
            alert(`ไม่สามารถ${editingOrder ? 'อัปเดต' : 'สร้าง'}ออเดอร์ได้ กรุณาตรวจสอบข้อมูล`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteOrder = async (id: string) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบออเดอร์นี้?")) return
        try {
            await ordersAPI.deleteOrder(id)
            fetchData() // Refresh list
        } catch (err) {
            alert("ลบออเดอร์ไม่สำเร็จ")
        }
    }

    const filteredOrders = orders.filter(o => {
        // Filter by Status (Client side filtering for 'All' to exclude 'cancelled' by default)
        if (filter === 'All' && o.status === 'cancelled') return false

        // Filter by Search Term
        return o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    })

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500" style={{ background: '#f8fafc', minHeight: '100%', padding: '32px' }}>

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white border border-gray-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                        <Package size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>จัดการออเดอร์</h1>
                        <p className="text-gray-400 text-sm font-medium mt-0.5">คลังข้อมูลกลางสำหรับการขนส่งและข้อตกลงการบริการ</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหาหมายเลขคำสั่งซื้อหรือลูกค้า..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all outline-none"
                        />
                    </div>
                    <button className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        onClick={() => setCreateModalOpen(true)}>
                        <Plus size={18} />
                        สร้างออเดอร์
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {filters.map(f => {
                        const isActive = filter === f.value
                        const cfg = statusConfig[f.value]
                        return (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${isActive
                                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                                    : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {cfg && <cfg.icon size={14} className={isActive ? 'text-white' : ''} />}
                                {f.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col min-h-[500px]">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-50 border-t-indigo-500 rounded-full animate-spin"></div>
                        <p className="text-xs font-black text-gray-300 uppercase tracking-widest">กำลังโหลดข้อมูลออเดอร์...</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                            <AlertTriangle size={32} />
                        </div>
                        <p className="text-sm font-bold text-gray-500">{error}</p>
                        <button onClick={() => fetchData()} className="text-indigo-600 text-xs font-black underline uppercase tracking-widest">ลองเชื่อมต่ออีกครั้ง</button>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center">
                            <Filter size={32} />
                        </div>
                        <p className="text-sm font-bold text-gray-400">ไม่พบออเดอร์ที่ค้นหา</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">ข้อมูลการขนส่ง</th>
                                    <th className="px-8 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">ลูกค้าและจุดส่ง</th>
                                    <th className="px-8 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">เวลาจัดส่งที่ต้องการ</th>
                                    <th className="px-8 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest text-center">สถานะ</th>
                                    <th className="px-8 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest text-center">ความสำคัญ</th>
                                    <th className="px-8 py-5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredOrders.map((order) => {
                                    const sc = statusConfig[order.status.toLowerCase()] || statusConfig['pending']
                                    const StatusIcon = sc.icon
                                    const isCritical = order.priority?.toLowerCase() === 'critical'
                                    const isHigh = order.priority?.toLowerCase() === 'high'

                                    return (
                                        <tr key={order.id} className="hover:bg-indigo-50/20 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase">{order.order_number}</span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Calendar size={12} className="text-gray-400" />
                                                        <span className="text-[0.65rem] font-bold text-gray-400 uppercase">
                                                            ORD-{order.id.slice(0, 4)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                                                        <MapPin size={18} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-800">{order.customer_name || 'ลูกค้าทั่วไป'}</span>
                                                        <span className="text-[0.7rem] text-gray-400 mt-0.5 truncate max-w-[200px]">{order.delivery_address}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={12} className="text-indigo-400" />
                                                        <span className="text-xs font-bold text-gray-700">
                                                            {new Date(order.delivery_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <span className="text-[0.65rem] font-medium text-gray-400 uppercase">
                                                        {new Date(order.delivery_time).toLocaleDateString('en-GB')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[0.62rem] font-black uppercase tracking-wider border transition-all"
                                                        style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                                                        <StatusIcon size={12} className={order.status === 'picked_up' ? 'animate-bounce' : ''} />
                                                        {sc.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[0.6rem] font-black uppercase tracking-tighter ${isCritical ? 'bg-red-50 text-red-600 border border-red-100' :
                                                        isHigh ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                            'bg-gray-50 text-gray-400 border border-gray-100'
                                                        }`}>
                                                        {order.priority?.toUpperCase() || 'NORMAL'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingOrder(order)
                                                            setFormData({
                                                                customer_id: order.customer_id,
                                                                pickup_address: order.pickup_address || '123 Rama IV Road, Bangkok (Central Depot)',
                                                                delivery_address: order.delivery_address,
                                                                pickup_time: new Date(order.pickup_time || Date.now()).toISOString().slice(0, 16),
                                                                delivery_time: new Date(order.delivery_time).toISOString().slice(0, 16),
                                                                priority: order.priority || 'normal',
                                                                notes: order.notes || ''
                                                            })
                                                            setCreateModalOpen(true)
                                                        }}
                                                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                        title="Edit Order"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteOrder(order.id)}
                                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Delete Order"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Order Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl">
                                    {editingOrder ? <Edit size={24} /> : <Plus size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight leading-none">{editingOrder ? 'อัปเดตการขนส่ง' : 'สร้างการขนส่งใหม่'}</h2>
                                    <p className="text-white/60 text-[0.65rem] font-bold uppercase tracking-widest mt-1.5">{editingOrder ? `กำลังแก้ไข ${editingOrder.order_number}` : 'ป้อนข้อมูลคำสั่งซื้อโดยตรง'}</p>
                                </div>
                            </div>
                            <button onClick={() => { setCreateModalOpen(false); setEditingOrder(null); }} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleOrderAction} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-2">เลือกลูกค้า</label>
                                    <select
                                        required
                                        value={formData.customer_id}
                                        onChange={(e) => {
                                            const cust = customers.find(c => c.id === e.target.value)
                                            setFormData({ ...formData, customer_id: e.target.value, delivery_address: cust?.address || '' })
                                        }}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                                    >
                                        <option value="">เลือกลูกค้า...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-2">จุดส่งสินค้า</label>
                                    <textarea
                                        required
                                        value={formData.delivery_address}
                                        onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all h-20 resize-none"
                                        placeholder="ที่อยู่จัดส่งเต็ม..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-2">เวลาที่ต้องส่งถึง</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.delivery_time}
                                        onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-2">ลำดับความสำคัญ</label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                                    >
                                        <option value="normal">ปกติ (Normal)</option>
                                        <option value="high">สูง (High)</option>
                                        <option value="critical">ด่วนที่สุด (Critical)</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        {editingOrder ? 'อัปเดตการขนส่ง' : 'ยืนยันการสร้างออเดอร์'}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                body { font-family: 'Inter', sans-serif; }
            `}</style>
        </div>
    )
}