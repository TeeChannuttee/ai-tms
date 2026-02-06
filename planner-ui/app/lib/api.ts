const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Helper function to get auth token
// Helper function to get auth token
function getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
        // Priority 1: Check standard auth_token (legacy/direct set)
        let token = localStorage.getItem('auth_token');
        if (token) return token;

        // Priority 2: Check standard 'token' key (legacy)
        token = localStorage.getItem('token');
        if (token) {
            console.warn('[DEBUG] Found legacy "token", migrating to "auth_token"');
            localStorage.setItem('auth_token', token);
            return token;
        }

        // Priority 3: Check Zustand 'auth-storage' (New Auth Store)
        try {
            const authStorage = localStorage.getItem('auth-storage');
            if (authStorage) {
                const parsed = JSON.parse(authStorage);
                if (parsed.state && parsed.state.token) {
                    // console.log("[DEBUG] Found token in auth-storage");
                    return parsed.state.token;
                }
            }
        } catch (e) {
            console.error("[DEBUG] Failed to parse auth-storage", e);
        }
    }
    return null;
}

// Helper for authenticated requests
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn(`[DEBUG] No auth token found. Request to ${endpoint} might fail.`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        console.error(`[DEBUG] 401 Unauthorized for ${endpoint}. Token sent: ${!!token}`);
        // Handle unauthorized (force logout)
        if (typeof window !== 'undefined') {
            // Clear potentially stale or invalid tokens
            localStorage.removeItem('auth_token');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirect to login to force re-authentication
            window.location.href = '/login';
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `API Error: ${response.status}`);
    }

    return response.json();
};

export const modelMonitoringAPI = {
    getMetrics: async (modelName: string, limit: number = 7) => {
        return await fetchWithAuth(`/models/${modelName}/metrics?limit=${limit}`);
    },
    checkDrift: async (modelName: string) => {
        return await fetchWithAuth(`/models/${modelName}/drift`);
    }
};

export const analyticsAPI = {
    getDashboard: async () => {
        return await fetchWithAuth('/analytics/dashboard');
    },
    getKPIs: async (period: string = '7d') => {
        // Fallback for older components if needed
        const data = await fetchWithAuth('/analytics/dashboard');
        return {
            onTimeRate: data.on_time_rate,
            totalCost: data.total_cost,
            lateOrders: data.pending_orders, // Using pending as a proxy for late in simple KPI
            fleetUtilization: data.vehicle_utilization
        }
    }
};

export const customerAPI = {
    list: async () => {
        return await fetchWithAuth('/customers');
    },
    create: async (data: any) => {
        return await fetchWithAuth('/customers', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    update: async (id: string, data: any) => {
        return await fetchWithAuth(`/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    delete: async (id: string) => {
        return await fetchWithAuth(`/customers/${id}`, {
            method: 'DELETE'
        });
    }
};

export const fleetAPI = {
    getVehicles: async () => {
        return await fetchWithAuth('/fleet/vehicles');
    },
    getDrivers: async () => {
        return await fetchWithAuth('/drivers');
    },
    getCustomers: async () => {
        return await fetchWithAuth('/customers');
    },
    createCustomer: async (data: any) => {
        return await fetchWithAuth('/customers', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    getFleetLocations: async () => {
        return await fetchWithAuth('/tracking/fleet');
    },
    getDepots: async () => {
        return await fetchWithAuth('/fleet/depots');
    },
    createVehicle: async (data: any) => {
        return await fetchWithAuth('/fleet/vehicles', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    updateVehicle: async (id: string, data: any) => {
        return await fetchWithAuth(`/fleet/vehicles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    deleteVehicle: async (id: string) => {
        return await fetchWithAuth(`/fleet/vehicles/${id}`, {
            method: 'DELETE'
        });
    },
    getRouteTracking: async (routeId: string) => {
        return await fetchWithAuth(`/tracking/routes/${routeId}`);
    }
};

export const podAPI = {
    getPods: async () => {
        return await fetchWithAuth('/pods');
    },
    getPod: async (id: string) => {
        return await fetchWithAuth(`/pods/${id}`);
    }
};

export const auditAPI = {
    getLogs: async (params?: any) => {
        const query = params ? `?${new URLSearchParams(params).toString()}` : '';
        return await fetchWithAuth(`/audit/logs${query}`);
    }
};

export const ordersAPI = {
    getOrders: async (status?: string) => {
        const query = status && status !== 'All' ? `?status=${status.toLowerCase()}` : '';
        return await fetchWithAuth(`/orders${query}`);
    },
    createOrder: async (orderData: any) => {
        return await fetchWithAuth('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
    },
    updateOrder: async (id: string, updates: any) => {
        return await fetchWithAuth(`/orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },
    deleteOrder: async (id: string) => {
        return await fetchWithAuth(`/orders/${id}`, {
            method: 'DELETE',
        });
    }
};

export const routesAPI = {
    getRoutes: async (date?: string) => {
        const query = date ? `?date=${date}` : '';
        return await fetchWithAuth(`/routes${query}`);
    },
    getRoute: async (id: string) => {
        return await fetchWithAuth(`/routes/${id}`);
    },
    assignRoute: async (id: string, driverId: string) => {
        return await fetchWithAuth(`/routes/${id}/assign`, {
            method: 'POST',
            body: JSON.stringify({ driver_id: driverId }),
        });
    },
    updateStopStatus: async (stopId: string, status: string) => {
        return await fetchWithAuth(`/routes/stops/${stopId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    },
    addStopToRoute: async (routeId: string, orderId: string) => {
        return await fetchWithAuth(`/routes/${routeId}/stops`, {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId }),
        });
    },
    removeStop: async (routeId: string, stopId: string) => {
        return await fetchWithAuth(`/routes/${routeId}/stops/${stopId}`, {
            method: 'DELETE',
        });
    },
    createRoute: async (routeData: any) => {
        // Manual route initialization
        return await fetchWithAuth('/routes', {
            method: 'POST',
            body: JSON.stringify(routeData),
        });
    },
    deleteRoute: async (id: string) => {
        return await fetchWithAuth(`/routes/${id}`, { method: 'DELETE' });
    },
    updateRoute: async (id: string, data: any) => {
        return await fetchWithAuth(`/routes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
};
