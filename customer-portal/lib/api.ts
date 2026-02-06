// API Client for AI-TMS Backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    refresh_token: string;
    user: User;
    expires_at: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

export interface Order {
    id: string;
    order_number: string;
    customer_id: string;
    customer_name?: string;
    pickup_address: string;
    delivery_address: string;
    pickup_time: string;
    delivery_time: string;
    status: string;
    priority: string;
    notes: string;
    created_at: string;
}

export interface Vehicle {
    id: string;
    license_plate: string;
    type: string;
    capacity: number;
    cost_per_km: number;
    status: string;
}

export interface Route {
    id: string;
    vehicle_id: string;
    driver_id?: string;
    stops: RouteStop[];
    total_distance: number;
    total_duration_minutes: number;
    total_cost: number;
    utilization: number;
    status: string;
}

export interface RouteStop {
    sequence: number;
    order_id: string;
    customer_id: string;
    address: string;
    arrival_time: string;
    departure_time: string;
    service_time_minutes: number;
    distance_km: number;
}

export interface GenerateRouteRequest {
    order_ids: string[];
    vehicle_ids?: string[];
    depot_id: string;
}

export interface GenerateRouteResponse {
    routes: Route[];
    total_distance: number;
    total_cost: number;
    unassigned_orders: number;
}

// Helper function to get auth token
function getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_token');
    }
    return null;
}

// Helper function to make authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// Auth API
export const authAPI = {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const result = await response.json();

        // Save token to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
        }

        return result;
    },

    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
        }
    },

    getMe: async (): Promise<User> => {
        return fetchWithAuth('/users/me');
    },
};

// Orders API
export const ordersAPI = {
    list: async (params?: { status?: string; customer_id?: string; date?: string }): Promise<Order[]> => {
        const queryParams = new URLSearchParams(params as any).toString();
        return fetchWithAuth(`/orders${queryParams ? `?${queryParams}` : ''}`);
    },

    get: async (id: string): Promise<Order> => {
        return fetchWithAuth(`/orders/${id}`);
    },

    create: async (data: Partial<Order>): Promise<Order> => {
        return fetchWithAuth('/orders', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update: async (id: string, data: Partial<Order>): Promise<void> => {
        return fetchWithAuth(`/orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    delete: async (id: string): Promise<void> => {
        return fetchWithAuth(`/orders/${id}`, {
            method: 'DELETE',
        });
    },

    track: async (orderNumber: string): Promise<any> => {
        return fetch(`${API_BASE_URL}/orders/track/${orderNumber}`).then(r => r.json());
    },
};

// Fleet API
export const fleetAPI = {
    listVehicles: async (params?: { status?: string }): Promise<Vehicle[]> => {
        const queryParams = new URLSearchParams(params as any).toString();
        return fetchWithAuth(`/fleet/vehicles${queryParams ? `?${queryParams}` : ''}`);
    },

    createVehicle: async (data: Partial<Vehicle>): Promise<Vehicle> => {
        return fetchWithAuth('/fleet/vehicles', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateVehicle: async (id: string, data: Partial<Vehicle>): Promise<void> => {
        return fetchWithAuth(`/fleet/vehicles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    listDepots: async (): Promise<any[]> => {
        return fetchWithAuth('/fleet/depots');
    },
};

// Routes API
export const routesAPI = {
    generate: async (data: GenerateRouteRequest): Promise<GenerateRouteResponse> => {
        return fetchWithAuth('/routes/generate', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    list: async (params?: { status?: string; date?: string }): Promise<Route[]> => {
        const queryParams = new URLSearchParams(params as any).toString();
        return fetchWithAuth(`/routes${queryParams ? `?${queryParams}` : ''}`);
    },

    get: async (id: string): Promise<Route> => {
        return fetchWithAuth(`/routes/${id}`);
    },

    assign: async (id: string, driverId: string): Promise<void> => {
        return fetchWithAuth(`/routes/${id}/assign`, {
            method: 'POST',
            body: JSON.stringify({ driver_id: driverId }),
        });
    },

    update: async (id: string, data: { status?: string; locked?: boolean }): Promise<void> => {
        return fetchWithAuth(`/routes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
};

// Tracking API
export const trackingAPI = {
    updateGPS: async (data: {
        vehicle_id: string;
        latitude: number;
        longitude: number;
        speed?: number;
        heading?: number;
    }): Promise<void> => {
        return fetchWithAuth('/tracking/gps', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    getVehicleLocation: async (vehicleId: string): Promise<any> => {
        return fetchWithAuth(`/tracking/vehicles/${vehicleId}`);
    },

    getRouteTracking: async (routeId: string): Promise<any> => {
        return fetchWithAuth(`/tracking/routes/${routeId}`);
    },
};

// POD API
export const podAPI = {
    submit: async (data: {
        order_id: string;
        recipient_name: string;
        latitude: number;
        longitude: number;
        notes?: string;
    }): Promise<{ pod_id: string }> => {
        return fetchWithAuth('/pod', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    uploadPhoto: async (podId: string, file: File): Promise<void> => {
        const formData = new FormData();
        formData.append('photo', file);

        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/pod/${podId}/upload`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Photo upload failed');
        }

        return response.json();
    },

    uploadSignature: async (podId: string, signatureData: string): Promise<void> => {
        return fetchWithAuth(`/pod/${podId}/signature`, {
            method: 'POST',
            body: JSON.stringify({ signature_data: signatureData }),
        });
    },

    get: async (podId: string): Promise<any> => {
        return fetchWithAuth(`/pod/${podId}`);
    },

    getByOrder: async (orderId: string): Promise<any> => {
        return fetchWithAuth(`/pod/order/${orderId}`);
    },
};

// Analytics API
export const analyticsAPI = {
    getDashboard: async (): Promise<any> => {
        return fetchWithAuth('/analytics/dashboard');
    },

    getDailyReport: async (date: string): Promise<any> => {
        return fetchWithAuth(`/analytics/reports/daily?date=${date}`);
    },

    getWeeklyReport: async (week: number): Promise<any> => {
        return fetchWithAuth(`/analytics/reports/weekly?week=${week}`);
    },
};

// WebSocket connection for real-time updates
export function connectWebSocket(onMessage: (data: any) => void): WebSocket | null {
    if (typeof window === 'undefined') return null;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081/ws';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessage(data);
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
    };

    return ws;
}
