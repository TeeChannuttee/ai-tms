import AsyncStorage from '@react-native-async-storage/async-storage';
import { jobAPI, podAPI } from './api';
import * as Crypto from 'expo-crypto';

const SYNC_QUEUE_KEY = 'offline_sync_queue';
const LAST_SYNC_KEY = 'last_sync_time';

export type ActionType = 'START_ROUTE' | 'ARRIVE' | 'DELIVERED' | 'FAILED' | 'ENROUTE' | 'POD_CREATE' | 'POD_PHOTO' | 'POD_SIG' | 'GPS_POINT' | 'FULL_POD';

export interface SyncAction {
    id: string; // Internal Queue ID
    idempotencyKey: string; // UUID for Backend
    type: ActionType;
    payload: any;
    timestamp: number;
    retryCount: number;
}

export const SyncService = {
    addToQueue: async (type: ActionType, payload: any) => {
        const action: SyncAction = {
            id: Math.random().toString(36).substring(7),
            idempotencyKey: Crypto.randomUUID(),
            type,
            payload,
            timestamp: Date.now(),
            retryCount: 0
        };
        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const queue: SyncAction[] = queueStr ? JSON.parse(queueStr) : [];
        queue.push(action);
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
        return action;
    },

    processQueue: async () => {
        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        if (!queueStr) return;

        let queue: SyncAction[] = JSON.parse(queueStr);
        if (queue.length === 0) return;

        console.log(`[Sync] Processing ${queue.length} items...`);
        const remainingActions: SyncAction[] = [];

        // STRICT FIFO: If one action fails, we stop processing to maintain state sequence
        for (let i = 0; i < queue.length; i++) {
            const action = queue[i];

            if (action.retryCount > 10) {
                console.error(`[Sync] Action ${action.id} exhausted retries. Removing from queue.`);
                continue;
            }

            try {
                switch (action.type) {
                    case 'START_ROUTE':
                        await jobAPI.startRoute(action.payload.id);
                        break;
                    case 'ENROUTE':
                    case 'ARRIVE':
                    case 'DELIVERED':
                    case 'FAILED':
                        await jobAPI.updateStopStatus(
                            action.payload.id,
                            action.type.toLowerCase(),
                            action.payload.lat,
                            action.payload.lng,
                            action.payload.reason
                        );
                        break;
                    case 'GPS_POINT':
                        await jobAPI.sendTelemetry(action.payload);
                        break;
                    case 'FULL_POD':
                        console.log('[Sync] Processing FULL_POD for order:', action.payload.orderId);
                        const { orderId, recipient, photos, signature, taskId } = action.payload;

                        // 1. Create POD
                        const podRes = await podAPI.createPOD(orderId, recipient, action.payload.lat || 0, action.payload.lng || 0);
                        const newPodId = podRes.data.pod_id; // Backend returns 'pod_id' based on SubmitPOD handler

                        // 2. Upload Photos
                        for (const uri of photos) {
                            await podAPI.uploadPhoto(newPodId, uri);
                        }

                        // 3. Upload Signature
                        await podAPI.uploadSignature(newPodId, signature);

                        // 4. Update Status to delivered
                        await jobAPI.updateStopStatus(taskId, 'delivered');
                        console.log('[Sync] FULL_POD synced successfully');
                        break;
                }
            } catch (err) {
                console.warn(`[Sync] Failed ${action.type}:`, err);
                action.retryCount++;
                // Add this and all subsequent actions back to the queue
                remainingActions.push(...queue.slice(i));
                break;
            }
        }

        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingActions));
        await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    },

    clearQueue: async () => {
        await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    }
};

export const persistRoutesLocal = async (routes: any) => {
    await AsyncStorage.setItem('cached_routes', JSON.stringify(routes));
};

export const getCachedRoutes = async () => {
    const cached = await AsyncStorage.getItem('cached_routes');
    return cached ? JSON.parse(cached) : [];
};
