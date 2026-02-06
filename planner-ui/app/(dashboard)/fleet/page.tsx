"use client"

import React, { useState, useEffect } from 'react'
import { fleetAPI } from '../../lib/api'

interface Vehicle {
    id: string
    license_plate: string
    type: string
    capacity: number
    cost_per_km: number
    status: string
}

export default function FleetPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
    const [formData, setFormData] = useState({
        license_plate: '',
        type: 'Truck 4-Wheel',
        capacity: 2000,
        cost_per_km: 12.0
    })
    const [editFormData, setEditFormData] = useState({
        status: 'available',
        capacity: 2000,
        cost_per_km: 12.0
    })

    const fetchVehicles = async () => {
        try {
            setLoading(true)
            const data = await fleetAPI.getVehicles()
            setVehicles(data)
        } catch (error) {
            console.error('Failed to fetch vehicles:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVehicles()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await fleetAPI.createVehicle(formData)
            setIsModalOpen(false)
            setFormData({ license_plate: '', type: 'Truck 4-Wheel', capacity: 2000, cost_per_km: 12.0 })
            fetchVehicles()
        } catch (error) {
            alert('เพิ่มรถไม่สำเร็จ: ' + error)
        }
    }

    const handleEdit = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle)
        setEditFormData({
            status: vehicle.status,
            capacity: vehicle.capacity,
            cost_per_km: vehicle.cost_per_km
        })
        setIsEditModalOpen(true)
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingVehicle) return

        try {
            await fleetAPI.updateVehicle(editingVehicle.id, editFormData)
            setIsEditModalOpen(false)
            setEditingVehicle(null)
            fetchVehicles()
        } catch (error) {
            alert('อัปเดตไม่สำเร็จ: ' + error)
        }
    }

    const handleDelete = async (vehicle: Vehicle) => {
        if (!confirm(`ต้องการลบรถทะเบียน ${vehicle.license_plate} หรือไม่?`)) return

        try {
            await fleetAPI.deleteVehicle(vehicle.id)
            fetchVehicles()
        } catch (error) {
            alert('ลบไม่สำเร็จ: ' + error)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">จัดการรถและคนขับ</h1>
                    <p className="text-gray-500 text-sm">จัดการข้อมูลยานพาหนะและการขนส่ง</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                >
                    <span className="text-lg">➕</span> เพิ่มรถใหม่
                </button>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 flex flex-col items-center justify-center text-gray-400">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-bold">กำลังโหลดข้อมูล...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vehicles.map((v) => (
                        <div key={v.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                    {v.type.includes('Truck') ? '🚛' : v.type.includes('Van') ? '🚐' : '🏍️'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[0.65rem] font-black uppercase tracking-wider ${v.status === 'available' || v.status === 'active' ? 'bg-emerald-50 text-emerald-600' : v.status === 'maintenance' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'
                                        }`}>
                                        {v.status === 'available' ? 'พร้อมใช้' : v.status === 'active' ? 'กำลังใช้งาน' : v.status === 'maintenance' ? 'ซ่อมบำรุง' : v.status}
                                    </span>
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mb-1">{v.license_plate}</h3>
                            <p className="text-gray-500 text-sm font-medium mb-4">{v.type}</p>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                                <div>
                                    <p className="text-[0.6rem] text-gray-400 uppercase font-black tracking-widest mb-1">น้ำหนักบรรทุก</p>
                                    <p className="text-sm font-bold text-gray-700">{v.capacity.toLocaleString()} kg</p>
                                </div>
                                <div>
                                    <p className="text-[0.6rem] text-gray-400 uppercase font-black tracking-widest mb-1">ต้นทุน/กม.</p>
                                    <p className="text-sm font-bold text-gray-700">฿{v.cost_per_km.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                                <button
                                    onClick={() => handleEdit(v)}
                                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-1"
                                >
                                    ✏️ แก้ไข
                                </button>
                                <button
                                    onClick={() => handleDelete(v)}
                                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-1"
                                >
                                    🗑️ ลบ
                                </button>
                            </div>
                        </div>
                    ))}
                    {vehicles.length === 0 && (
                        <div className="col-span-full bg-white rounded-2xl p-20 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                            <span className="text-5xl mb-4">🚛</span>
                            <p className="font-bold text-lg">ยังไม่มีรถในระบบ</p>
                            <p className="text-sm">เพิ่มรถคันแรกเพื่อเริ่มใช้งาน</p>
                        </div>
                    )}
                </div>
            )}

            {/* Add Vehicle Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-black text-gray-900">เพิ่มรถใหม่</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-1.5">ทะเบียนรถ</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                    placeholder="เช่น 1กข-9999"
                                    value={formData.license_plate}
                                    onChange={e => setFormData({ ...formData, license_plate: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-1.5">ประเภทรถ</label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="Truck 4-Wheel">รถกระบะ 4 ล้อ</option>
                                        <option value="Truck 6-Wheel">รถบรรทุก 6 ล้อ</option>
                                        <option value="Van">รถตู้</option>
                                        <option value="Motorcycle">รถจักรยานยนต์</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-1.5">น้ำหนักบรรทุก (kg)</label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-1.5">ต้นทุนต่อ กม. (บาท)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                    value={formData.cost_per_km}
                                    onChange={e => setFormData({ ...formData, cost_per_km: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                >
                                    ลงทะเบียนรถ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Vehicle Modal */}
            {isEditModalOpen && editingVehicle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">แก้ไขข้อมูลรถ</h2>
                                <p className="text-sm text-gray-500 mt-1">ทะเบียน: {editingVehicle.license_plate}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-1.5">สถานะ</label>
                                <select
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                    value={editFormData.status}
                                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                                >
                                    <option value="available">พร้อมใช้งาน</option>
                                    <option value="active">กำลังใช้งาน</option>
                                    <option value="maintenance">ซ่อมบำรุง</option>
                                    <option value="inactive">ไม่ใช้งาน</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-1.5">น้ำหนักบรรทุก (kg)</label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                        value={editFormData.capacity}
                                        onChange={e => setEditFormData({ ...editFormData, capacity: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-1.5">ต้นทุน/กม. (บาท)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.1"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                        value={editFormData.cost_per_km}
                                        onChange={e => setEditFormData({ ...editFormData, cost_per_km: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                                >
                                    บันทึกการเปลี่ยนแปลง
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
