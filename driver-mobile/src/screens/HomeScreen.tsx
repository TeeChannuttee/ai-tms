import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { jobAPI, alertAPI } from '../services/api';
import { LayoutGrid, Truck, MapPin, Clock, ChevronRight, AlertTriangle, Bell, Play, CheckCircle2 } from 'lucide-react-native';

export default function HomeScreen({ navigation }: any) {
    const { driverId, driverName } = useAuth();
    const [stats, setStats] = useState({ stops: 0, completed: 0, routes: 0, risk: 'Low' });
    const [nextStop, setNextStop] = useState<any>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (driverId) {
            fetchStats();
        }
    }, [driverId]);

    const fetchStats = async () => {
        if (!driverId) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const [routeRes, alertRes] = await Promise.all([
                jobAPI.getMyRoutes(driverId, today),
                alertAPI.getMyAlerts(driverId)
            ]);

            if (routeRes.data && routeRes.data.length > 0) {
                let totalStops = 0;
                let doneStops = 0;
                let pendingStops: any[] = [];

                routeRes.data.forEach((r: any) => {
                    totalStops += r.stops.length;
                    doneStops += r.stops.filter((s: any) => s.status === 'delivered' || s.status === 'completed').length;
                    pendingStops.push(...r.stops.filter((s: any) => s.status !== 'delivered' && s.status !== 'completed' && s.status !== 'failed'));
                });

                setStats({
                    stops: totalStops,
                    completed: doneStops,
                    routes: routeRes.data.length,
                    risk: totalStops > 0 && doneStops < totalStops ? 'Medium' : 'Low'
                });

                if (pendingStops.length > 0) {
                    setNextStop(pendingStops[0]);
                } else {
                    setNextStop(null)
                }
            } else {
                setStats({ stops: 0, completed: 0, routes: 0, risk: 'Low' });
                setNextStop(null);
            }

            if (alertRes.data) {
                setAlerts(alertRes.data.filter((a: any) => !a.is_read));
            }
        } catch (err) {
            console.warn('[Home] Fetch failed', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const StatusCard = ({ label, value, icon: Icon, color }: any) => (
        <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
            <View style={styles.statIconWrap}>
                <Icon size={20} color={color} />
            </View>
            <View>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
            </View>
        </View>
    );

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#4f46e5" />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchStats} />}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>ยินดีต้อนรับ,</Text>
                        <Text style={styles.name}>{driverName} 👋</Text>
                    </View>
                    <TouchableOpacity style={styles.notifyBtn}>
                        <Bell size={20} color="#1e293b" />
                        {alerts.length > 0 && <View style={styles.badge} />}
                    </TouchableOpacity>
                </View>

                {/* Priority Next Task Card */}
                {nextStop && (
                    <View style={styles.priorityBox}>
                        <Text style={styles.priorityLabel}>งานถัดไป</Text>
                        <TouchableOpacity
                            style={styles.priorityCard}
                            onPress={() => navigation.navigate('StopDetail', {
                                task: {
                                    id: nextStop.id,
                                    orderId: nextStop.order_id,
                                    address: nextStop.address,
                                    customer: nextStop.customer_name,
                                    status: nextStop.status,
                                    time: new Date(nextStop.planned_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                }
                            })}
                        >
                            <View style={styles.priorityHeader}>
                                <View style={styles.priorityIcon}>
                                    <MapPin size={24} color="#fff" />
                                </View>
                                <View style={styles.priorityInfo}>
                                    <Text style={styles.priorityCustomer}>{nextStop.customer_name}</Text>
                                    <Text style={styles.priorityTime}>กำหนดส่ง {new Date(nextStop.planned_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </View>
                                {nextStop.late_risk && <View style={styles.riskDot} />}
                            </View>
                            <View style={styles.priorityFooter}>
                                <Text style={styles.priorityAddress} numberOfLines={1}>{nextStop.address}</Text>
                                <ChevronRight size={20} color="#cbd5e1" />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Today's Stats Row */}
                <View style={styles.statsGrid}>
                    <StatusCard label="จุดส่งวันนี้" value={stats.stops} icon={MapPin} color="#4f46e5" />
                    <StatusCard label="เส้นทาง" value={stats.routes} icon={Truck} color="#10b981" />
                    <StatusCard label="ส่งสำเร็จ" value={stats.completed} icon={LayoutGrid} color="#f59e0b" />
                    <StatusCard label="ความเสี่ยง" value={stats.risk === 'Low' ? 'ต่ำ' : 'สูง'} icon={Clock} color={stats.risk === 'Low' ? '#10b981' : '#ef4444'} />
                </View>

                {/* Main Action Area */}
                <TouchableOpacity
                    style={styles.heroAction}
                    onPress={() => navigation.navigate('MyRoutes')}
                >
                    <View style={styles.heroTextContent}>
                        <Text style={styles.heroTitle}>จัดการงานขนส่ง</Text>
                        <Text style={styles.heroSubtitle}>ดูและเริ่มงานตามเส้นทางของคุณ</Text>
                    </View>
                    <View style={styles.heroIconWrap}>
                        <ChevronRight size={24} color="#fff" />
                    </View>
                </TouchableOpacity>

                {/* Real-time Alerts Area */}
                {alerts.length > 0 ? alerts.map((alert, idx) => (
                    <View key={alert.id || idx} style={[styles.alertBox, { backgroundColor: alert.severity === 'critical' ? '#fef2f2' : '#fff7ed', borderColor: alert.severity === 'critical' ? '#fee2e2' : '#ffedd5', marginBottom: 12 }]}>
                        <AlertTriangle size={20} color={alert.severity === 'critical' ? '#ef4444' : '#f97316'} />
                        <View style={styles.alertTextContent}>
                            <Text style={[styles.alertTitle, { color: alert.severity === 'critical' ? '#991b1b' : '#9a3412' }]}>{alert.title}</Text>
                            <Text style={[styles.alertBody, { color: alert.severity === 'critical' ? '#b91c1c' : '#c2410c' }]}>{alert.message}</Text>
                        </View>
                    </View>
                )) : (
                    <View style={[styles.alertBox, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
                        <CheckCircle2 size={20} color="#166534" />
                        <View style={styles.alertTextContent}>
                            <Text style={[styles.alertTitle, { color: '#14532d' }]}>สถานะปกติ</Text>
                            <Text style={[styles.alertBody, { color: '#166534' }]}>ไม่มีการแจ้งเตือนในขณะนี้</Text>
                        </View>
                    </View>
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerBrand}>AI-TMS ENTERPRISE</Text>
                    <Text style={styles.footerVersion}>v2.1.0-prod (Thai)</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 25 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 30 },
    greeting: { fontSize: 14, color: '#64748b', fontWeight: '500' },
    name: { fontSize: 24, fontWeight: '900', color: '#1e293b', marginTop: 2 },
    notifyBtn: { padding: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    badge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fff' },
    priorityBox: { marginBottom: 30 },
    priorityLabel: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 12, marginLeft: 5 },
    priorityCard: { backgroundColor: '#fff', borderRadius: 32, padding: 25, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
    priorityHeader: { flexDirection: 'row', gap: 15, alignItems: 'center', marginBottom: 20 },
    priorityIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
    priorityInfo: { flex: 1 },
    priorityCustomer: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    priorityTime: { fontSize: 12, color: '#64748b', marginTop: 2 },
    riskDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
    priorityFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
    priorityAddress: { fontSize: 13, color: '#94a3b8', flex: 1 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
    statCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    statIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
    heroAction: { backgroundColor: '#1e293b', padding: 25, borderRadius: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    heroTextContent: { flex: 1 },
    heroTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
    heroIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    alertBox: { padding: 20, borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 15, alignItems: 'center' },
    alertTextContent: { flex: 1 },
    alertTitle: { fontSize: 14, fontWeight: 'bold', color: '#9a3412' },
    alertBody: { fontSize: 12, color: '#c2410c', marginTop: 2, lineHeight: 18 },
    footer: { marginTop: 40, alignItems: 'center' },
    footerBrand: { fontSize: 10, fontWeight: '900', color: '#cbd5e1', letterSpacing: 2 },
    footerVersion: { fontSize: 10, color: '#94a3b8', marginTop: 6 }
});
