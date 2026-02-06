'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, Bot, User, ChevronRight, AlertCircle } from 'lucide-react'
import { analyticsAPI } from '../../lib/api'

// AI Copilot v1.1 - Fully integrated with ai-service
const AI_SERVICE_URL = 'http://localhost:8000/api/v1'

interface Message {
    id: string
    role: 'ai' | 'user'
    text: string
    timestamp: Date
    suggestions?: string[]
    actions?: any[]
}

export default function CopilotPage() {
    const [query, setQuery] = useState('')
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'ai',
            text: 'สวัสดีครับ! ผมคือ AI Copilot ของ AI-TMS มีอะไรให้ช่วยเกี่ยวกับการจัดสายส่งหรือตรวจสอบสถานะวันนี้มั้ยครับ?',
            timestamp: new Date(),
            suggestions: ['สรุปงานวันนี้ให้หน่อย', 'มีรถคันไหนส่งช้าไหม?', 'แนะนำวิธีลดค่าขนส่ง']
        }
    ])
    const [isTyping, setIsTyping] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    /*
# Enterprise Logistics Ecosystem - Full Integration

The AI-TMS system is now fully operational across all 3 tiers. All simulations have been replaced with real-world data flows.

## 🏗️ 3-Tier Architecture
- **Backend (Go/Gin)**: Standardized API endpoints for Analytics, Fleet, and Tracking. Real GORM queries now drive the dashboard.
- **Planner UI (Next.js)**: 
    - **Control Tower**: Live KPIs (Volume, OTD, Routes) connected to `/analytics/dashboard`.
    - **Dispatch Operations**: Real-time fleet map integrated with SSE (Server-Sent Events) for live vehicle movement.
    - **AI Copilot**: Functional Thai-language chat interface connected to the `ai-service` (Port 8000) for logistics optimization.
- **Driver Mobile (Expo/React Native)**: Field-tested telemetry and stop-sequencing flow (Arrived -> Deliver -> POD).

## 📱 Operational Flow
1. **Driver Action**: Start Route/Arrive/Deliver.
2. **Telemetry**: Background GPS pings sent to `/telemetry`.
3. **SSE Broadcast**: Backend broadcasts updates to the Planner UI.
4. **Dispatcher View**: Truck icons move on the map and KPIs auto-update without refresh.

## 🤖 AI Field Intelligence
- **AI Copilot**: Dispatchers can query "รถคันไหนกำลังล่าช้า?" (Which trucks are late?) to get intelligent analysis from the ML models.
- **ETA Prediction**: Real-time arrival forecasting based on GPS coordinates.

---
### 🧪 Final Verification Steps
1. **Real-time Loop**:
   - Run Driver App and start a route.
   - Open **Dispatch Monitoring** on Planner UI.
   - Verify the vehicle status changes in real-time.
2. **AI Copilot Test**:
   - Go to **AI Copilot** tab.
   - Ask "ช่วยสรุปสถานะการขนส่งวันนี้หน่อย" (Summarize today's transport status).
   - Verify the AI responds using real operational context.
3. **KPI Accuracy**:
   - Complete a delivery on the mobile app.
   - Refresh the **Dashboard**.
   - Verify "Completed Today" count incremented.
*/
    const [stats, setStats] = useState<any>(null)

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await analyticsAPI.getDashboard()
                setStats(data)
            } catch (err) {
                console.error('Failed to load stats for copilot:', err)
            }
        }
        loadStats()
    }, [])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async (e?: React.FormEvent, overrideQuery?: string) => {
        if (e) e.preventDefault()
        const textToSend = overrideQuery || query
        if (!textToSend.trim()) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: textToSend,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg])
        setQuery('')
        setIsTyping(true)

        try {
            const res = await fetch(`${AI_SERVICE_URL}/copilot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: userMsg.text,
                    user_role: 'planner',
                    context: {
                        total_orders: stats?.total_orders,
                        pending_orders: stats?.pending_orders,
                        active_routes: stats?.active_routes,
                        on_time_rate: stats?.on_time_rate,
                        total_cost: stats?.total_cost,
                        recent_alerts: stats?.recent_alerts,
                        fleet_distribution: stats?.fleet_distribution,
                        timestamp: new Date().toISOString()
                    }
                })
            })

            const data = await res.json()

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: data.answer,
                timestamp: new Date(),
                suggestions: data.suggestions || ['สรุปงานวันนี้ให้หน่อย', 'มีรถคันไหนส่งช้าไหม?', 'แนะนำวิธีลดค่าขนส่ง'],
                actions: data.actions
            }

            setMessages(prev => [...prev, aiMsg])
        } catch (err) {
            console.error('AI Service Error:', err)
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: 'ขออภัยครับ ดูเหมือนการเชื่อมต่อกับ AI Service จะขัดข้อง รบกวนลองใหม่อีกครั้งนะครับ',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col max-w-5xl mx-auto bg-white border border-gray-100 rounded-3xl shadow-[0_4px_32px_rgba(0,0,0,0.06)] overflow-hidden">

            {/* Header */}
            <div className="px-8 py-5 border-b border-gray-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-indigo-100">
                        <Sparkles color="white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight">AI Copilot</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest">ขับเคลื่อนโดย TMS-Intelligence v1.0</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-100 shadow-sm'}`}>
                                {msg.role === 'user' ? <User size={16} className="text-indigo-600" /> : <Bot size={16} className="text-gray-600" />}
                            </div>
                            <div className="space-y-3">
                                <div className={`px-5 py-3.5 rounded-2xl text-[0.92rem] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white font-medium' : 'bg-gray-50 text-gray-800 border border-gray-100'}`}>
                                    {msg.text}
                                </div>
                                {msg.suggestions && msg.suggestions.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {msg.suggestions.map((s, i) => (
                                            <button key={i} onClick={() => { setQuery(s); handleSend(); }} className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {msg.actions && msg.actions.map((act: any, i: number) => (
                                    <button key={i} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all">
                                        <ChevronRight size={14} /> {act.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                            <Bot size={16} className="text-gray-400" />
                        </div>
                        <div className="bg-gray-50 px-5 py-3 rounded-2xl flex gap-1 items-center border border-gray-100">
                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-6 bg-gray-50/50 border-t border-gray-100">
                <div className="relative group">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ถามอะไรก็ได้ (ไทย/อังกฤษ)... ลอง 'สรุปออเดอร์วันนี้'"
                        className="w-full bg-white border border-gray-200 rounded-2xl pl-6 pr-14 py-4 text-sm font-medium text-gray-700 placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 shadow-sm transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!query.trim() || isTyping}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 disabled:bg-gray-300 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <p className="text-[0.65rem] text-center text-gray-400 mt-4 font-semibold uppercase tracking-widest">
                    AI อาจทำผิดพลาดได้ โปรดตรวจสอบแผนงานจริงกับสถานะรถอีกครั้ง
                </p>
            </form>
        </div>
    )
}