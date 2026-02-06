// AI-TMS Enterprise API Client
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// API URL Configuration:
// - Web: localhost works directly
// - Android Emulator: Use 10.0.2.2 (localhost alias)
// - Physical Device: Use your computer's local IP (e.g., 192.168.1.x)
// Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)
const getApiUrl = () => {
    if (Platform.OS === 'web') {
        return 'http://localhost:8080/api/v1';
    }
    // For Android Emulator
    // return 'http://10.0.2.2:8080/api/v1';

    // For physical device, use your computer's LAN IP
    // Detected IP: 192.168.1.100 (Your PC's IP)
    return 'http://192.168.1.100:8080/api/v1';
};

const API_BASE_URL = getApiUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Add Idempotency Key for POST/PUT to prevent double-submit in low connectivity
    if (['post', 'put', 'patch'].includes(config.method || '')) {
        config.headers['Idempotency-Key'] = Crypto.randomUUID();
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            await AsyncStorage.removeItem('token');
            // Optional: Emit an event or use a global state to trigger navigation to Login
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    login: (email: string, pass: string) => api.post('/auth/login', { email, password: pass }),
    getMe: () => api.get('/users/me'),
};

export const fleetAPI = {
    listVehicles: () => api.get('/fleet/vehicles'),
    getVehicleDetail: (id: string) => api.get(`/fleet/vehicles/${id}`),
    linkVehicle: (id: string, driverId: string) => api.post(`/fleet/vehicles/${id}/link`, { driver_id: driverId }),
    unlinkVehicle: (id: string) => api.post(`/fleet/vehicles/${id}/unlink`),
};

export const jobAPI = {
    getTodayOverview: (driverId: string) => api.get(`/routes/stats?driver_id=${driverId}`),
    getMyRoutes: (driverId: string, date: string) => api.get(`/routes?driver_id=${driverId}&date=${date}`),
    getRouteDetail: (routeId: string) => api.get(`/routes/${routeId}`),
    startRoute: (routeId: string) => api.post(`/routes/${routeId}/start`),

    updateStopStatus: (stopId: string, status: string, lat?: number, lng?: number, reason?: string) => {
        // Map frontend status to backend enum: 'pending', 'in_progress', 'completed', 'failed'
        let backendStatus = status;
        if (status === 'enroute' || status === 'arrived') {
            backendStatus = 'in_progress';
        } else if (status === 'delivered') {
            backendStatus = 'completed';
        }

        return api.put(`/routes/stops/${stopId}/status`, { status: backendStatus, latitude: lat, longitude: lng, reason });
    },

    sendTelemetry: (data: {
        vehicle_id: string,
        route_id?: string,
        latitude: number,
        longitude: number,
        speed?: number,
        heading?: number,
        accuracy?: number,
        timestamp?: string
    }) => api.post('/tracking/gps', data),
};

export const podAPI = {
    createPOD: (orderId: string, recipientName: string, lat: number = 0, lng: number = 0) =>
        api.post('/pods', { order_id: orderId, recipient_name: recipientName, latitude: lat, longitude: lng }),
    uploadPhoto: (podId: string, photoUri: string) => {
        const formData = new FormData();
        const filename = photoUri.split('/').pop() || 'pod_photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        // @ts-ignore
        formData.append('photo', {
            uri: photoUri,
            name: filename,
            type: type,
        });
        return api.post(`/pods/${podId}/photo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    uploadSignature: (podId: string, signatureBase64: string) =>
        api.post(`/pods/${podId}/signature`, { signature_data: signatureBase64 }),
};

export const alertAPI = {
    getMyAlerts: (driverId: string) => api.get(`/drivers/alerts?driver_id=${driverId}`),
    markAsRead: (alertId: string) => api.put(`/drivers/alerts/${alertId}/read`),
};

export default api;
