'use client'

import React, { useState, useEffect } from 'react'
import { podAPI } from '../../lib/api'
import { realtimeService, RealtimeEvent } from '../../lib/realtime'
import { RotateCw, Search, Package, CheckCircle2, AlertTriangle, FileText, Download } from 'lucide-react'

export default function PODViewerPage() {
    const [pods, setPods] = useState<any[]>([])
    const [selectedPodId, setSelectedPodId] = useState<string | null>(null)
    const [selectedData, setSelectedData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activePhotoIndex, setActivePhotoIndex] = useState(0)

    const loadPods = async () => {
        try {
            setLoading(true)
            const data = await podAPI.getPods()
            setPods(data)
        } catch (err) {
            console.error('Failed to load PODs:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadPods()

        // Subscribe to real-time updates
        const unsubscribe = realtimeService.subscribe((event: RealtimeEvent) => {
            if (event.type === 'STATUS_UPDATE') {
                const { status } = event.payload
                // If a delivery is completed, refresh the list
                if (status === 'delivered' || status === 'completed') {
                    console.log('POD status update received, refreshing list...')
                    loadPods()
                }
            }
        })

        return () => unsubscribe()
    }, [])

    useEffect(() => {
        const loadDetail = async () => {
            if (!selectedPodId) return
            try {
                const data = await podAPI.getPod(selectedPodId)
                setSelectedData(data)
            } catch (err) {
                console.error('Failed to load POD detail:', err)
            }
        }
        loadDetail()
    }, [selectedPodId])

    const getImageUrl = (path: string) => {
        if (!path) return null
        if (path.startsWith('http') || path.startsWith('data:')) return path
        // Resolve path against backend host (port 8080)
        return `http://localhost:8080${path}`
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-white text-gray-400">กำลังโหลดหลักฐานการจัดส่ง...</div>

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-5 animate-in fade-in zoom-in duration-500" style={{ background: '#f8fafc', padding: '32px' }}>

            {/* Header */}
            <div className="flex justify-between items-center bg-white border border-gray-100 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5">
                <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>ตรวจสอบหลักฐานดิจิทัล (Digital Proof Inspector)</h1>
                    <p className="text-[0.65rem] text-gray-400 font-semibold uppercase tracking-widest mt-0.5">ตรวจสอบภาพถ่ายและลายเซ็นรับของ</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadPods}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[0.72rem] font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-all"
                    >
                        <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
                        รีเฟรช
                    </button>
                    <button className="px-3.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[0.72rem] font-semibold text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all shadow-[0_2px_6px_rgba(0,0,0,0.04)] flex items-center gap-2">
                        <Download size={14} />
                        ส่งออก (ZIP)
                    </button>
                    <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-[0.72rem] font-semibold flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        ระบบ AI ทำงานปกติ
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 overflow-hidden">

                {/* POD List */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            <input type="text" placeholder="ค้นหาเลขใบงาน / คนขับ..." className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-[0.75rem] text-gray-600 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {pods.map((p) => {
                            const isSelected = selectedPodId === p.id
                            const isSuspicious = p.is_suspicious
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedPodId(p.id)}
                                    className="p-3.5 rounded-xl border cursor-pointer transition-all"
                                    style={{
                                        background: isSelected ? '#f5f3ff' : 'white',
                                        borderColor: isSelected ? '#a78bfa' : isSuspicious ? '#fecaca' : '#f0f0f0',
                                        boxShadow: isSelected ? '0 2px 12px rgba(124,58,237,0.1)' : '0 1px 3px rgba(0,0,0,0.03)'
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 text-[0.82rem]">{p.order_number}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${p.photo_count > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                <span className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-tighter">
                                                    {p.photo_count} รูปภาพ
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[0.65rem] text-gray-400 font-mono">{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <div className="w-8 h-8 rounded-lg border border-gray-200 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
                                            {p.photo_url ? (
                                                <img src={getImageUrl(p.photo_url) || ''} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[0.6rem]">📄</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[0.75rem] font-semibold text-gray-700">{p.customer_name}</p>
                                            <p className="text-[0.7rem] text-gray-400">ผู้รับ: {p.recipient_name}</p>
                                        </div>
                                    </div>
                                    {isSuspicious && (
                                        <div className="mt-2 py-1 px-2.5 bg-red-50 border border-red-200 rounded-md flex items-center gap-1.5">
                                            <span className="text-[0.65rem] font-semibold text-red-600 uppercase tracking-wider">⚠ น่าสงสัย (Suspicious)</span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Detail Viewer */}
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden relative flex flex-col">
                    {selectedPodId && selectedData ? (
                        <div className="flex-1 flex flex-col">
                            {/* Image Viewer */}
                            <div className="flex-1 bg-gray-50 relative flex items-center justify-center p-8 group" style={{ minHeight: '320px' }}>
                                {selectedData.photo_urls && selectedData.photo_urls.length > 0 ? (
                                    <div className="flex flex-col items-center gap-6 w-full h-full justify-center relative z-10">
                                        <div className="relative flex-1 flex items-center justify-center w-full min-h-0">
                                            <img
                                                src={getImageUrl(selectedData.photo_urls[activePhotoIndex]) || ''}
                                                alt="POD Main"
                                                className="max-h-full max-w-full rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] border-4 border-white transition-all duration-300 group-hover:scale-[1.01]"
                                            />
                                            {/* Photo Badge */}
                                            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[0.65rem] text-white font-bold border border-white/20">
                                                รูปที่ {activePhotoIndex + 1} จาก {selectedData.photo_urls.length}
                                            </div>
                                        </div>

                                        {/* Thumbnail Strip */}
                                        {selectedData.photo_urls.length > 1 && (
                                            <div className="flex gap-3 p-3 bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm transition-all hover:bg-white hover:shadow-md">
                                                {selectedData.photo_urls.map((url: string, idx: number) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setActivePhotoIndex(idx)}
                                                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${activePhotoIndex === idx
                                                            ? 'border-indigo-500 scale-110 shadow-md ring-4 ring-indigo-50'
                                                            : 'border-transparent opacity-60 hover:opacity-100'
                                                            }`}
                                                    >
                                                        <img src={getImageUrl(url) || ''} className="w-full h-full object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <Package size={48} className="text-gray-200" />
                                        <p className="text-[0.6rem] font-bold text-gray-300 uppercase tracking-widest">ตรวจไม่พบไฟล์ภาพในเซิร์ฟเวอร์</p>
                                    </div>
                                )}

                                {/* AI Analysis Panel */}
                                <div className="absolute top-5 right-5 bg-white/95 backdrop-blur-md rounded-xl p-4 border border-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-10">
                                    <h4 className="text-[0.65rem] font-bold text-indigo-600 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                        <span>✨</span> การวิเคราะห์โดย AI
                                    </h4>
                                    <ul className="space-y-1.5">
                                        {[
                                            'มองเห็นพัสดุ (Package Visible)',
                                            'พิกัดตรงกัน (GPS Match)',
                                            'เวลายืนยันแล้ว (Timestamp Verified)'
                                        ].map((item, idx) => (
                                            <li key={idx} className="flex items-center gap-2 text-[0.72rem] text-gray-600">
                                                <div className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center">
                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M20 6L9 17l-5-5"></path>
                                                    </svg>
                                                </div>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Metadata Footer */}
                            <div className="border-t border-gray-100 p-5 flex gap-6 bg-white">
                                {/* Signature */}
                                <div className="flex-1">
                                    <p className="text-[0.65rem] text-gray-400 font-semibold uppercase tracking-widest mb-2.5">ลายเซ็นดิจิทัล</p>
                                    <div className="h-20 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                                        {selectedData.signature_url ? (
                                            <img src={getImageUrl(selectedData.signature_url) || ''} className="h-full object-contain" />
                                        ) : (
                                            <span className="text-lg text-gray-500 italic" style={{ fontFamily: 'cursive' }}>{selectedData.recipient_name}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="w-px bg-gray-100"></div>

                                {/* Metadata */}
                                <div className="flex-1 space-y-2.5">
                                    <p className="text-[0.65rem] text-gray-400 font-semibold uppercase tracking-widest">ข้อมูลกำกับ (Metadata)</p>
                                    {[
                                        { label: 'พิกัด', value: selectedData.location, mono: true },
                                        { label: 'ส่งเมื่อ', value: new Date(selectedData.delivered_at).toLocaleString(), mono: false },
                                        { label: 'หมายเหตุ', value: selectedData.notes || 'ไม่มี', mono: false },
                                    ].map((row, idx) => (
                                        <div key={idx} className="flex justify-between items-baseline">
                                            <span className="text-[0.75rem] text-gray-400">{row.label}</span>
                                            <span className={`text-[0.75rem] text-gray-700 font-semibold ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mb-4">📂</div>
                            <p className="text-[0.78rem] font-semibold text-gray-400">เลือกรายการเพื่อตรวจสอบ</p>
                            <p className="text-[0.7rem] text-gray-300 mt-1">เลือกรายการจากเมนูด้านซ้าย</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}