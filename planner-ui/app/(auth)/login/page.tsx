'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useAuthStore } from '../../lib/store'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

export default function LoginPage() {
    const [email, setEmail] = useState('admin@ai-tms.com')
    const [password, setPassword] = useState('admin123')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const setUser = useAuthStore((state) => state.setUser)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
                email,
                password,
            })

            const { token, user } = response.data
            setUser(user, token)
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to login. Please check your credentials.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-white dark:bg-[#111421] text-slate-900 dark:text-white antialiased min-h-screen">
            <div className="flex min-h-screen w-full flex-row overflow-hidden">
                {/* Left Side: Visuals */}
                <div className="hidden lg:flex lg:w-1/2 relative flex-col bg-slate-900">
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-overlay"
                        style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBJGFq2lGbAoYMzsZTuf89zOIDLfHG14GcS_x2kNL5t-RNr9y0avKWACvA-S6WXMqfaTnZzkM1Z8_5N1z-hx2w1UpZ4eqxvE2cGSON_nkMCHPQnx4wj9iH18sJnIVUORyHKKgvB1PL-n5lcRMbDIzIwQosuI-4Jy-6E5buwGuGTw6CBC8qRHpR_nOoHlsytfJoFI80xar9i-nH-26gpZSW8ykxtJrTWQXVej0qBaLo_yjrs9qlz4eEfZGxRU4MzfuPrrgZsxsVk2XQ')` }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-slate-900/30"></div>
                    <div className="relative z-10 flex flex-1 flex-col justify-end p-16">
                        <div className="max-w-lg">
                            <div className="mb-6 h-12 w-12 flex items-center justify-center rounded bg-[#1430b8]/20 backdrop-blur-sm border border-[#1430b8]/30 text-white">
                                <span className="material-symbols-outlined !text-[28px]">hub</span>
                            </div>
                            <blockquote className="mb-6 border-l-2 border-[#1430b8] pl-6">
                                <p className="text-2xl font-medium leading-relaxed text-white">
                                    "Optimizing global supply chains with AI-driven precision. Real-time visibility for the modern enterprise."
                                </p>
                            </blockquote>
                            <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Trusted by Global Leaders</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="flex w-full lg:w-1/2 flex-col justify-center items-center px-4 sm:px-12 py-12 bg-white dark:bg-[#111421] relative">
                    {/* Mobile Logo */}
                    <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
                        <div className="h-8 w-8 bg-[#1430b8] rounded flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-sm">hub</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm">LOGISYNC ENTERPRISE</span>
                    </div>

                    <div className="w-full max-w-[420px] flex flex-col gap-8">
                        <div className="flex flex-col gap-2">
                            <div className="hidden lg:flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 bg-[#1430b8] rounded flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-sm">hub</span>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">LOGISYNC ENTERPRISE</span>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Log in to your account</h1>
                            <p className="text-slate-500 dark:text-slate-400">Welcome back. Please enter your details.</p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">error</span>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">mail</span>
                                    </div>
                                    <input
                                        className="block w-full rounded border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 pl-10 pr-3 py-2.5 sm:text-sm sm:leading-6 focus:border-[#1430b8] focus:ring-1 focus:ring-[#1430b8] shadow-sm transition-colors outline-none"
                                        id="email"
                                        placeholder="name@company.com"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">lock</span>
                                    </div>
                                    <input
                                        className="block w-full rounded border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 pl-10 pr-10 py-2.5 sm:text-sm sm:leading-6 focus:border-[#1430b8] focus:ring-1 focus:ring-[#1430b8] shadow-sm transition-colors outline-none"
                                        id="password"
                                        placeholder="Enter your password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <input className="h-4 w-4 rounded border-slate-300 text-[#1430b8] focus:ring-[#1430b8] dark:border-slate-600 dark:bg-slate-800" id="remember-me" type="checkbox" />
                                    <label className="text-sm text-slate-600 dark:text-slate-400" htmlFor="remember-me">Keep me signed in</label>
                                </div>
                                <a className="text-sm font-medium text-[#1430b8] hover:text-[#0f238a] hover:underline cursor-pointer">Forgot password?</a>
                            </div>

                            <div className="flex flex-col gap-4 mt-2">
                                <button
                                    className="flex w-full justify-center rounded bg-[#1430b8] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#0f238a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors disabled:opacity-50"
                                    type="submit"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Signing In...' : 'Sign In'}
                                </button>

                                <div className="relative flex py-1 items-center">
                                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase tracking-wider font-medium">Enterprise Access</span>
                                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                                </div>

                                <button className="flex w-full justify-center items-center gap-3 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" type="button">
                                    <span className="material-symbols-outlined text-[20px] text-slate-500">domain</span>
                                    Sign in with SSO
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 flex flex-col items-center gap-4 text-center">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                <span className="material-symbols-outlined text-emerald-600 text-[16px]">verified_user</span>
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">256-bit Encryption Verified</span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                © 2026 LogiSync Enterprise. All rights reserved. <br />
                                <a className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Privacy Policy</a> · <a className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Terms of Service</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}