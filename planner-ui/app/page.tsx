'use client'

import React from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function LandingPage() {
    return (
        <div className="font-sans bg-white text-[#001B3D] antialiased overflow-x-hidden min-h-screen">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#e2e8f0] h-20 flex items-center">
                <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-8 text-[#2B5A9D] flex items-center justify-center bg-[#2B5A9D]/5 rounded-lg border border-[#2B5A9D]/10">
                            <span className="material-symbols-outlined text-[24px]">sync_alt</span>
                        </div>
                        <h1 className="text-[#001B3D] text-xl font-black tracking-tight uppercase">LogiSync <span className="font-medium text-[#2B5A9D]">Enterprise</span></h1>
                    </div>
                    <nav className="hidden md:flex items-center gap-8">
                        <a className="text-[#001B3D]/80 hover:text-[#2B5A9D] text-sm font-medium transition-colors cursor-pointer">Solutions</a>
                        <a className="text-[#001B3D]/80 hover:text-[#2B5A9D] text-sm font-medium transition-colors cursor-pointer">Technology</a>
                        <a className="text-[#001B3D]/80 hover:text-[#2B5A9D] text-sm font-medium transition-colors cursor-pointer">Company</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="hidden md:block text-[#001B3D] text-sm font-medium hover:text-[#2B5A9D] transition-colors">
                            Log in
                        </Link>
                        <Link href="/login" className="bg-[#001B3D] hover:bg-[#002855] text-white h-10 px-5 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-[#001B3D]/20 flex items-center justify-center">
                            Request Demo
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10"></div>
                <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl relative z-10">
                    <div className="flex flex-col items-center text-center max-w-4xl mx-auto gap-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#001B3D]/5 border border-[#001B3D]/10 text-xs font-medium text-[#001B3D]">
                            <span className="flex h-2 w-2 rounded-full bg-[#10b981] animate-pulse"></span>
                            Now available: LogiSync Enterprise API v2.0
                        </div>
                        <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#001B3D] leading-[1.1]">
                            Synchronized Intelligence for <span className="text-[#2B5A9D]">Global Logistics</span>
                        </h2>
                        <p className="text-lg md:text-xl text-[#64748b] max-w-2xl leading-relaxed">
                            Unify your supply chain with LogiSync Enterprise. Optimize routes, reduce overhead, and ensure global compliance with the world's first AI-native TMS.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
                            <Link href="/login" className="h-12 px-8 rounded-lg bg-[#001B3D] hover:bg-[#002855] text-white font-semibold text-base shadow-lg shadow-[#001B3D]/25 transition-all w-full sm:w-auto flex items-center justify-center">
                                Launch Console
                            </Link>
                            <button className="h-12 px-8 rounded-lg bg-white border border-[#e2e8f0] text-[#001B3D] hover:bg-gray-50 font-semibold text-base transition-all w-full sm:w-auto flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-lg">play_circle</span>
                                Platform Overview
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trusted By */}
            <section className="border-y border-[#e2e8f0] bg-gray-50/50 py-12">
                <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
                    <p className="text-center text-sm font-semibold text-[#64748b] uppercase tracking-wider mb-8">Trusted by Global Supply Chain Leaders</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="font-bold text-xl text-[#001B3D] flex items-center gap-2"><span className="material-symbols-outlined">package_2</span> LOGISTIC</div>
                        <div className="font-bold text-xl text-[#001B3D] flex items-center gap-2"><span className="material-symbols-outlined">local_shipping</span> FREIGHT</div>
                        <div className="font-bold text-xl text-[#001B3D] flex items-center gap-2"><span className="material-symbols-outlined">flight_takeoff</span> AERO</div>
                        <div className="font-bold text-xl text-[#001B3D] flex items-center gap-2"><span className="material-symbols-outlined">directions_boat</span> OCEANIC</div>
                        <div className="font-bold text-xl text-[#001B3D] flex items-center gap-2"><span className="material-symbols-outlined">warehouse</span> DEPOT</div>
                        <div className="font-bold text-xl text-[#001B3D] flex items-center gap-2"><span className="material-symbols-outlined">move_down</span> CHAIN</div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 mb-16">
                        <div>
                            <h3 className="text-3xl md:text-4xl font-bold text-[#001B3D] tracking-tight mb-6">
                                Enterprise-Grade Capabilities
                            </h3>
                            <p className="text-lg text-[#64748b] leading-relaxed">
                                LogiSync's AI-native architecture delivers unparalleled efficiency and visibility across your entire supply chain, replacing legacy systems with predictive intelligence.
                            </p>
                        </div>
                        <div className="flex items-end justify-start lg:justify-end">
                            <a className="text-[#2B5A9D] font-semibold flex items-center gap-2 group cursor-pointer">
                                Explore all features
                                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-sm">arrow_forward</span>
                            </a>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="group p-8 rounded-xl bg-white border border-[#e2e8f0] hover:border-[#2B5A9D]/30 hover:shadow-xl hover:shadow-[#2B5A9D]/5 transition-all duration-300">
                            <div className="h-12 w-12 rounded-lg bg-[#2B5A9D]/5 flex items-center justify-center text-[#2B5A9D] mb-6 group-hover:bg-[#2B5A9D] group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-3xl">sync</span>
                            </div>
                            <h4 className="text-xl font-bold text-[#001B3D] mb-3">Sync Optimization</h4>
                            <p className="text-[#64748b] leading-relaxed">
                                Leverage machine learning to analyze millions of route permutations instantly, reducing fuel costs and delivery times by an average of 18%.
                            </p>
                        </div>
                        <div className="group p-8 rounded-xl bg-white border border-[#e2e8f0] hover:border-[#2B5A9D]/30 hover:shadow-xl hover:shadow-[#2B5A9D]/5 transition-all duration-300">
                            <div className="h-12 w-12 rounded-lg bg-[#2B5A9D]/5 flex items-center justify-center text-[#2B5A9D] mb-6 group-hover:bg-[#2B5A9D] group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-3xl">satellite_alt</span>
                            </div>
                            <h4 className="text-xl font-bold text-[#001B3D] mb-3">Real-Time Telemetry</h4>
                            <p className="text-[#64748b] leading-relaxed">
                                Gain granular visibility into your fleet with sub-second data updates, predictive maintenance alerts, and driver behavior analytics.
                            </p>
                        </div>
                        <div className="group p-8 rounded-xl bg-white border border-[#e2e8f0] hover:border-[#2B5A9D]/30 hover:shadow-xl hover:shadow-[#2B5A9D]/5 transition-all duration-300">
                            <div className="h-12 w-12 rounded-lg bg-[#2B5A9D]/5 flex items-center justify-center text-[#2B5A9D] mb-6 group-hover:bg-[#2B5A9D] group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-3xl">verified_user</span>
                            </div>
                            <h4 className="text-xl font-bold text-[#001B3D] mb-3">Automated Compliance</h4>
                            <p className="text-[#64748b] leading-relaxed">
                                Stay ahead of regulatory changes across 80+ jurisdictions with automated documentation handling and risk assessment protocols.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Dashboard Preview */}
            <section className="py-24 bg-[#001B3D] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#2B5A9D]/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white/90 mb-6">
                                <span className="material-symbols-outlined text-sm">visibility</span>
                                Live Control Tower
                            </div>
                            <h3 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
                                Complete visibility from a single pane of glass
                            </h3>
                            <p className="text-gray-300 text-lg leading-relaxed mb-8">
                                The LogiSync Control Tower aggregates data from ERPs, carriers, and IoT devices into a unified operational view. Make decisions based on real-time facts, not historical reports.
                            </p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[#10b981] mt-1">check_circle</span>
                                    <div>
                                        <strong className="block font-semibold">Unified Data Model</strong>
                                        <span className="text-sm text-gray-400">Seamlessly integrate with SAP, Oracle, and legacy systems.</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[#10b981] mt-1">check_circle</span>
                                    <div>
                                        <strong className="block font-semibold">Exception Management</strong>
                                        <span className="text-sm text-gray-400">AI automatically flags delays and suggests mitigation strategies.</span>
                                    </div>
                                </li>
                            </ul>
                            <button className="text-white font-semibold border-b border-[#2B5A9D] pb-1 hover:text-[#2B5A9D] transition-colors">
                                Read Technical Specs
                            </button>
                        </div>
                        <div className="lg:w-1/2 w-full">
                            <div className="relative rounded-xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden aspect-video group">
                                <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]/50"></div>
                                    </div>
                                    <div className="ml-4 h-4 w-32 bg-gray-700 rounded-sm"></div>
                                </div>
                                <div className="relative w-full h-full bg-gray-800" style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCdYYansydblJrCBrwaaOl0D20rlZ-Gn_j1i720KsWOdX3OhdcDfYpKRwcM0devwxV2iJCGLAn5AlXP4PexN3dsMLqXoE9gGbtMQ0QOWSEXqcbjr3oFQUsfDfBUoPqTpTMoFlfx5gqzHAaj0IEctcvFZ4YhQK7Hr3mWetJad3BbTq2al2zipJxqXBHWDN1nPUp7cgoWEgRB2Hd4a1sIYhtKbkTJ0yQG26IGRSV57CkZ9zBENbcteanctLI9OAICUEsSHDZb0wF5MPM')`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.8 }}>
                                    <div className="absolute inset-0 bg-blue-900/30 mix-blend-overlay"></div>
                                    <div className="absolute top-8 left-8 bg-gray-900/90 backdrop-blur-md border border-gray-700 p-4 rounded-lg w-48 shadow-lg">
                                        <div className="text-xs text-gray-400 mb-1">Active Shipments</div>
                                        <div className="text-2xl font-bold text-white">1,248</div>
                                        <div className="text-xs text-[#10b981] flex items-center gap-1 mt-1">
                                            <span className="material-symbols-outlined text-[12px]">trending_up</span> +12% vs avg
                                        </div>
                                    </div>
                                    <div className="absolute bottom-8 right-8 bg-gray-900/90 backdrop-blur-md border border-gray-700 p-4 rounded-lg w-56 shadow-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                                            <span className="text-xs text-white font-medium">System Status: Optimal</span>
                                        </div>
                                        <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#10b981] w-[98%]"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-24 bg-white border-b border-[#e2e8f0]">
                <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#e2e8f0] text-center">
                        <div className="px-4 py-8">
                            <div className="text-5xl font-bold text-[#2B5A9D] mb-2">24/7</div>
                            <div className="text-sm font-semibold uppercase tracking-wider text-[#64748b]">Autonomous Monitoring</div>
                        </div>
                        <div className="px-4 py-8">
                            <div className="text-5xl font-bold text-[#2B5A9D] mb-2">$400M+</div>
                            <div className="text-sm font-semibold uppercase tracking-wider text-[#64748b]">Freight Spend Optimized</div>
                        </div>
                        <div className="px-4 py-8">
                            <div className="text-5xl font-bold text-[#2B5A9D] mb-2">99.9%</div>
                            <div className="text-sm font-semibold uppercase tracking-wider text-[#64748b]">SLA Uptime Guarantee</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-50 pt-16 pb-8">
                <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
                        <div className="col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="size-6 text-[#2B5A9D] flex items-center justify-center bg-[#2B5A9D]/5 rounded border border-[#2B5A9D]/10">
                                    <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                                </div>
                                <span className="text-[#001B3D] font-bold text-lg">LOGISYNC ENTERPRISE</span>
                            </div>
                            <p className="text-[#64748b] text-sm leading-relaxed max-w-xs mb-6">
                                The enterprise standard for synchronized logistics. Empowering global supply chains with predictive intelligence and automated compliance.
                            </p>
                        </div>
                        <div>
                            <h5 className="text-[#001B3D] font-semibold text-sm mb-4">Product</h5>
                            <ul className="space-y-3 text-sm">
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">Route Optimization</a></li>
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">Fleet Telemetry</a></li>
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">Freight Audit</a></li>
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">Compliance</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="text-[#001B3D] font-semibold text-sm mb-4">Company</h5>
                            <ul className="space-y-3 text-sm">
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">About</a></li>
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">Customers</a></li>
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">Careers</a></li>
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">Press</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="text-[#001B3D] font-semibold text-sm mb-4">Resources</h5>
                            <ul className="space-y-3 text-sm">
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">Documentation</a></li>
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">API Reference</a></li>
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">System Status</a></li>
                                <li><a className="text-[#64748b] hover:text-[#2B5A9D] transition-colors cursor-pointer">Contact Support</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-[#e2e8f0] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-[#64748b]">© 2026 LogiSync Enterprise Inc. All rights reserved.</p>
                        <div className="flex gap-6 text-xs text-[#64748b]">
                            <a className="hover:text-[#2B5A9D] transition-colors cursor-pointer">Privacy Policy</a>
                            <a className="hover:text-[#2B5A9D] transition-colors cursor-pointer">Terms of Service</a>
                            <a className="hover:text-[#2B5A9D] transition-colors cursor-pointer">Security</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}