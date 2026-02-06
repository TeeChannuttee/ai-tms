import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, jobAPI } from '../services/api';
import { startLocationTracking, stopLocationTracking } from '../services/location';

interface AuthContextType {
    token: string | null;
    driverId: string | null;
    driverName: string | null;
    isLoading: boolean;
    signIn: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [driverId, setDriverId] = useState<string | null>(null);
    const [driverName, setDriverName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Initial Load (Run this ONLY ONCE on mount)
    useEffect(() => {
        loadStorageData();
    }, []);

    // 2. Poll for token removal (401 from interceptor)
    useEffect(() => {
        if (!token) return; // Don't poll if not logged in

        const interval = setInterval(async () => {
            const currentToken = await AsyncStorage.getItem('token');
            if (!currentToken) {
                console.log('[AUTH] Token removed externally (401), signing out UI...');
                setToken(null);
                setDriverId(null);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [token]);

    const loadStorageData = async () => {
        try {
            console.log('[AUTH] Loading storage data...');

            const rememberMe = await AsyncStorage.getItem('remember_me');
            // If remember_me is explicitly FALSE (or null/undefined on clean install), we clear valid session on restart
            // But we must be careful: if it's the very first launch, token is null anyway.
            // If we just logged in and killed app, rememberMe logic decides if we keep it.
            if (rememberMe !== 'true') {
                console.log('[AUTH] Remember Me is disabled or not set. Clearing session on launch.');
                await AsyncStorage.clear();
                // But wait, if we just cleared, token is gone.
                setToken(null);
                setDriverId(null);
                return;
            }

            const savedToken = await AsyncStorage.getItem('token');
            const savedId = await AsyncStorage.getItem('driver_id');
            const savedName = await AsyncStorage.getItem('driver_name');

            console.log('[AUTH] Saved token exists:', !!savedToken);

            if (savedToken) {
                console.log('[AUTH] Setting token from storage');
                setToken(savedToken);
                // NOTE: Do NOT start automatically on launch to avoid iOS permission crash loop.
                // Let user start it manually or waits for specific trigger.
                // startLocationTracking();
            } else {
                setToken(null);
            }
            if (savedId) setDriverId(savedId);
            if (savedName) setDriverName(savedName);
        } catch (e) {
            console.error('[AUTH] Failed to load auth data', e);
        } finally {
            setIsLoading(false);
            console.log('[AUTH] Storage load complete');
        }
    };

    const signIn = async (email: string, pass: string, rememberMe: boolean = true) => {
        console.log('[AUTH] Starting login for:', email, 'Remember:', rememberMe);
        const res = await authAPI.login(email, pass);
        console.log('[AUTH] Login API response received');
        const { token, user } = res.data;

        const actualDriverId = user.driver_id || user.id;

        // ALWAYS save to storage so Axios interceptor can work
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('driver_id', actualDriverId);
        await AsyncStorage.setItem('driver_name', user.name);
        await AsyncStorage.setItem('remember_me', rememberMe ? 'true' : 'false');

        console.log('[AUTH] Credentials saved (Remember:', rememberMe, ')');

        setToken(token);
        setDriverId(actualDriverId);
        setDriverName(user.name);

        console.log('[AUTH] Login successful, initializing app features...');

        // Enable Location Tracking
        startLocationTracking();

        // Fetch initial route data
        setTimeout(async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const routeRes = await jobAPI.getMyRoutes(actualDriverId, today);
                if (routeRes.data && routeRes.data.length > 0) {
                    const activeRoute = routeRes.data[0];
                    await AsyncStorage.setItem('vehicle_id', activeRoute.vehicle_id);
                    await AsyncStorage.setItem('last_route_id', activeRoute.id);
                    console.log('[AUTH] Active route found and cached:', activeRoute.id);
                }
            } catch (err) {
                console.log('[AUTH] No active route found (or API error):', err);
            }
        }, 500);
    };

    const signOut = async () => {
        await stopLocationTracking();
        await AsyncStorage.clear();
        setToken(null);
        setDriverId(null);
        setDriverName(null);
    };

    return (
        <AuthContext.Provider value={{ token, driverId, driverName, isLoading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
