'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '../lib/store'

interface NavItemProps {
    href: string
    icon: string
    label: string
    active: boolean
}

const NavItem = ({ href, icon, label, active }: NavItemProps) => (
    <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_2px_12px_rgba(99,102,241,0.25)]'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent hover:border-gray-200'
            }`}
    >
        <span className={`text-lg transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
        </span>
        <span className="font-semibold text-sm tracking-tight">{label}</span>
        {active && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] animate-pulse" />
        )}
    </Link>
)

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, logout } = useAuthStore()
    const [isSidebarOpen, setSidebarOpen] = useState(true)

    // Auth Protection
    useEffect(() => {
        if (!user && pathname !== '/login') {
            // router.push('/login')
        }
    }, [user, pathname, router])

    const menuItems = [
        { href: '/dashboard', icon: '📊', label: 'แดชบอร์ด' },
        { href: '/orders', icon: '📦', label: 'จัดการออเดอร์' },
        { href: '/customers', icon: '🏢', label: 'จัดการลูกค้า' },
        { href: '/fleet', icon: '🚛', label: 'จัดการรถ/คนขับ' },
        { href: '/planning', icon: '🗺️', label: 'จัดเส้นทาง' },
        { href: '/dispatch', icon: '📡', label: 'ติดตามงาน' },
        { href: '/tracking', icon: '📍', label: 'ติดตาม GPS' },
        { href: '/pod', icon: '📸', label: 'ดูหลักฐานส่ง' },
        { href: '/analytics', icon: '📈', label: 'รายงานผล' },
        { href: '/copilot', icon: '🤖', label: 'AI ผู้ช่วย' },
        { href: '/driver-app', icon: '📱', label: 'แอพคนขับ' },
    ]

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? 'w-72' : 'w-20'
                    } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shadow-[2px_0_16px_rgba(0,0,0,0.03)]`}
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
                {/* Logo Section */}
                <div className="p-6 border-b border-gray-100">
                    {isSidebarOpen ? (
                        <div className="flex items-center gap-3 animate-in fade-in duration-300">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-indigo-200">
                                🚚
                            </div>
                            <div>
                                <h1 className="font-black text-xl tracking-tight leading-none text-gray-900">
                                    AI-TMS
                                </h1>
                                <p className="text-[0.65rem] font-bold text-indigo-500 uppercase tracking-[0.2em] mt-0.5">
                                    Enterprise
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-10 h-10 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-lg shadow-lg">
                            🚚
                        </div>
                    )}
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto overflow-x-hidden py-2">
                    {menuItems.map((item) => (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={isSidebarOpen ? item.label : ''}
                            active={pathname === item.href}
                        />
                    ))}
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    {isSidebarOpen && (
                        <div className="bg-white border border-gray-200 rounded-xl p-3.5 mb-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-200">
                                    <span className="text-lg">👤</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate text-gray-900">
                                        {user?.name || 'Admin User'}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <p className="text-[0.65rem] text-gray-500 font-semibold uppercase tracking-wider">
                                            {user?.role || 'System Admin'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="w-full h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all text-lg border border-gray-200"
                    >
                        {isSidebarOpen ? '◀' : '▶'}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-gray-50">
                {/* Header */}
                <header className="h-20 px-8 flex items-center justify-between border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                            {menuItems.find((m) => m.href === pathname)?.label || 'ภาพรวม'}
                        </h2>
                        <div className="hidden md:flex bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            <span className="text-[0.65rem] font-bold text-indigo-600 uppercase tracking-wider">
                                อัปเดตสด
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Search Bar */}
                        <div className="hidden lg:flex items-center bg-gray-50 rounded-xl pl-4 pr-2 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-300 transition-all w-64">
                            <span className="text-gray-400 text-sm">🔍</span>
                            <input
                                type="text"
                                placeholder="ค้นหา..."
                                className="bg-transparent border-none outline-none text-xs text-gray-700 px-3 w-full placeholder:text-gray-400 font-medium"
                            />
                            <button className="w-7 h-7 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs text-gray-600 flex items-center justify-center font-bold transition-colors">
                                /
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 border-l border-gray-200 pl-6 h-8">
                            <button className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors hover:bg-gray-100 rounded-lg group">
                                <span className="text-xl">🔔</span>
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white group-hover:animate-bounce"></span>
                            </button>
                            <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors hover:bg-gray-100 rounded-lg">
                                <span className="text-xl">⚙️</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-[1920px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </div>
            </main>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
                
                * {
                    scrollbar-width: thin;
                    scrollbar-color: #e5e7eb transparent;
                }
                
                *::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                
                *::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                *::-webkit-scrollbar-thumb {
                    background-color: #e5e7eb;
                    border-radius: 10px;
                }
                
                *::-webkit-scrollbar-thumb:hover {
                    background-color: #d1d5db;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    )
}