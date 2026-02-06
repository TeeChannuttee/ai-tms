import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SyncService } from '../services/sync';
import { CloudOff, RefreshCw, CheckCircle2, AlertTriangle, Clock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SyncScreen() {
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);

    useEffect(() => {
        loadQueue();
    }, []);

    const loadQueue = async () => {
        try {
            const queueStr = await AsyncStorage.getItem('offline_sync_queue');
            setQueue(queueStr ? JSON.parse(queueStr) : []);
            const last = await AsyncStorage.getItem('last_sync_time');
            setLastSync(last);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSyncNow = async () => {
        setLoading(true);
        try {
            await SyncService.processQueue();
            await AsyncStorage.setItem('last_sync_time', new Date().toISOString());
            await loadQueue();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const renderItem = ({ item }: any) => (
        <View style={styles.syncItem}>
            <View style={styles.itemHeader}>
                <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{item.type.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
            </View>
            <Text style={styles.payloadSummary}>ID: {item.payload.id || item.payload.order_id}</Text>
            <View style={styles.statusRow}>
                <Clock size={12} color="#94a3b8" />
                <Text style={styles.statusText}>รอการซิงค์</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>รายการรออัปโหลด</Text>
                <Text style={styles.subtitle}>รายการที่รอการซิงค์กับเซิร์ฟเวอร์</Text>
            </View>

            <View style={styles.syncMeta}>
                <View style={styles.metaBox}>
                    <Text style={styles.metaVal}>{queue.length}</Text>
                    <Text style={styles.metaLabel}>รอ</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaBox}>
                    <Text style={styles.metaVal}>{lastSync ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text>
                    <Text style={styles.metaLabel}>ซิงค์ล่าสุด</Text>
                </View>
            </View>

            {queue.length > 0 ? (
                <FlatList
                    data={queue}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleSyncNow} />}
                />
            ) : (
                <View style={styles.empty}>
                    <CheckCircle2 size={64} color="#10b981" />
                    <Text style={styles.emptyTitle}>ซิงค์เรียบร้อย</Text>
                    <Text style={styles.emptySub}>ข้อมูลทั้งหมดถูกบันทึกที่เซิร์ฟเวอร์แล้ว</Text>
                </View>
            )}

            {queue.length > 0 && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.syncBtn}
                        onPress={handleSyncNow}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <RefreshCw size={20} color="#fff" />
                                <Text style={styles.syncBtnText}>ซิงค์ข้อมูลตอนนี้</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 25 },
    title: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
    syncMeta: { flexDirection: 'row', backgroundColor: '#fff', margin: 25, marginTop: 0, borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    metaBox: { flex: 1, alignItems: 'center' },
    metaVal: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    metaLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', marginTop: 4 },
    metaDivider: { width: 1, height: 30, backgroundColor: '#f1f5f9' },
    listContent: { padding: 25, paddingTop: 0 },
    syncItem: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    typeBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    typeText: { fontSize: 10, fontWeight: 'bold', color: '#475569' },
    timestamp: { fontSize: 11, color: '#94a3b8' },
    payloadSummary: { fontSize: 14, color: '#1e293b', fontWeight: '600', marginBottom: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    footer: { padding: 25, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    syncBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    syncBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' }
});
