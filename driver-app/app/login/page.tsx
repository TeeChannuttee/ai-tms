'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/api'

export default function LoginPage() {
    const router = useRouter()
    const [phone, setPhone] = useState('driver001@ai-tms.com') // Default for demo
    const [pin, setPin] = useState('driver123')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const data = await api.login(phone, pin)
            // Save token and info
            localStorage.setItem('token', data.token)
            localStorage.setItem('driver_id', data.user.driver_id || data.user.id)
            localStorage.setItem('driver_name', data.user.name)

            router.push('/')
        } catch (err) {
            setError('เบอร์โทรหรือรหัส PIN ไม่ถูกต้อง')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                <div className="text-center mb-8">
                    <div className="text-4xl mb-2">🚛</div>
                    <h1 className="text-2xl font-bold text-slate-800">Driver Login</h1>
                    <p className="text-slate-500 text-sm">เข้าสู่ระบบพนักงานขับรถ</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ / Email</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="08X-XXX-XXXX"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">รหัส PIN (Password)</label>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-center tracking-[0.5em] text-lg font-bold"
                            placeholder="••••••"
                            maxLength={6}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'กำลังเข้าระบบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>

                <p className="text-center text-xs text-slate-400 mt-6">
                    หากลืมรหัสผ่าน กรุณาติดต่อ Dispatcher
                </p>
            </div>
        </div>
    )
}
