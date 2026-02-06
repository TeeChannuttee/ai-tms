import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { Truck } from 'lucide-react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();

    const handleLogin = async () => {
        const emailTrimmed = email.trim();
        const passwordTrimmed = password.trim();

        if (!emailTrimmed || !passwordTrimmed) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        console.log(`[LOGIN] Attempting login. Email: '${emailTrimmed}', PassLen: ${passwordTrimmed.length}`);

        setLoading(true);
        try {
            // Clear old tokens before login to prevent 401 errors
            // Note: This wipes EVERYTHING including old remember_me settings, but that's fine for a fresh login
            console.log('[LOGIN] Clearing old auth data...');

            // CRASH FIX: `AsyncStorage.clear()` causes NSError on some iOS devices if storage is already empty/locked.
            // Since signIn overwrites keys anyway, we can skip this explicit clear to prevent the crash.
            // await AsyncStorage.clear(); 

            console.log('[LOGIN] Old auth data clear skipped (to prevent iOS crash)');

            await signIn(emailTrimmed, passwordTrimmed, rememberMe);
        } catch (err: any) {
            console.error('[LOGIN ERROR]', err);
            let errorMessage = 'Invalid credentials';
            if (err.response) {
                // Server responded
                errorMessage = err.response.data?.error || `Server Error (${err.response.status})`;
            } else if (err.request) {
                // Request sent but no response (Network Error)
                errorMessage = 'Cannot connect to server. Check IP/WiFi.';
            } else {
                errorMessage = err.message || 'Unknown Error';
            }
            Alert.alert('Login Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.inner}>
                <View style={styles.logoContainer}>
                    <View style={styles.iconCircle}>
                        <Truck size={40} color="#4f46e5" />
                    </View>
                    <Text style={styles.title}>AI-TMS คนขับ</Text>
                    <Text style={styles.subtitle}>เข้าสู่ระบบเพื่อเริ่มงานขนส่งของคุณ</Text>
                </View>

                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder="อีเมล"
                        placeholderTextColor="#9ca3af"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="รหัสผ่าน"
                        placeholderTextColor="#9ca3af"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={styles.rememberContainer}
                        onPress={() => setRememberMe(!rememberMe)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                            {rememberMe && <View style={styles.checkboxInner} />}
                        </View>
                        <Text style={styles.rememberText}>จำรหัสผ่าน (Auto Login)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    inner: {
        flex: 1,
        padding: 30,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 50,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 5,
        textAlign: 'center',
    },
    form: {
        width: '100%',
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        fontSize: 16,
        color: '#1e293b',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    button: {
        backgroundColor: '#4f46e5',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    rememberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    rememberText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        borderRadius: 6,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5',
    },
    checkboxInner: {
        width: 10,
        height: 10,
        backgroundColor: '#fff',
        borderRadius: 2,
    }
});
