import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignatureScreen from 'react-native-signature-canvas';
import { Camera, X, Check, Trash2, User, ChevronRight, Signature as SigIcon } from 'lucide-react-native';
import * as ExpoLocation from 'expo-location';
import { podAPI, jobAPI } from '../services/api';
import { SyncService } from '../services/sync';

export default function PODScreen({ route, navigation }: any) {
    const { taskId, orderId } = route.params;
    const [permission, requestPermission] = useCameraPermissions();
    const [photos, setPhotos] = useState<string[]>([]);
    const [signature, setSignature] = useState<string | null>(null);
    const [recipient, setRecipient] = useState('');
    const [step, setStep] = useState(1); // 1: Photos, 2: Info/Signature
    const [showCamera, setShowCamera] = useState(false);
    const [loading, setLoading] = useState(false);
    const cameraRef = useRef<any>(null);
    const signatureRef = useRef<any>(null);

    const takePhoto = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
            setPhotos([...photos, photo.uri]);
            setShowCamera(false);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const handleSignature = (signatureData: string) => {
        if (!signatureData) {
            Alert.alert('ข้อมูลไม่ครบ', 'กรุณาเซ็นชื่อรับสินค้า');
            return;
        }
        setSignature(signatureData);
        submitPOD(signatureData);
    };

    const handleSaveButton = () => {
        if (!recipient) {
            Alert.alert('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อผู้รับสินค้า');
            return;
        }

        if (signatureRef.current) {
            signatureRef.current.readSignature();
        } else {
            if (signature) {
                submitPOD(signature);
            } else {
                Alert.alert('Error', 'Signature pad not found');
            }
        }
    };

    const submitPOD = async (sig: string) => {
        if (!sig) return;
        if (photos.length === 0) {
            Alert.alert('ต้องการหลักฐาน', 'กรุณาถ่ายภาพสินค้าอย่างน้อย 1 ภาพ');
            return;
        }

        setLoading(true);
        try {
            let lat = 0, lng = 0;
            try {
                const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
                lat = loc.coords.latitude;
                lng = loc.coords.longitude;
            } catch (locErr) {
                console.warn('Failed to get location for POD', locErr);
            }

            const podRes = await podAPI.createPOD(orderId, recipient, lat, lng);
            const podId = podRes.data.pod_id;

            for (const uri of photos) {
                await podAPI.uploadPhoto(podId, uri);
            }

            await podAPI.uploadSignature(podId, sig);
            await jobAPI.updateStopStatus(taskId, 'delivered', lat, lng);

            Alert.alert('สำเร็จ', 'ส่งข้อมูลการส่งสินค้าเรียบร้อยแล้ว!');
            navigation.navigate('MainTabs');
        } catch (err: any) {
            console.warn('Sync failed, queueing POD action...', err.message || err);

            let lat = 0, lng = 0;
            try {
                const loc = await ExpoLocation.getLastKnownPositionAsync();
                if (loc) {
                    lat = loc.coords.latitude;
                    lng = loc.coords.longitude;
                }
            } catch (locErr) { }

            await SyncService.addToQueue('FULL_POD', {
                taskId,
                orderId,
                recipient,
                photos,
                signature: sig,
                lat,
                lng
            });
            Alert.alert('โหมดออฟไลน์', 'บันทึกข้อมูลในเครื่องแล้ว ระบบจะอัปโหลดเมื่อเชื่อมต่อเน็ต');
            navigation.navigate('MainTabs');
        } finally {
            setLoading(false);
        }
    };

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={styles.permissionText}>เราต้องการสิทธิ์เข้าถึงกล้องเพื่อถ่ายภาพหลักฐาน</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                    <Text style={styles.primaryBtnText}>อนุญาตการเข้าถึง</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <X size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ส่งหลักฐาน</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, step >= 1 && styles.activeDot]} />
                <View style={[styles.stepLine, step >= 2 && styles.activeLine]} />
                <View style={[styles.stepDot, step >= 2 && styles.activeDot]} />
            </View>

            {step === 1 ? (
                <View style={styles.content}>
                    <Text style={styles.title}>หลักฐานการส่งสินค้า</Text>
                    <Text style={styles.subtitle}>ถ่ายภาพสินค้าและจุดส่ง (สูงสุด 3 รูป)</Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                        {photos.map((uri, index) => (
                            <View key={index} style={styles.photoWrapper}>
                                <Image source={{ uri }} style={styles.photoPreview} />
                                <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(index)}>
                                    <Trash2 size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {photos.length < 3 && (
                            <TouchableOpacity style={styles.addPhotoBtn} onPress={() => setShowCamera(true)}>
                                <Camera size={32} color="#4f46e5" />
                                <Text style={styles.addPhotoText}>ถ่ายภาพ</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, photos.length === 0 && styles.disabledBtn]}
                            disabled={photos.length === 0}
                            onPress={() => setStep(2)}
                        >
                            <Text style={styles.primaryBtnText}>ขั้นตอนถัดไป</Text>
                            <ChevronRight size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.content}>
                    <Text style={styles.title}>ข้อมูลผู้รับ</Text>
                    <Text style={styles.subtitle}>กรอกชื่อและเซ็นรับสินค้า</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="ชื่อผู้รับสินค้า"
                        value={recipient}
                        onChangeText={setRecipient}
                    />

                    <View style={styles.sigContainer}>
                        {signature ? (
                            <View style={styles.sigPreviewBox}>
                                <Image source={{ uri: signature }} style={styles.sigImage} resizeMode="contain" />
                                <TouchableOpacity style={styles.clearSig} onPress={() => setSignature(null)}>
                                    <Text style={styles.clearSigText}>เซ็นใหม่</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.sigWrapper}>
                                <SignatureScreen
                                    ref={signatureRef}
                                    onOK={handleSignature}
                                    descriptionText="เซ็นชื่อลงในช่องว่างด้านบน"
                                    clearText="ล้าง"
                                    confirmText="ยืนยันลายเซ็น"
                                    autoClear={true}
                                />
                                <View style={styles.sigOverlay}>
                                    <SigIcon size={48} color="rgba(0,0,0,0.05)" />
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, loading && styles.disabledBtn]}
                            onPress={handleSaveButton}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Check size={20} color="#fff" />
                                    <Text style={styles.primaryBtnText}>ยืนยันการส่งสำเร็จ</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <Modal visible={showCamera} animationType="slide">
                <View style={{ flex: 1 }}>
                    <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} />
                    <SafeAreaView style={styles.cameraOverlay}>
                        <TouchableOpacity style={styles.closeCamera} onPress={() => setShowCamera(false)}>
                            <X size={28} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.cameraControls}>
                            <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                                <View style={styles.captureInner} />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 12 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, gap: 10 },
    stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e2e8f0' },
    activeDot: { backgroundColor: '#4f46e5', width: 24 },
    stepLine: { width: 40, height: 2, backgroundColor: '#e2e8f0' },
    activeLine: { backgroundColor: '#4f46e5' },
    content: { flex: 1, padding: 25 },
    title: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 30 },
    photoList: { flexDirection: 'row', marginBottom: 40 },
    photoWrapper: { width: 200, height: 300, marginRight: 15, borderRadius: 24, overflow: 'hidden' },
    photoPreview: { width: '100%', height: '100%' },
    removePhoto: { position: 'absolute', top: 15, right: 15, padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.8)', borderRadius: 12 },
    addPhotoBtn: { width: 200, height: 300, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', gap: 15, backgroundColor: '#f8fafc' },
    addPhotoText: { color: '#4f46e5', fontWeight: 'bold' },
    input: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20, fontSize: 16, color: '#1e293b' },
    sigContainer: { flex: 1, minHeight: 300, marginBottom: 20 },
    sigWrapper: { flex: 1, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
    sigOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' },
    sigPreviewBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    sigImage: { width: '100%', height: 200 },
    clearSig: { marginTop: 20, padding: 12 },
    clearSigText: { color: '#ef4444', fontWeight: 'bold' },
    footer: { marginTop: 'auto', paddingBottom: 20 },
    primaryBtn: { backgroundColor: '#4f46e5', padding: 22, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    disabledBtn: { backgroundColor: '#e2e8f0' },
    camera: { flex: 1 },
    cameraOverlay: { flex: 1, padding: 30, justifyContent: 'space-between' },
    closeCamera: { alignSelf: 'flex-end', padding: 10 },
    cameraControls: { alignItems: 'center', marginBottom: 20 },
    captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', padding: 5, justifyContent: 'center', alignItems: 'center' },
    captureInner: { width: '100%', height: '100%', borderRadius: 30, backgroundColor: '#fff' },
    permissionText: { textAlign: 'center', fontSize: 16, color: '#64748b', marginBottom: 20 }
});
