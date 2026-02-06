const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const api = {
    // Auth
    login: async (phone: string, pin: string) => {
        // In a real app, this would be a proper auth endpoint. 
        // For now, we'll hit the login endpoint we identified earlier.
        // Assuming the backend has a specific driver login or using the general one.
        // Let's use the general auth/login for now.
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: phone, password: pin }) // Mapping phone/pin to email/pass for simplicity if backend expects email
        });
        if (!res.ok) throw new Error('Login failed');
        return res.json();
    },

    // Jobs
    getMyJobs: async (token: string, driverId: string) => {
        const res = await fetch(`${API_BASE_URL}/routes?driver_id=${driverId}&status=assigned&date=${new Date().toISOString().split('T')[0]}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch jobs');
        return res.json();
    },

    updateStopStatus: async (token: string, stopId: string, status: string, lat?: number, lng?: number) => {
        const res = await fetch(`${API_BASE_URL}/routes/stops/${stopId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status, latitude: lat, longitude: lng })
        });
        if (!res.ok) throw new Error('Failed to update stop status');
        return res.json();
    },

    // Job Actions
    updateJobStatus: async (token: string, routeId: string, status: string) => {
        const res = await fetch(`${API_BASE_URL}/routes/${routeId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error('Failed to update status');
        return res.json();
    },

    createPOD: async (token: string, orderId: string, recipient: string) => {
        const res = await fetch(`${API_BASE_URL}/pod`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: orderId,
                recipient_name: recipient,
                latitude: 13.75, // Placeholder or from navigator.geolocation
                longitude: 100.5,
                notes: 'Delivered via Driver App'
            })
        });
        if (!res.ok) throw new Error('Failed to create POD');
        return res.json();
    },

    uploadPOD: async (token: string, podId: string, file: File) => {
        const formData = new FormData();
        formData.append('photo', file); // Field name must be 'photo' per pod.go:67

        const res = await fetch(`${API_BASE_URL}/pod/${podId}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
    },

    uploadSignature: async (token: string, podId: string, signatureData: string) => {
        const res = await fetch(`${API_BASE_URL}/pod/${podId}/signature`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ signature_data: signatureData })
        });
        if (!res.ok) throw new Error('Signature upload failed');
        return res.json();
    }
};
