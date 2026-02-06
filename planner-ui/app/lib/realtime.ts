'use client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'

export type RealtimeEvent = {
    type: 'LOCATION_UPDATE' | 'STATUS_UPDATE' | 'ALERT_UPDATE'
    payload: any
}

class RealtimeService {
    private eventSource: EventSource | null = null
    private listeners: ((event: RealtimeEvent) => void)[] = []
    private reconnectTimeout: any = null

    connect() {
        if (this.eventSource) return

        const token = localStorage.getItem('token')
        if (!token) return

        // Note: EventSource doesn't support custom headers (like Authorization) out of the box.
        // We'll use a query param for token or a simple bypass if in dev.
        // For now, let's try with query param as it's common for SSEauth.
        const url = `${API_BASE_URL}/events?token=${token}`

        this.eventSource = new EventSource(url)

        this.eventSource.onmessage = (event) => {
            try {
                const data: RealtimeEvent = JSON.parse(event.data)
                this.notify(data)
            } catch (err) {
                console.error('Failed to parse SSE event:', err)
            }
        }

        this.eventSource.onerror = (err) => {
            console.error('SSE connection error:', err)
            this.disconnect()
            this.retryConnection()
        }
    }

    private retryConnection() {
        if (this.reconnectTimeout) return
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null
            this.connect()
        }, 5000)
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
        }
    }

    subscribe(callback: (event: RealtimeEvent) => void) {
        this.listeners.push(callback)
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback)
        }
    }

    private notify(event: RealtimeEvent) {
        this.listeners.forEach(callback => callback(event))
    }
}

export const realtimeService = new RealtimeService()
