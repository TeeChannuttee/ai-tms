'use client'

import React, { useState, useEffect } from 'react'
import { customerAPI } from '../../lib/api'
import {
    Users,
    Search,
    Plus,
    MoreVertical,
    MapPin,
    Phone,
    Building2,
    X,
    Save,
    Edit,
    Trash2
} from 'lucide-react'

export default function CustomerManagementPage() {
    const [customers, setCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateModalOpen, setCreateModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<any>(null)

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        address: '',
        latitude: 13.736717,
        longitude: 100.523186,
        contact_name: '',
        contact_phone: ''
    })

    const fetchData = async () => {
        setLoading(true)
        try {
            const data = await customerAPI.list()
            setCustomers(data)
        } catch (err) {
            console.error("Failed to fetch customers:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCustomerAction = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const payload = {
                ...formData,
                latitude: Number(formData.latitude),
                longitude: Number(formData.longitude)
            }

            if (editingCustomer) {
                await customerAPI.update(editingCustomer.id, payload)
            } else {
                await customerAPI.create(payload)
            }

            setCreateModalOpen(false)
            setEditingCustomer(null)
            fetchData() // Refresh list
            setFormData({
                code: '',
                name: '',
                address: '',
                latitude: 13.736717,
                longitude: 100.523186,
                contact_name: '',
                contact_phone: ''
            })
        } catch (err) {
            alert(`ไม่สามารถ${editingCustomer ? 'อัปเดต' : 'เพิ่ม'}ลูกค้าได้ กรุณาตรวจสอบข้อมูล`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteCustomer = async (id: string) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้านี้?")) return
        try {
            await customerAPI.delete(id)
            fetchData()
        } catch (err: any) {
            alert("ลบลูกค้าไม่สำเร็จ: " + (err.message || "Unknown error"))
        }
    }

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500" style={{ background: '#f8fafc', minHeight: '100%', padding: '32px' }}>

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white border border-gray-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-xl shadow-teal-100">
                        <Users size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>จัดการลูกค้า</h1>
                        <p className="text-gray-400 text-sm font-medium mt-0.5">จัดการจุดส่งสินค้าและข้อมูลลูกค้า</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหาลูกค้า..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-4 focus:ring-teal-50 focus:border-teal-200 transition-all outline-none"
                        />
                    </div>
                    <button className="flex items-center gap-2 bg-teal-600 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-teal-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        onClick={() => {
                            setEditingCustomer(null)
                            setFormData({
                                code: '',
                                name: '',
                                address: '',
                                latitude: 13.736717,
                                longitude: 100.523186,
                                contact_name: '',
                                contact_phone: ''
                            })
                            setCreateModalOpen(true)
                        }}>
                        <Plus size={18} />
                        ลูกค้าใหม่
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col min-h-[500px]">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-teal-50 border-t-teal-500 rounded-full animate-spin"></div>
                        <p className="text-xs font-black text-gray-300 uppercase tracking-widest">กำลังโหลดข้อมูลลูกค้า...</p>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center">
                            <Users size={32} />
                        </div>
                        <p className="text-sm font-bold text-gray-400">ไม่พบข้อมูลลูกค้า</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">ชื่อลูกค้า</th>
                                    <th className="px-8 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">รหัส</th>
                                    <th className="px-8 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">ที่อยู่</th>
                                    <th className="px-8 py-5 text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">ผู้ติดต่อ</th>
                                    <th className="px-8 py-5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredCustomers.map((c) => (
                                    <tr key={c.id} className="hover:bg-teal-50/20 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                                                    <Building2 size={18} />
                                                </div>
                                                <span className="text-sm font-bold text-gray-900 group-hover:text-teal-600 transition-colors">{c.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">{c.code}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <MapPin size={14} className="flex-shrink-0" />
                                                <span className="text-xs truncate max-w-[300px]">{c.address}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {c.contact_name && (
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Phone size={14} />
                                                    <span className="text-xs">{c.contact_name} ({c.contact_phone})</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingCustomer(c)
                                                        setFormData({
                                                            code: c.code || '',
                                                            name: c.name || '',
                                                            address: c.address || '',
                                                            latitude: c.latitude || 13.7,
                                                            longitude: c.longitude || 100.5,
                                                            contact_name: c.contact_name || '',
                                                            contact_phone: c.contact_phone || ''
                                                        })
                                                        setCreateModalOpen(true)
                                                    }}
                                                    className="p-2 text-teal-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCustomer(c.id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Customer Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-teal-600 text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl">
                                    {editingCustomer ? <Edit size={24} /> : <Plus size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight leading-none">{editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'ลูกค้าใหม่'}</h2>
                                    <p className="text-white/60 text-[0.65rem] font-bold uppercase tracking-widest mt-1.5">
                                        {editingCustomer ? 'อัปเดตรายละเอียดลูกค้า' : 'เพิ่มลูกค้าลงในฐานข้อมูล'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => {
                                setCreateModalOpen(false)
                                setEditingCustomer(null)
                            }} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCustomerAction} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-1">
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-2">รหัสลูกค้า</label>
                                    <input
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-teal-50 outline-none transition-all"
                                        placeholder="เช่น CUST-009"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-2">ชื่อบริษัท</label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-teal-50 outline-none transition-all"
                                        placeholder="ชื่อบริษัท"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-2">ที่อยู่</label>
                                    <textarea
                                        required
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-teal-50 outline-none transition-all h-20 resize-none"
                                        placeholder="ที่อยู่เต็ม..."
                                    />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-2">ละติจูด</label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        value={formData.latitude}
                                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-teal-50 outline-none transition-all"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-2">ลองจิจูด</label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        value={formData.longitude}
                                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-teal-50 outline-none transition-all"
                                    />
                                </div>

                                <div className="col-span-2 grid grid-cols-2 gap-5">
                                    <div className="col-span-1">
                                        <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-2">ชื่อผู้ติดต่อ</label>
                                        <input
                                            value={formData.contact_name}
                                            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-teal-50 outline-none transition-all"
                                            placeholder="ไม่ระบุได้ (Optional)"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-2">เบอร์โทรศัพท์</label>
                                        <input
                                            value={formData.contact_phone}
                                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-teal-50 outline-none transition-all"
                                            placeholder="ไม่ระบุได้ (Optional)"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-teal-100 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        {editingCustomer ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลลูกค้า'}
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
