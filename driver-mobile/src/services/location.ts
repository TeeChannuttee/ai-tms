import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jobAPI } from './api';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the task explicitly in global scope
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
        console.error('[GPS] Background task error:', error);
        return;
    }
    if (data) {
        const { locations } = data;
        const location = locations[0];
        if (location) {
            console.log('[GPS] Background update:', location.coords.latitude, location.coords.longitude);
            try {
                const vehicleId = await AsyncStorage.getItem('vehicle_id');
                const routeId = await AsyncStorage.getItem('last_route_id');
                // const lastLat = await AsyncStorage.getItem('last_lat');

                // Adaptive logic: If the speed is very low and coordinates haven't changed much, 
                // we could skip sending to save battery, but for now we send every 20s as per requirement.

                if (vehicleId) {
                    await jobAPI.sendTelemetry({
                        vehicle_id: vehicleId,
                        route_id: routeId || undefined,
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        speed: (location.coords.speed || 0) * 3.6, // Convert m/s to km/h
                        heading: location.coords.heading || 0,
                        accuracy: location.coords.accuracy || 0,
                        timestamp: new Date().toISOString() // Use server-friendly ISO
                    });

                    await AsyncStorage.setItem('last_lat', location.coords.latitude.toString());
                }
            } catch (err) {
                console.log('[GPS] Background telemetry upload failed (likely offline)', err);
            }
        }
    }
});

export const startLocationTracking = async () => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.warn('[GPS] Permission denied');
            return;
        }

        // Expo Go Workaround: Start a foreground watch if background fails or for testing
        console.log('[GPS] Starting Foreground Watch...');
        await Location.watchPositionAsync({
            accuracy: Location.Accuracy.High,
            distanceInterval: 0,
            timeInterval: 5000,
        }, async (location) => {
            console.log('[GPS] Foreground update:', location.coords.latitude, location.coords.longitude);
            const vehicleId = await AsyncStorage.getItem('vehicle_id');
            const routeId = await AsyncStorage.getItem('last_route_id');

            if (vehicleId) {
                jobAPI.sendTelemetry({
                    vehicle_id: vehicleId,
                    route_id: routeId || undefined,
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    speed: (location.coords.speed || 0) * 3.6,
                    heading: location.coords.heading || 0,
                    timestamp: new Date().toISOString()
                }).catch(e => console.log('[GPS] Update failed', e.message));
            }
        });

        // Still try to start background for "Production" production builds
        try {
            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
            if (bgStatus === 'granted') {
                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 10000,
                    distanceInterval: 0,
                    foregroundService: {
                        notificationTitle: 'AI-TMS Live Tracking',
                        notificationBody: 'Sending route telemetry...',
                        notificationColor: '#4f46e5',
                    }
                });
            }
        } catch (e) {
            console.log('[GPS] Background tracking skipped (Expo Go limit)');
        }

    } catch (error) {
        console.error('[GPS] Failed to start location tracking:', error);
    }
};

export const stopLocationTracking = async () => {
    try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            console.log('[GPS] Location Updates Stopped');
        }
    } catch (error) {
        console.error('[GPS] Error stopping location tracking:', error);
    }
};
