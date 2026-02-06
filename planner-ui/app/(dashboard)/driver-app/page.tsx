'use client'

import React, { useState } from 'react'

interface Task {
    id: string
    type: 'pickup' | 'delivery'
    address: string
    customer: string
    status: 'pending' | 'arrived' | 'completed' | 'failed'
    time: string
}

export default function DriverAppPage() {
    const [activeTab, setActiveTab] = useState<'tasks' | 'map'>('tasks')
    const [tasks, setTasks] = useState<Task[]>([
        { id: '1', type: 'pickup', customer: 'Distribution Center', address: 'Bang Na Km.12', status: 'completed', time: '08:00' },
        { id: '2', type: 'delivery', customer: '7-Eleven Asok', address: 'Sukhumvit 21', status: 'arrived', time: '09:30' },
        { id: '3', type: 'delivery', customer: 'Lotus Rama 4', address: 'Rama 4 Rd.', status: 'pending', time: '11:00' },
    ])
    const [showPOD, setShowPOD] = useState(false)

    const handleStatusUpdate = (id: string, newStatus: Task['status']) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t))
        if (newStatus === 'completed') setShowPOD(false)
    }

    return (
        <div className="flex justify-center items-start h-[calc(100vh-140px)]" style={{ background: '#f8fafc', padding: '32px' }}>
            {/* Mobile Frame */}
            <div className="w-[400px] bg-[#1a1a1a] border-[8px] border-[#2a2a2a] rounded-[3rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.12)] relative flex flex-col">
                {/* Status Bar */}
                <div className="bg-white text-gray-800 px-8 pt-4 pb-2 flex justify-between items-end relative">
                    <span className="text-xs font-semibold text-gray-700">9:41</span>
                    <div className="w-24 h-6 bg-[#1a1a1a] rounded-full absolute top-2 left-1/2 -translate-x-1/2 z-50"></div>
                    <div className="flex gap-1.5">
                        <span className="text-[10px] text-gray-600">5G</span>
                        <span className="text-[10px]">🔋</span>
                    </div>
                </div>

                <div className="flex-1 bg-gray-50 flex flex-col relative overflow-hidden">
                    {/* App Header */}
                    <div className="bg-white px-6 pt-4 pb-5 border-b border-gray-100">
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>สวัสดี, สมชาย 👋</h2>
                                <p className="text-[0.7rem] text-gray-400 font-medium">รถกระบะ 4 ล้อ • BKK-8812</p>
                            </div>
                            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200">
                                <img src="https://placehold.co/100x100/7c3aed/FFF?text=S" alt="Driver" />
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex gap-3">
                            <div className="flex-1 rounded-xl p-3 text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                                <p className="text-xl font-bold">12</p>
                                <p className="text-[0.6rem] opacity-80 uppercase tracking-wide font-semibold">งานคงเหลือ (Jobs Left)</p>
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-xl p-3">
                                <p className="text-xl font-bold text-emerald-600">98%</p>
                                <p className="text-[0.6rem] text-gray-400 uppercase tracking-wide font-semibold">ตรงเวลา (On Time)</p>
                            </div>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="px-5 pt-4 pb-3 bg-gray-50">
                        <div className="flex bg-gray-100 rounded-xl p-1">
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className="flex-1 py-2 rounded-lg text-[0.78rem] font-semibold transition-all"
                                style={{
                                    background: activeTab === 'tasks' ? 'white' : 'transparent',
                                    color: activeTab === 'tasks' ? '#1f2937' : '#9ca3af',
                                    boxShadow: activeTab === 'tasks' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                เส้นทางของฉัน (My Route)
                            </button>
                            <button
                                onClick={() => setActiveTab('map')}
                                className="flex-1 py-2 rounded-lg text-[0.78rem] font-semibold transition-all"
                                style={{
                                    background: activeTab === 'map' ? 'white' : 'transparent',
                                    color: activeTab === 'map' ? '#1f2937' : '#9ca3af',
                                    boxShadow: activeTab === 'map' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                แผนที่ (Map View)
                            </button>
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-3">
                        {tasks.map((task, i) => {
                            const isCompleted = task.status === 'completed'
                            const isArrived = task.status === 'arrived'
                            const isPending = task.status === 'pending'

                            return (
                                <div key={task.id} className="relative pl-5">
                                    {/* Connector line */}
                                    {i < tasks.length - 1 && (
                                        <div className="absolute left-[7px] top-5 bottom-0 w-px bg-gray-200"></div>
                                    )}
                                    {/* Status dot */}
                                    <div className="absolute left-0 top-4">
                                        {isCompleted && (
                                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                                                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
                                            </div>
                                        )}
                                        {isArrived && (
                                            <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]">
                                                <div className="w-full h-full rounded-full bg-blue-500 animate-pulse"></div>
                                            </div>
                                        )}
                                        {isPending && (
                                            <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-gray-300"></div>
                                        )}
                                    </div>

                                    {/* Card */}
                                    <div className="rounded-xl border p-3.5 transition-all"
                                        style={{
                                            background: isArrived ? '#eff6ff' : 'white',
                                            borderColor: isArrived ? '#bfdbfe' : '#f0f0f0',
                                            opacity: isCompleted ? 0.6 : 1
                                        }}>
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[0.65rem] font-semibold text-gray-400 font-mono">{task.time}</span>
                                                <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-md"
                                                    style={{
                                                        background: task.type === 'pickup' ? '#f5f3ff' : '#ecfdf5',
                                                        color: task.type === 'pickup' ? '#7c3aed' : '#16a34a'
                                                    }}>
                                                    {task.type === 'pickup' ? '📦 รับของ' : '🚚 ส่งของ'}
                                                </span>
                                            </div>
                                            <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-md uppercase"
                                                style={{
                                                    background: isCompleted ? '#ecfdf5' : isArrived ? '#eff6ff' : '#f3f4f6',
                                                    color: isCompleted ? '#16a34a' : isArrived ? '#2563eb' : '#6b7280'
                                                }}>{task.status}</span>
                                        </div>
                                        <h3 className="font-semibold text-gray-800 text-[0.82rem] mb-0.5">{task.customer}</h3>
                                        <p className="text-[0.7rem] text-gray-400 mb-2.5">{task.address}</p>

                                        {isArrived && (
                                            <button
                                                onClick={() => setShowPOD(true)}
                                                className="w-full py-2.5 text-white rounded-xl text-[0.75rem] font-semibold shadow-[0_3px_10px_rgba(59,130,246,0.3)] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                                            >
                                                📸 จบงาน & ถ่ายรูป (Complete & POD)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Floating Nav Button */}
                    <div className="absolute bottom-5 left-5 right-5">
                        <button className="w-full py-3.5 rounded-xl text-white font-semibold text-[0.8rem] shadow-[0_4px_16px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            📍 เริ่มนำทาง (Start Navigation)
                        </button>
                    </div>

                    {/* POD Modal */}
                    {showPOD && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 p-5 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-gray-900">หลักฐานการส่งสินค้า (POD)</h3>
                                <button onClick={() => setShowPOD(false)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-sm">✕</button>
                            </div>

                            {/* Photo Area */}
                            <div className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 mb-3 flex flex-col items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer">
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                                    <span className="text-xl">📷</span>
                                </div>
                                <span className="text-[0.7rem] font-semibold text-gray-500 uppercase tracking-wide">แตะเพื่อถ่ายภาพ</span>
                            </div>

                            {/* Signature */}
                            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-3 mb-3 min-h-0">
                                <p className="text-[0.65rem] text-gray-400 uppercase font-semibold tracking-wide mb-1.5">ลายเซ็นลูกค้า</p>
                                <div className="h-full bg-white rounded-lg border border-gray-100"></div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2.5">
                                <button onClick={() => setShowPOD(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-semibold text-[0.75rem] hover:bg-gray-200 transition-colors">ยกเลิก</button>
                                <button onClick={() => handleStatusUpdate('2', 'completed')} className="flex-1 py-2.5 text-white rounded-xl font-semibold text-[0.75rem]"
                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>ยืนยันการส่ง</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Home Indicator */}
                <div className="bg-[#1a1a1a] h-7 flex justify-center items-center">
                    <div className="w-28 h-1 bg-white/20 rounded-full"></div>
                </div>
            </div>

            {/* Desktop Promo Side */}
            <div className="hidden lg:flex flex-col justify-center ml-16 max-w-xs">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-5 w-fit">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    <span className="text-[0.7rem] font-semibold text-indigo-600 uppercase tracking-wide">ใช้งานผ่านมือถือ (Mobile First)</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    Driver <span style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Companion</span> App
                </h1>
                <p className="text-gray-500 text-[0.85rem] leading-relaxed mb-6">
                    เพิ่มศักยภาพให้ทีมรถของคุณด้วยประสบการณ์ Mobile-First นำทางแม่นยำ เก็บหลักฐานดิจิทัล และทำงานได้แม้ไม่มีสัญญาณ
                </p>
                <div className="flex gap-3">
                    <div className="w-11 h-11 bg-gray-900 rounded-xl flex items-center justify-center text-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)]">🍎</div>
                    <div className="w-11 h-11 bg-gray-900 rounded-xl flex items-center justify-center text-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)]">🤖</div>
                </div>
            </div>
        </div>
    )
}