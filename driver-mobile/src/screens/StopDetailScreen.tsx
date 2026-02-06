import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, MapPin, Navigation, Clock, FileText, ChevronLeft, AlertCircle, Package, CheckCircle2 } from 'lucide-react-native';
import * as Location from 'expo-location';
import { jobAPI } from '../services/api';
import { SyncService } from '../services/sync';

export default function StopDetailScreen({ route, navigation }: any) {
    const { task } = route.params;
    const [status, setStatus] = useState(task.status);
    const [loading, setLoading] = useState(false);

    const handleStatusUpdate = async (newStatus: string, reason?: string) => {
        setLoading(true);
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;

            try {
                await jobAPI.updateStopStatus(task.id, newStatus, lat, lng, reason);
                setStatus(newStatus);
                Alert.alert('อัปเดตแล้ว', `สถานะเปลี่ยนเป็น ${newStatus.toUpperCase()}`);
            } catch (err) {
                // Offline Fallback
                console.log('Network failed, queueing action...');
                await SyncService.addToQueue(newStatus.toUpperCase() as any, {
                    id: task.id,
                    lat,
                    lng,
                    reason
                });
                setStatus(newStatus.toLowerCase());
                Alert.alert('โหมดออฟไลน์', 'บันทึกข้อมูลแล้ว จะอัปโหลดเมื่อเชื่อมต่อเน็ต');
            }

            if (newStatus === 'delivered' || newStatus === 'failed') {
                navigation.goBack();
            }
        } catch (err) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถระบุตำแหน่งหรืออัปเดตสถานะได้');
        } finally {
            setLoading(false);
        }
    };

    const makeCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const openMaps = (address: string) => {
        const url = Platform.select({
            ios: `maps:0,0?q=${address}`,
            android: `geo:0,0?q=${address}`,
        });
        if (url) Linking.openURL(url);
    };

    const confirmFailure = () => {
        Alert.alert(
            'ยืนยันการส่งไม่สำเร็จ',
            'ระบุสาเหตุที่ไม่สามารถส่งสินค้าได้',
            [
                { text: 'ไม่พบผู้รับ', onPress: () => handleStatusUpdate('failed', 'Recipient Missing') },
                { text: 'ร้านปิด', onPress: () => handleStatusUpdate('failed', 'Store Closed') },
                { text: 'ปฏิเสธการรับ', onPress: () => handleStatusUpdate('failed', 'Refused by Customer') },
                { text: 'ยกเลิก', style: 'cancel' }
            ]
        );
    };

    const getStatusLabel = (status: string) => {
        const map: any = {
            'completed': 'ส่งสำเร็จ',
            'delivered': 'ส่งสำเร็จ',
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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ข้อมูลจุดส่ง</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Visual Progress Header */}
                <View style={[styles.statusBanner, { backgroundColor: status === 'enroute' ? '#fef3c7' : status === 'arrived' ? '#e0e7ff' : '#f1f5f9' }]}>
                    <Text style={[styles.statusText, { color: status === 'enroute' ? '#d97706' : status === 'arrived' ? '#4338ca' : '#64748b' }]}>
                        {getStatusLabel(status)}
                    </Text>
                </View>

                {/* Main Identity */}
                <View style={styles.section}>
                    <Text style={styles.customerName}>{task.customer}</Text>
                    <View style={styles.addressRow}>
                        <MapPin size={18} color="#94a3b8" />
                        <Text style={styles.addressText}>{task.address}</Text>
                    </View>

                    <View style={styles.actionGrid}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => openMaps(task.address)}>
                            <View style={[styles.iconCycle, { backgroundColor: '#f5f7ff' }]}>
                                <Navigation size={22} color="#4f46e5" />
                            </View>
                            <Text style={styles.actionLabel}>นำทาง</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => makeCall("0812345678")}>
                            <View style={[styles.iconCycle, { backgroundColor: '#ecfdf5' }]}>
                                <Phone size={22} color="#10b981" />
                            </View>
                            <Text style={styles.actionLabel}>โทรหาลูกค้า</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logistics Requirements */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ข้อกำหนดและบันทึก</Text>
                    <View style={styles.reqRow}>
                        <CheckCircle2 size={18} color="#10b981" />
                        <Text style={styles.reqText}>ต้องถ่ายภาพสินค้า (อย่างน้อย 1 รูป)</Text>
                    </View>
                    <View style={styles.reqRow}>
                        <CheckCircle2 size={18} color="#10b981" />
                        <Text style={styles.reqText}>ต้องลายเซ็นลูกค้า</Text>
                    </View>
                    <View style={styles.noteBox}>
                        <FileText size={18} color="#64748b" />
                        <Text style={styles.noteText}>รหัสผ่านประตู: 1234 ที่จอดรถอยู่ด้านหลัง</Text>
                    </View>
                </View>

                {/* State Machine Action Area */}
                <View style={styles.operationArea}>
                    {loading ? (
                        <View style={styles.loadingState}>
                            <ActivityIndicator size="large" color="#4f46e5" />
                            <Text style={styles.loadingText}>กำลังอัปเดต...</Text>
                        </View>
                    ) : (
                        <>
                            {(status === 'pending' || status === 'planned' || status === 'assigned') && (
                                <TouchableOpacity style={styles.primaryBtn} onPress={() => handleStatusUpdate('enroute')}>
                                    <Text style={styles.primaryBtnText}>เริ่มเดินทาง</Text>
                                </TouchableOpacity>
                            )}
                            {status === 'enroute' && (
                                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#4f46e5' }]} onPress={() => handleStatusUpdate('arrived')}>
                                    <Text style={styles.primaryBtnText}>ถึงจุดส่งแล้ว</Text>
                                </TouchableOpacity>
                            )}
                            {status === 'arrived' && (
                                <View style={styles.finalActions}>
                                    <TouchableOpacity
                                        style={[styles.primaryBtn, { flex: 2, backgroundColor: '#10b981' }]}
                                        onPress={() => navigation.navigate('POD', { taskId: task.id, orderId: task.orderId })}
                                    >
                                        <Package size={20} color="#fff" />
                                        <Text style={styles.primaryBtnText}>ส่งมอบสินค้า</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.primaryBtn, { flex: 1, backgroundColor: '#ef4444', marginLeft: 10 }]}
                                        onPress={confirmFailure}
                                    >
                                        <AlertCircle size={20} color="#fff" />
                                        <Text style={styles.primaryBtnText}>ไม่สำเร็จ</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 12 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    content: { flex: 1 },
    statusBanner: { padding: 12, alignItems: 'center' },
    statusText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    section: { padding: 25, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    customerName: { fontSize: 26, fontWeight: '900', color: '#1e293b', marginBottom: 8 },
    addressRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    addressText: { fontSize: 15, color: '#64748b', flex: 1, lineHeight: 22 },
    actionGrid: { flexDirection: 'row', gap: 15, marginTop: 30 },
    actionBtn: { flex: 1, alignItems: 'center', gap: 10 },
    iconCycle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    actionLabel: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 15 },
    reqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
    reqText: { fontSize: 14, color: '#475569', fontWeight: '600' },
    noteBox: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 20, flexDirection: 'row', gap: 15, marginTop: 10 },
    noteText: { flex: 1, fontSize: 13, color: '#64748b', lineHeight: 20 },
    operationArea: { padding: 25, paddingTop: 40 },
    loadingState: { alignItems: 'center', gap: 10 },
    loadingText: { color: '#4f46e5', fontWeight: 'bold' },
    primaryBtn: { backgroundColor: '#f59e0b', padding: 22, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 5 },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    finalActions: { flexDirection: 'row' }
});
