import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jobAPI } from '../services/api';
import { ChevronLeft, MapPin, Navigation, Clock, CheckCircle2, AlertCircle, Play, ChevronRight } from 'lucide-react-native';

export default function RouteDetailScreen({ route, navigation }: any) {
    const { routeId } = route.params;
    const [routeData, setRouteData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        fetchDetail();
    }, []);

    const fetchDetail = async () => {
        try {
            const res = await jobAPI.getRouteDetail(routeId);
            setRouteData(res.data);
        } catch (err) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลเส้นทางได้');
            navigation.goBack();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleStartRoute = async () => {
        setStarting(true);
        try {
            await jobAPI.startRoute(routeId);
            // Link this route to background GPS tracking
            await AsyncStorage.setItem('last_route_id', routeId);
            await fetchDetail();
        } catch (err) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเริ่มงานได้');
        } finally {
            setStarting(false);
        }
    };

    const renderStop = ({ item, index }: any) => {
        const isDone = item.status === 'delivered' || item.status === 'completed';
        const isEnroute = item.status === 'enroute';
        const isArrived = item.status === 'arrived';
        const isFailed = item.status === 'failed';

        const getStatusLabel = (status: string) => {
            const map: any = {
                'completed': 'ส่งสำเร็จ',
                'delivered': 'ส่งสำเร็จ',
                'in_progress': 'กำลังดำเนินการ',
                'assigned': 'ได้รับมอบหมาย',
                'pending': 'รอดำเนินการ',
                'failed': 'ส่งไม่สำเร็จ',
                'enroute': 'กำลังเดินทาง',
                'arrived': 'ถึงจุดส่ง'
            };
            return map[status] || status.toUpperCase();
        };

        return (
            <TouchableOpacity
                style={[styles.stopCard, isDone && styles.doneCard]}
                onPress={() => navigation.navigate('StopDetail', {
                    task: {
                        id: item.id,
                        orderId: item.order_id,
                        address: item.address,
                        customer: item.customer_name,
                        status: item.status,
                        time: new Date(item.planned_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                })}
            >
                <View style={styles.sequenceWrap}>
                    <View style={[styles.sequenceCircle, isDone && styles.doneCircle]}>
                        <Text style={[styles.sequenceText, isDone && styles.doneText]}>{index + 1}</Text>
                    </View>
                    {index < routeData.stops.length - 1 && <View style={styles.connector} />}
                </View>

                <View style={styles.stopInfo}>
                    <View style={styles.stopHeader}>
                        <Text style={styles.customerName} numberOfLines={1}>{item.customer_name}</Text>
                        <Text style={styles.timeText}>{new Date(item.planned_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <Text style={styles.addressText} numberOfLines={2}>{item.address}</Text>

                    <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: isDone ? '#dcfce7' : isEnroute ? '#fef3c7' : isArrived ? '#e0e7ff' : isFailed ? '#fee2e2' : '#f1f5f9' }]}>
                            <Text style={[styles.statusBadgeText, { color: isDone ? '#166534' : isEnroute ? '#92400e' : isArrived ? '#3730a3' : isFailed ? '#991b1b' : '#64748b' }]}>
                                {getStatusLabel(item.status)}
                            </Text>
                        </View>
                        {item.late_risk && (
                            <View style={styles.riskBadge}>
                                <AlertCircle size={10} color="#ef4444" />
                                <Text style={styles.riskText}>เสี่ยงล่าช้า</Text>
                            </View>
                        )}
                    </View>
                </View>

                <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>
        );
    };

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#4f46e5" />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{routeData.route_number}</Text>
                    <Text style={styles.headerSubtitle}>{routeData.stops.length} จุดส่ง • {routeData.vehicle?.license_plate || 'ไม่ได้ระบุรถ'}</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            {routeData.status === 'assigned' && (
                <View style={styles.startBanner}>
                    <TouchableOpacity
                        style={styles.startBtn}
                        onPress={handleStartRoute}
                        disabled={starting}
                    >
                        {starting ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Play size={20} color="#fff" fill="#fff" />
                                <Text style={styles.startBtnText}>เริ่มงาน</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={routeData.stops}
                renderItem={renderStop}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDetail} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 12 },
    headerInfo: { flex: 1, marginLeft: 15 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    headerSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
    startBanner: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    startBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    startBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    listContent: { padding: 20 },
    stopCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    doneCard: { opacity: 0.6 },
    sequenceWrap: { alignItems: 'center', width: 40, alignSelf: 'stretch' },
    sequenceCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    doneCircle: { backgroundColor: '#dcfce7' },
    sequenceText: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
    doneText: { color: '#166534' },
    connector: { width: 2, flex: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
    stopInfo: { flex: 1, marginLeft: 15 },
    stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    customerName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    timeText: { fontSize: 12, color: '#64748b' },
    addressText: { fontSize: 13, color: '#94a3b8', marginTop: 4, lineHeight: 18 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusBadgeText: { fontSize: 9, fontWeight: '900' },
    riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    riskText: { fontSize: 9, fontWeight: '900', color: '#ef4444' }
});
