'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../lib/api'
import SignatureCanvas from 'react-signature-canvas'

// UI Interfaces
interface Task {
    id: string
    type: 'pickup' | 'delivery'
    address: string
    customer: string
    status: 'pending' | 'enroute' | 'arrived' | 'completed' | 'delivered' | 'failed'
    time: string
    orderId: string
}

const FAILED_REASONS = [
    'ลูกค้าไม่อยู่ (Customer Not Home)',
    'ติดต่อไม่ได้ (Cannot Contact)',
    'ลูกค้าปฏิเสธการรับ (Customer Refused)',
    'เข้าพื้นที่ไม่ได้ (Access Denied)',
    'ที่อยู่ผิด (Wrong Address)',
    'สินค้าเสียหาย (Damaged Goods)',
    'อื่นๆ (Other)'
]

export default function DriverAppPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'tasks' | 'map'>('tasks')
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [driverName, setDriverName] = useState('Driver')
    const [driverTruck, setDriverTruck] = useState('Truck 4-Wheel')

    // POD State
    const [showPOD, setShowPOD] = useState(false)
    const [showFailModal, setShowFailModal] = useState(false)
    const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
    const [currentStopId, setCurrentStopId] = useState<string | null>(null)
    const [podFile, setPodFile] = useState<File | null>(null)
    const [recipientName, setRecipientName] = useState('')
    const [submittingPOD, setSubmittingPOD] = useState(false)
    const [failedReason, setFailedReason] = useState(FAILED_REASONS[0])

    // Status Update Loading
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

    const signatureRef = useRef<SignatureCanvas>(null)

    useEffect(() => {
        const token = localStorage.getItem('token')
        const dId = localStorage.getItem('driver_id')
        const dName = localStorage.getItem('driver_name')

        if (!token || !dId) {
            router.push('/login')
            return
        }
        setDriverName(dName || 'Driver')
        fetchJobs(token, dId)
    }, [])

    const fetchJobs = async (token: string, driverId: string) => {
        try {
            const routes = await api.getMyJobs(token, driverId)
            if (routes.length > 0) {
                const activeRoute = routes[0]
                const mappedTasks: Task[] = activeRoute.stops.map((stop: any) => ({
                    id: stop.id, // Stop ID for status updates
                    orderId: stop.order_id,
                    type: 'delivery',
                    address: stop.address || 'Unknown Location',
                    customer: stop.customer_name || 'Customer',
                    status: stop.status || 'pending',
                    time: new Date(stop.arrival_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                }))
                setTasks(mappedTasks)
            } else {
                setTasks([])
            }
        } catch (err) {
            console.error("FetchJobs error:", err)
        } finally {
            setLoading(false)
        }
    }

    const getCurrentLocation = (): Promise<{ lat: number, lng: number }> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ lat: 0, lng: 0 })
                return
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve({ lat: 0, lng: 0 }),
                { timeout: 5000 }
            )
        })
    }

    const handleStatusChange = async (task: Task, newStatus: string) => {
        setUpdatingStatus(task.id)
        try {
            const token = localStorage.getItem('token') || ''
            const pos = await getCurrentLocation()
            await api.updateStopStatus(token, task.id, newStatus, pos.lat, pos.lng)

            // Update local state
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus as any } : t))
        } catch (err) {
            alert('ล้มเหลวในการอัปเดตสถานะ')
        } finally {
            setUpdatingStatus(null)
        }
    }

    const submitFailStatus = async () => {
        if (!currentStopId) return
        setSubmittingPOD(true)
        try {
            const token = localStorage.getItem('token') || ''
            const pos = await getCurrentLocation()
            await api.updateStopStatus(token, currentStopId, 'failed', pos.lat, pos.lng)

            setTasks(prev => prev.map(t => t.id === currentStopId ? { ...t, status: 'failed' } : t))
            setShowFailModal(false)
            alert('บันทึกแจ้งส่งไม่สำเร็จจำเพาะ: ' + failedReason)
        } catch (err) {
            alert('เกิดข้อผิดพลาด')
        } finally {
            setSubmittingPOD(false)
        }
    }

    const submitPOD = async () => {
        if (!currentOrderId || !currentStopId || !podFile || !recipientName || signatureRef.current?.isEmpty()) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน (รูปถ่าย, ชื่อผู้รับ, ลายเซ็น)')
            return
        }
        setSubmittingPOD(true)

        try {
            const token = localStorage.getItem('token') || ''

            // 1. Create POD Record
            const podRes = await api.createPOD(token, currentOrderId, recipientName)
            const podId = podRes.pod_id

            // 2. Upload Photo & Signature
            await api.uploadPOD(token, podId, podFile)
            const signatureData = signatureRef.current.getTrimmedCanvas().toDataURL('image/png')
            await api.uploadSignature(token, podId, signatureData)

            // 3. Finalize Status with GPS
            const pos = await getCurrentLocation()
            await api.updateStopStatus(token, currentStopId, 'delivered', pos.lat, pos.lng)

            // 4. Update UI locally
            setTasks(prev => prev.map(t => t.id === currentStopId ? { ...t, status: 'completed' } : t))
            setShowPOD(false)
            setPodFile(null)
            setRecipientName('')
            setCurrentOrderId(null)
            setCurrentStopId(null)

            alert('ส่งงานสำเร็จ! บันทึกหลักฐานเรียบร้อย')
        } catch (err) {
            console.error(err)
            alert('เกิดข้อผิดพลาดในการส่งงาน')
        } finally {
            setSubmittingPOD(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-indigo-600">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
            <p className="font-bold">AI-TMS กำลังซิงค์ข้อมูล...</p>
        </div>
    )

    const jobsLeft = tasks.filter(t => t.status !== 'completed' && t.status !== 'delivered').length
    const nextStopIndex = tasks.findIndex(t => t.status !== 'completed' && t.status !== 'delivered')

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-32">
            {/* Header */}
            <div className="bg-white px-6 pt-12 pb-5 border-b border-gray-100 shadow-sm sticky top-0 z-10">
                <div className="flex justify-between items-center mb-5">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{driverName} 🚛</h2>
                        <p className="text-[0.6rem] text-gray-400 font-bold mt-1 uppercase tracking-widest">{driverTruck} • AI-Optimized</p>
                    </div>
                    <button onClick={() => { localStorage.clear(); router.push('/login'); }} className="bg-red-50 text-red-500 text-[0.65rem] font-bold px-3 py-2 rounded-xl">Logout</button>
                </div>

                <div className="flex gap-3">
                    <div className="flex-1 bg-indigo-600 rounded-[1.5rem] p-4 text-white shadow-lg shadow-indigo-100">
                        <p className="text-2xl font-black mb-0.5">{jobsLeft}</p>
                        <p className="text-[0.55rem] opacity-70 uppercase tracking-widest font-black">Remaining</p>
                    </div>
                    <div className="flex-1 bg-white border border-gray-100 rounded-[1.5rem] p-4 shadow-sm">
                        <p className="text-2xl font-black text-emerald-500 mb-0.5">98%</p>
                        <p className="text-[0.55rem] text-gray-400 uppercase tracking-widest font-black">On-Time</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 py-4">
                <div className="flex bg-gray-200/50 p-1 rounded-2xl">
                    <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'tasks' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>JOBS</button>
                    <button onClick={() => setActiveTab('map')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>LOCATIONS</button>
                </div>
            </div>

            {/* Task List */}
            <div className={`flex-1 px-6 space-y-0 ${activeTab === 'map' ? 'hidden' : ''}`}>
                {tasks.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 px-6">
                        <p className="text-gray-400 font-bold mb-4">No tasks assigned today</p>
                        <button onClick={() => window.location.reload()} className="bg-indigo-50 text-indigo-600 px-8 py-3 rounded-2xl font-black text-sm">Refresh</button>
                    </div>
                ) : (
                    tasks.map((task, i) => {
                        const isCompleted = task.status === 'completed' || task.status === 'delivered'
                        const isFailed = task.status === 'failed'
                        const isCurrent = i === nextStopIndex
                        const statusColor = isFailed ? 'bg-red-500' : task.status === 'enroute' ? 'bg-amber-500' : task.status === 'arrived' ? 'bg-indigo-500' : isCompleted ? 'bg-emerald-500' : 'bg-gray-200'

                        return (
                            <div key={task.id} className="relative pl-8 pb-8">
                                {i < tasks.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-100"></div>}
                                <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm z-10 ${statusColor}`}></div>

                                <div className={`bg-white rounded-[2rem] p-6 border-2 transition-all ${isCurrent && !isCompleted && !isFailed ? 'border-indigo-100 shadow-xl scale-[1.02]' : 'border-gray-50 shadow-sm'} ${isCompleted ? 'opacity-40 grayscale' : ''} ${isFailed ? 'border-red-100 bg-red-50/10' : ''}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-2">
                                            <span className={`px-3 py-1 rounded-lg text-[0.6rem] font-black uppercase tracking-tighter ${task.type === 'pickup' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>{task.type}</span>
                                            {isFailed && <span className="bg-red-100 text-red-600 text-[0.6rem] font-black px-2 py-1 rounded-lg uppercase">FAILED</span>}
                                        </div>
                                        <span className="text-[0.7rem] font-black text-gray-300">{task.time}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900 mb-1">{task.customer}</h3>
                                    <p className="text-xs text-gray-400 font-bold leading-relaxed mb-6">{task.address}</p>

                                    {/* Action Workflow */}
                                    {isCurrent && !isCompleted && !isFailed && (
                                        <div className="space-y-3">
                                            {task.status === 'pending' && (
                                                <button onClick={() => handleStatusChange(task, 'enroute')} disabled={updatingStatus === task.id} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-100 active:scale-95 transition-all">START ENROUTE</button>
                                            )}
                                            {task.status === 'enroute' && (
                                                <button onClick={() => handleStatusChange(task, 'arrived')} disabled={updatingStatus === task.id} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 active:scale-95 transition-all">I HAVE ARRIVED</button>
                                            )}
                                            {task.status === 'arrived' && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setCurrentOrderId(task.orderId); setCurrentStopId(task.id); setShowPOD(true); }} className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 active:scale-95 transition-all">DELIVER</button>
                                                    <button onClick={() => { setCurrentStopId(task.id); setShowFailModal(true); }} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-red-100 active:scale-95 transition-all">FAIL</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {isCompleted && (
                                        <div className="flex items-center gap-2 text-emerald-500 font-black text-[0.7rem] uppercase tracking-widest">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                            Delivered
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Float Navigation */}
            {nextStopIndex !== -1 && (
                <div className="fixed bottom-8 left-6 right-6 z-30">
                    <button
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(tasks[nextStopIndex].address)}`, '_blank')}
                        className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-sm shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        <span className="bg-indigo-500 w-8 h-8 rounded-xl flex items-center justify-center text-xs">📍</span>
                        OPEN NAVIGATION
                    </button>
                </div>
            )}

            {/* POD Modal */}
            {showPOD && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 animate-in slide-in-from-bottom-32 duration-500 overflow-y-auto max-h-[92vh]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-gray-900 italic">POD EVIDENCE</h3>
                            <button onClick={() => setShowPOD(false)} className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center font-black">✕</button>
                        </div>

                        <div className="space-y-8 mb-10">
                            <label className={`block w-full aspect-video rounded-[2.5rem] border-4 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center
                                ${podFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-indigo-400'}`}>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && setPodFile(e.target.files[0])} />
                                {podFile ? <p className="text-emerald-600 font-black">📸 Photo Ready</p> : <p className="text-gray-300 font-black uppercase tracking-widest text-xs">Tap to capture photo</p>}
                            </label>

                            <div>
                                <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="RECIPIENT NAME" className="w-full px-8 py-5 bg-gray-50 rounded-[2rem] focus:ring-4 ring-indigo-50 outline-none font-black" />
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-[0.6rem] font-black text-gray-400 uppercase tracking-widest ml-4">Customer Signature</label>
                                    <button onClick={() => signatureRef.current?.clear()} className="text-[0.6rem] font-black text-indigo-500 uppercase tracking-widest mr-4">Clear</button>
                                </div>
                                <div className="bg-gray-50 rounded-[2rem] h-48 border-2 border-gray-100 overflow-hidden">
                                    <SignatureCanvas ref={signatureRef} penColor='black' canvasProps={{ className: 'w-full h-full' }} />
                                </div>
                            </div>
                        </div>

                        <button onClick={submitPOD} disabled={submittingPOD} className={`w-full py-6 rounded-[2.5rem] font-black text-lg shadow-2xl transition-all
                            ${submittingPOD ? 'bg-gray-100 text-gray-400' : 'bg-emerald-500 text-white shadow-emerald-100 active:scale-95'}`}>
                            {submittingPOD ? 'FINALIZING...' : 'FINISH JOB'}
                        </button>
                    </div>
                </div>
            )}

            {/* Fail Modal */}
            {showFailModal && (
                <div className="fixed inset-0 z-50 bg-red-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 animate-in slide-in-from-bottom-20">
                        <h3 className="text-2xl font-black text-red-600 mb-6 italic">DELIVERY FAILED</h3>
                        <p className="text-gray-400 text-xs font-bold mb-4 uppercase ml-2">Select Reason:</p>
                        <div className="space-y-2 mb-8">
                            {FAILED_REASONS.map(r => (
                                <button key={r} onClick={() => setFailedReason(r)} className={`w-full p-4 rounded-xl text-left text-sm font-bold transition-all ${failedReason === r ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-50 text-gray-600'}`}>{r}</button>
                            ))}
                        </div>
                        <button onClick={submitFailStatus} className="w-full py-5 bg-red-500 text-white rounded-[2rem] font-black shadow-xl shadow-red-100 mb-2">CONFIRM FAILURE</button>
                        <button onClick={() => setShowFailModal(false)} className="w-full py-5 text-gray-400 font-black">CANCEL</button>
                    </div>
                </div>
            )}
        </div>
    )
}
