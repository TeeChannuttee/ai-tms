
export interface LatLng {
    lat: number;
    lng: number;
}

export interface SimulatedVehicle {
    id: string;
    name: string;
    type: 'TRUCK' | 'VAN' | 'BIKE';
    status: 'MOVING' | 'IDLE' | 'DELAYED' | 'COMPLETED';
    currentLocation: LatLng;
    destination: string;
    progress: number; // 0-100
    nextStopEta: string;
}

// Depots and Customers in Bangkok
const LOCATIONS = {
    DEPOT: { lat: 13.7563, lng: 100.5018 },
    SIAM: { lat: 13.7469, lng: 100.5350 },
    ASOK: { lat: 13.7370, lng: 100.5604 },
    SILOM: { lat: 13.7291, lng: 100.5298 },
    ICONSIAM: { lat: 13.7266, lng: 100.5109 },
    CHATUCHAK: { lat: 13.8037, lng: 100.5528 },
    RAMA9: { lat: 13.7586, lng: 100.5656 }
};

const INITIAL_FLEET: SimulatedVehicle[] = [
    { id: 'V-001', name: 'Van-001 (Somchai)', type: 'VAN', status: 'MOVING', currentLocation: LOCATIONS.SIAM, destination: 'Asok', progress: 45, nextStopEta: '10 mins' },
    { id: 'V-002', name: 'Truck-004 (Wichai)', type: 'TRUCK', status: 'DELAYED', currentLocation: LOCATIONS.RAMA9, destination: 'Depot', progress: 80, nextStopEta: '35 mins' },
    { id: 'V-003', name: 'Bike-009 (Lek)', type: 'BIKE', status: 'IDLE', currentLocation: LOCATIONS.SILOM, destination: '-', progress: 100, nextStopEta: '-' },
    { id: 'V-004', name: 'Van-002 (Nop)', type: 'VAN', status: 'MOVING', currentLocation: LOCATIONS.ICONSIAM, destination: 'Sathorn', progress: 20, nextStopEta: '15 mins' },
];

export class FleetSimulationService {
    private fleet: SimulatedVehicle[];
    private subscribers: ((fleet: SimulatedVehicle[]) => void)[] = [];
    private intervalId: NodeJS.Timeout | null = null;

    constructor() {
        this.fleet = JSON.parse(JSON.stringify(INITIAL_FLEET));
    }

    startSimulation() {
        if (this.intervalId) return;

        this.intervalId = setInterval(() => {
            this.updateFleetPositions();
            this.notifySubscribers();
        }, 2000); // Update every 2 seconds
    }

    stopSimulation() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    subscribe(callback: (fleet: SimulatedVehicle[]) => void) {
        this.subscribers.push(callback);
        callback(this.fleet); // Initial state
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    private notifySubscribers() {
        this.subscribers.forEach(cb => cb([...this.fleet]));
    }

    private updateFleetPositions() {
        this.fleet = this.fleet.map(vehicle => {
            if (vehicle.status === 'IDLE' || vehicle.status === 'COMPLETED') return vehicle;

            // Simple jitter movement simulation
            // In a real app, this would interpolate along a polyline
            const moveLat = (Math.random() - 0.5) * 0.001;
            const moveLng = (Math.random() - 0.5) * 0.001;

            let newProgress = vehicle.progress + (Math.random() * 0.5);
            if (newProgress > 100) newProgress = 100;

            // Randomly trigger delay for demo
            if (vehicle.status === 'MOVING' && Math.random() > 0.98) {
                // 2% chance to become delayed each tick
                // vehicle.status = 'DELAYED'; // Commented out to be less annoying
            }

            return {
                ...vehicle,
                currentLocation: {
                    lat: vehicle.currentLocation.lat + moveLat,
                    lng: vehicle.currentLocation.lng + (vehicle.status !== 'DELAYED' ? moveLng : 0) // Delayed moves slower/stops
                },
                progress: newProgress
            };
        });
    }
}

export const fleetSimulation = new FleetSimulationService();
