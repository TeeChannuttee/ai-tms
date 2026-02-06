import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { jobAPI } from '../services/api';
import { Truck, MapPin, ChevronRight, Clock, CheckCircle2 } from 'lucide-react-native';

export default function RouteListScreen({ navigation }: any) {
    const { driverId } = useAuth();
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (driverId) {
            fetchRoutes();
        }
    }, [driverId]);

    const fetchRoutes = async () => {
        if (!driverId) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await jobAPI.getMyRoutes(driverId, today);
            setRoutes(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed': return { bg: '#dcfce7', text: '#166534' };
            case 'in_progress': return { bg: '#fef3c7', text: '#92400e' };
            case 'assigned': return { bg: '#e0e7ff', text: '#3730a3' };
            default: return { bg: '#f1f5f9', text: '#475569' };
        }
    };

    const getStatusLabel = (status: string) => {
        const map: any = {
            'completed': 'ส่งสำเร็จ',
            'in_progress': 'กำลังดำเนินการ',
            'assigned': 'ได้รับมอบหมาย',
            'pending': 'รอดำเนินการ',
            'failed': 'ส่งไม่สำเร็จ',
            'enroute': 'กำลังเดินทาง',
            'arrived': 'ถึงจุดส่ง',
            'unknown': 'ไม่ระบุ'
        };
        return map[status] || status.toUpperCase();
    };

    const renderRoute = ({ item }: any) => {
        const status = getStatusStyle(item.status);
        const progress = item.stops.length > 0
            ? (item.stops.filter((s: any) => s.status === 'delivered' || s.status === 'completed').length / item.stops.length) * 100
            : 0;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('RouteDetail', { routeId: item.id })}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.titleArea}>
                        <View style={styles.iconBox}>
                            <Truck size={20} color="#1e293b" />
                        </View>
                        <View>
                            <Text style={styles.routeCode}>{item.route_number || 'เส้นทาง ID: ' + item.id.substring(0, 8)}</Text>
                            <Text style={styles.vehicleText}>{item.vehicle?.license_plate || 'ไม่ได้ระบุรถ'}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.text }]}>{getStatusLabel(item.status)}</Text>
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <View style={styles.infoItem}>
                        <MapPin size={14} color="#64748b" />
                        <Text style={styles.infoText}>{item.stops.length} จุดส่ง</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Clock size={14} color="#64748b" />
                        <Text style={styles.infoText}>เริ่ม {new Date(item.planned_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>ความคืบหน้า</Text>
                        <Text style={styles.progressVal}>{Math.round(progress)}%</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progress === 100 ? '#10b981' : '#4f46e5' }]} />
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.footerLink}>ดูจุดส่ง</Text>
                    <ChevronRight size={16} color="#4f46e5" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>ใบงานทั้งหมด</Text>
                <Text style={styles.listSubtitle}>มอบหมายสำหรับ {new Date().toLocaleDateString('th-TH', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={routes}
                    renderItem={renderRoute}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchRoutes} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <CheckCircle2 size={48} color="#e2e8f0" />
                            <Text style={styles.emptyText}>ไม่มีงานที่ได้รับมอบหมายในวันนี้</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listHeader: { padding: 25 },
    listTitle: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
    listSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
    listContent: { padding: 25, paddingTop: 0, paddingBottom: 40 },
    card: { backgroundColor: '#fff', borderRadius: 28, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    titleArea: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    routeCode: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    vehicleText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusText: { fontSize: 10, fontWeight: '900' },
    cardInfo: { flexDirection: 'row', gap: 20, marginBottom: 25 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    progressContainer: { marginBottom: 20 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 0.5 },
    progressVal: { fontSize: 11, fontWeight: '900', color: '#1e293b' },
    progressBar: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    footerLink: { fontSize: 13, color: '#4f46e5', fontWeight: 'bold' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 15, color: '#94a3b8', fontSize: 16, fontWeight: '500' }
});
