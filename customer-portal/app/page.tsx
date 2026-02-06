'use client'

import { useState } from 'react'

export default function CustomerPortal() {
    const [trackingNumber, setTrackingNumber] = useState('')

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">
                        📦 AI-TMS Tracking
                    </h1>
                    <p className="text-gray-600 text-lg font-medium">
                        ติดตามสถานะการส่งของแบบเรียลไทม์
                    </p>
                </header>

                {/* Tracking Input */}
                <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-lg shadow-gray-100 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">🔍 ค้นหาพัสดุ</h2>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="ใส่หมายเลขติดตาม (เช่น ORD-001234)"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className="flex-1 px-6 py-4 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                        />
                        <button className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-200 text-white rounded-xl font-bold transition-all">
                            ค้นหา
                        </button>
                    </div>
                </div>

                {/* Sample Tracking Result */}
                <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-lg shadow-gray-100 mb-8">
                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">ORD-001234</h3>
                            <p className="text-gray-600 font-medium">ร้านสยาม 1 • Bangkok</p>
                        </div>
                        <span className="px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-bold text-sm">
                            กำลังจัดส่ง
                        </span>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200"></div>
                                <div className="w-0.5 h-full bg-gradient-to-b from-emerald-500 to-emerald-200"></div>
                            </div>
                            <div className="flex-1 pb-6">
                                <div className="text-gray-900 font-bold mb-1.5">รถกำลังเดินทาง</div>
                                <div className="text-gray-600 text-sm font-semibold">ETA: 10:30 น. (อีก 15 นาที)</div>
                                <div className="text-gray-400 text-xs mt-1.5 font-medium">อัพเดทล่าสุด: 10:15 น.</div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200"></div>
                                <div className="w-0.5 h-full bg-gradient-to-b from-emerald-500 to-emerald-200"></div>
                            </div>
                            <div className="flex-1 pb-6">
                                <div className="text-gray-900 font-bold mb-1.5">ออกจากคลังสินค้า</div>
                                <div className="text-gray-600 text-sm font-semibold">Warehouse 1, Bangkok</div>
                                <div className="text-gray-400 text-xs mt-1.5 font-medium">09:45 น.</div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200"></div>
                            </div>
                            <div className="flex-1">
                                <div className="text-gray-900 font-bold mb-1.5">รับออเดอร์แล้ว</div>
                                <div className="text-gray-600 text-sm font-semibold">คำสั่งซื้อได้รับการยืนยัน</div>
                                <div className="text-gray-400 text-xs mt-1.5 font-medium">09:00 น.</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map Placeholder */}
                <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-lg shadow-gray-100 mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">🗺️ ตำแหน่งรถ</h3>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl h-[400px] flex items-center justify-center">
                        <div className="text-center text-gray-400">
                            <div className="text-6xl mb-4">📍</div>
                            <p className="text-xl font-bold text-gray-700">Real-time Map</p>
                            <p className="text-sm mt-2 font-medium">Google Maps Integration</p>
                        </div>
                    </div>
                </div>

                {/* Delivery Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:shadow-blue-100 transition-all">
                        <div className="text-blue-600 text-sm font-bold mb-2 uppercase tracking-wider">ระยะทาง</div>
                        <div className="text-3xl font-black text-blue-900">15.8 km</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:shadow-emerald-100 transition-all">
                        <div className="text-emerald-600 text-sm font-bold mb-2 uppercase tracking-wider">เวลาโดยประมาณ</div>
                        <div className="text-3xl font-black text-emerald-900">15 นาที</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:shadow-purple-100 transition-all">
                        <div className="text-purple-600 text-sm font-bold mb-2 uppercase tracking-wider">คนขับ</div>
                        <div className="text-xl font-black text-purple-900">สมชาย ใจดี</div>
                        <div className="text-purple-600 text-sm font-bold mt-1">⭐ 4.8</div>
                    </div>
                </div>
            </div>
        </div>
    )
}