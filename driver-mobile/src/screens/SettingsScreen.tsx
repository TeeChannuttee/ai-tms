import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Truck, Map, LogOut, Info, ChevronRight, ShieldCheck, CheckCircle2, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stopLocationTracking, startLocationTracking } from '../services/location';
import { fleetAPI } from '../services/api';

export default function SettingsScreen() {
    const { signOut, driverName, driverId } = useAuth();
    const [trackingEnabled, setTrackingEnabled] = useState(true);
    const [vehicle, setVehicle] = useState('ยังไม่ได้เลือก');
    const [vehicleId, setVehicleId] = useState<string | null>(null);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [showVehiclePicker, setShowVehiclePicker] = useState(false);
    const [loadingVehicles, setLoadingVehicles] = useState(false);

    useEffect(() => {
        loadSettings();
        fetchVehicles();
    }, []);

    const loadSettings = async () => {
        const vId = await AsyncStorage.getItem('vehicle_id');
        const vNum = await AsyncStorage.getItem('vehicle_number');
        if (vId) setVehicleId(vId);
        if (vNum) setVehicle(vNum);
    };

    const fetchVehicles = async () => {
        try {
            setLoadingVehicles(true);
            const res = await fleetAPI.listVehicles();
            setVehicles(res.data);
        } catch (err) {
            console.error('Failed to fetch vehicles', err);
        } finally {
            setLoadingVehicles(false);
        }
    };

    const selectVehicle = async (v: any) => {
        if (v.current_driver_id && v.current_driver_id !== driverId) {
            Alert.alert('เข้าถึงไม่ได้', 'รถคันนี้ถูกเลือกโดยพนักงานคนอื่นแล้ว');
            return;
        }

        try {
            setLoadingVehicles(true);
            await fleetAPI.linkVehicle(v.id, driverId!);
            await AsyncStorage.setItem('vehicle_id', v.id);
            await AsyncStorage.setItem('vehicle_number', v.license_plate);
            setVehicleId(v.id);
            setVehicle(v.license_plate);
            setShowVehiclePicker(false);
            Alert.alert('สำเร็จ', `เลือกหมายเลขรถ ${v.license_plate} แล้ว`);

            if (trackingEnabled) {
                await stopLocationTracking();
                await startLocationTracking();
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || 'ไม่สามารถบันทึกข้อมูลรถได้';
            Alert.alert('Error', msg);
        } finally {
            setLoadingVehicles(false);
        }
    };

    const releaseVehicle = async () => {
        if (!vehicleId) return;

        Alert.alert(
            'ยืนยันการคืนรถ',
            'คุณต้องการยกเลิกการเลือกยานพาหนะคันนี้ใช่หรือไม่?',
            [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                    text: 'ยืนยัน',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoadingVehicles(true);
                            await fleetAPI.unlinkVehicle(vehicleId);
                            await AsyncStorage.removeItem('vehicle_id');
                            await AsyncStorage.removeItem('vehicle_number');
                            setVehicleId(null);
                            setVehicle('ยังไม่ได้เลือก');
                            await stopLocationTracking();
                            Alert.alert('สำเร็จ', 'คืนรถเรียบร้อยแล้ว');
                        } catch (err) {
                            Alert.alert('Error', 'ไม่สามารถคืนรถได้');
                        } finally {
                            setLoadingVehicles(false);
                        }
                    }
                }
            ]
        );
    };

    const toggleTracking = async (value: boolean) => {
        setTrackingEnabled(value);
        if (value) {
            await startLocationTracking();
        } else {
            await stopLocationTracking();
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'ยืนยันการออกจากระบบ',
            'คุณแน่ใจหรือไม่ว่าต้องการจบงานและออกจากระบบ?',
            [
                { text: 'ยกเลิก', style: 'cancel' },
                { text: 'ออกจากระบบ', style: 'destructive', onPress: signOut }
            ]
        );
    };

    const SettingRow = ({ icon: Icon, label, value, onPress, isSwitch, switchValue, onSwitchChange, showRelease }: any) => (
        <View style={styles.row}>
            <TouchableOpacity
                style={styles.rowLeftContent}
                onPress={onPress}
                disabled={isSwitch}
            >
                <View style={styles.rowLeft}>
                    <View style={styles.iconBox}>
                        <Icon size={18} color="#475569" />
                    </View>
                    <Text style={styles.label}>{label}</Text>
                </View>
                <View style={styles.rowRight}>
                    {isSwitch ? (
                        <Switch
                            value={switchValue}
                            onValueChange={onSwitchChange}
                            trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
                            thumbColor={switchValue ? '#4f46e5' : '#94a3b8'}
                        />
                    ) : (
                        <>
                            {value && <Text style={styles.value}>{value}</Text>}
                            <ChevronRight size={16} color="#cbd5e1" />
                        </>
                    )}
                </View>
            </TouchableOpacity>
            {showRelease && (
                <TouchableOpacity style={styles.releaseBtn} onPress={releaseVehicle}>
                    <Text style={styles.releaseText}>คืนรถ</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>ตั้งค่าบัญชี</Text>
                </View>

                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{driverName?.charAt(0)}</Text>
                    </View>
                    <View>
                        <Text style={styles.profileName}>{driverName}</Text>
                        <Text style={styles.profileRole}>พนักงานขับรถ • สถานะปกติ</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>งานปัจจุบัน</Text>
                    <View style={styles.group}>
                        <SettingRow
                            icon={Truck}
                            label="เลือกหมายเลขรถ"
                            value={vehicle}
                            onPress={() => { fetchVehicles(); setShowVehiclePicker(true); }}
                            showRelease={vehicleId !== null}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ความเป็นส่วนตัวและความปลอดภัย</Text>
                    <View style={styles.group}>
                        <SettingRow
                            icon={Map}
                            label="ติดตามตำแหน่งพิกัดรถ"
                            isSwitch
                            switchValue={trackingEnabled}
                            onSwitchChange={toggleTracking}
                        />
                        <SettingRow icon={ShieldCheck} label="นโยบายความเป็นส่วนตัว" />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>แอปพลิเคชัน</Text>
                    <View style={styles.group}>
                        <SettingRow icon={Info} label="เวอร์ชัน" value="2.1.0-prod" />
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color="#ef4444" />
                    <Text style={styles.logoutText}>จบงานและออกจากระบบ</Text>
                </TouchableOpacity>

                <View style={styles.legal}>
                    <Text style={styles.legalText}>AI-TMS Logistics Solutions © 2026</Text>
                    <Text style={styles.legalText}>สงวนลิขสิทธิ์</Text>
                </View>
            </ScrollView>

            <Modal visible={showVehiclePicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เลือกพาหนะของคุณ</Text>
                            <TouchableOpacity onPress={() => setShowVehiclePicker(false)}>
                                <X size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {loadingVehicles ? (
                            <ActivityIndicator size="large" color="#4f46e5" style={{ marginVertical: 40 }} />
                        ) : (
                            <FlatList
                                data={vehicles}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => {
                                    const isTaken = item.current_driver_id && item.current_driver_id !== driverId;
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.vehicleItem,
                                                vehicleId === item.id && styles.activeVehicleItem,
                                                isTaken && styles.disabledVehicleItem
                                            ]}
                                            onPress={() => !isTaken && selectVehicle(item)}
                                            disabled={isTaken}
                                        >
                                            <View style={styles.vehicleInfo}>
                                                <Truck size={20} color={isTaken ? "#cbd5e1" : (vehicleId === item.id ? "#4f46e5" : "#64748b")} />
                                                <View>
                                                    <Text style={[
                                                        styles.vehiclePlate,
                                                        vehicleId === item.id && styles.activeText,
                                                        isTaken && styles.disabledText
                                                    ]}>
                                                        {item.license_plate}
                                                    </Text>
                                                    <Text style={styles.vehicleDesc}>
                                                        {isTaken ? '📍 กำลังใช้งานโดยผู้อื่น' : `${item.type} • ว่าง`}
                                                    </Text>
                                                </View>
                                            </View>
                                            {vehicleId === item.id && <CheckCircle2 size={20} color="#4f46e5" />}
                                        </TouchableOpacity>
                                    );
                                }}
                                contentContainerStyle={{ paddingBottom: 30 }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scrollContent: { padding: 25 },
    header: { marginBottom: 25 },
    title: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
    profileCard: { backgroundColor: '#fff', borderRadius: 28, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: '900' },
    profileName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    profileRole: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginLeft: 10, marginBottom: 12 },
    group: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    row: { flexDirection: 'row', alignItems: 'center', paddingRight: 15, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    rowLeftContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    value: { fontSize: 14, color: '#4f46e5', fontWeight: 'bold' },
    releaseBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    releaseText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
    logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#fee2e2', padding: 20, borderRadius: 24, marginTop: 10 },
    logoutText: { color: '#ef4444', fontWeight: '900', fontSize: 16 },
    legal: { marginTop: 40, alignItems: 'center', paddingBottom: 20 },
    legalText: { fontSize: 11, color: '#cbd5e1', marginBottom: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '70%', padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    vehicleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
    activeVehicleItem: { backgroundColor: '#f5f3ff', borderColor: '#4f46e5' },
    disabledVehicleItem: { backgroundColor: '#f1f5f9', opacity: 0.6 },
    vehicleInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    vehiclePlate: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    activeText: { color: '#4f46e5' },
    disabledText: { color: '#94a3b8' },
    vehicleDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 }
});
