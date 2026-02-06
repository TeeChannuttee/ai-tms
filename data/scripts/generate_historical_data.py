"""
AI-TMS Historical Data Generator
Generates realistic historical data for ML model training:
- Completed deliveries (10,000+)
- GPS tracking data
- Traffic patterns
- Driver behavior
- Customer service times
- POD records
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import random
from pathlib import Path

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# Configuration
NUM_VEHICLES = 50
NUM_DRIVERS = 100
NUM_CUSTOMERS = 500
NUM_DEPOTS = 5
NUM_DELIVERIES = 10000
START_DATE = datetime(2025, 7, 1)
END_DATE = datetime(2026, 1, 31)

# Bangkok area coordinates (rough bounds)
BANGKOK_LAT_MIN, BANGKOK_LAT_MAX = 13.65, 13.95
BANGKOK_LNG_MIN, BANGKOK_LNG_MAX = 100.45, 100.65

def generate_coordinates():
    """Generate random coordinates within Bangkok area"""
    lat = np.random.uniform(BANGKOK_LAT_MIN, BANGKOK_LAT_MAX)
    lng = np.random.uniform(BANGKOK_LNG_MIN, BANGKOK_LNG_MAX)
    return lat, lng

def generate_depots():
    """Generate depot/warehouse data"""
    depots = []
    for i in range(NUM_DEPOTS):
        lat, lng = generate_coordinates()
        depots.append({
            'depot_id': f'DEPOT_{i+1:03d}',
            'name': f'Warehouse {i+1}',
            'address': f'{random.randint(1, 999)} Rama IV Road, Bangkok',
            'latitude': lat,
            'longitude': lng,
            'operating_hours_start': '06:00',
            'operating_hours_end': '22:00',
            'avg_loading_time_minutes': np.random.randint(15, 45),
            'capacity_pallets': np.random.randint(100, 500)
        })
    return pd.DataFrame(depots)

def generate_vehicles():
    """Generate fleet/vehicle data"""
    vehicle_types = ['Van', 'Truck 4-Wheel', 'Truck 6-Wheel', 'Truck 10-Wheel']
    capacities = [1000, 2000, 5000, 10000]  # kg
    cost_per_km = [8, 12, 18, 25]  # THB
    
    vehicles = []
    for i in range(NUM_VEHICLES):
        vtype_idx = np.random.choice(len(vehicle_types), p=[0.4, 0.3, 0.2, 0.1])
        vehicles.append({
            'vehicle_id': f'VEH_{i+1:03d}',
            'license_plate': f'{random.choice(["กข", "กท", "กม"])}-{random.randint(1000, 9999)}',
            'vehicle_type': vehicle_types[vtype_idx],
            'capacity_kg': capacities[vtype_idx],
            'cost_per_km': cost_per_km[vtype_idx],
            'fuel_type': random.choice(['Diesel', 'Gasoline', 'Electric']),
            'year': np.random.randint(2018, 2025),
            'status': 'active',
            'depot_id': f'DEPOT_{np.random.randint(1, NUM_DEPOTS+1):03d}'
        })
    return pd.DataFrame(vehicles)

def generate_drivers():
    """Generate driver data"""
    thai_names = ['สมชาย', 'สมหญิง', 'วิชัย', 'นิภา', 'ประเสริฐ', 'สุดา', 'อนุชา', 'พิมพ์', 'ชัยวัฒน์', 'วรรณา']
    surnames = ['ใจดี', 'มั่นคง', 'รุ่งเรือง', 'สุขสันต์', 'เจริญ', 'พัฒนา', 'วิริยะ', 'สมบูรณ์']
    
    drivers = []
    for i in range(NUM_DRIVERS):
        experience_years = np.random.exponential(3) + 1  # 1-10+ years
        drivers.append({
            'driver_id': f'DRV_{i+1:03d}',
            'name': f'{random.choice(thai_names)} {random.choice(surnames)}',
            'email': f'driver{i+1:03d}@ai-tms.com',
            'phone': f'08{random.randint(10000000, 99999999)}',
            'license_number': f'{random.randint(10000000, 99999999)}',
            'experience_years': min(experience_years, 15),
            'rating': np.random.beta(8, 2) * 5,  # Skewed towards higher ratings
            'shift_start': random.choice(['06:00', '07:00', '08:00']),
            'shift_end': random.choice(['17:00', '18:00', '19:00']),
            'status': 'active',
            'depot_id': f'DEPOT_{np.random.randint(1, NUM_DEPOTS+1):03d}'
        })
    return pd.DataFrame(drivers)

def generate_customers():
    """Generate customer/store data"""
    business_types = ['Retail Store', 'Restaurant', 'Warehouse', 'Office', 'Supermarket']
    
    customers = []
    for i in range(NUM_CUSTOMERS):
        lat, lng = generate_coordinates()
        # Service time varies by business type
        btype = random.choice(business_types)
        base_service_time = {'Retail Store': 10, 'Restaurant': 8, 'Warehouse': 20, 
                            'Office': 5, 'Supermarket': 15}[btype]
        
        customers.append({
            'customer_id': f'CUST_{i+1:04d}',
            'name': f'{random.choice(["บริษัท", "ร้าน", "ห้าง"])} {random.choice(["สยาม", "ไทย", "กรุงเทพ", "สุขใจ"])} {i+1}',
            'business_type': btype,
            'address': f'{random.randint(1, 999)} Sukhumvit Road, Bangkok',
            'latitude': lat,
            'longitude': lng,
            'time_window_start': random.choice(['08:00', '09:00', '10:00', 'any']),
            'time_window_end': random.choice(['17:00', '18:00', '19:00', 'any']),
            'avg_service_time_minutes': base_service_time + np.random.randint(-3, 5),
            'access_difficulty': random.choice(['easy', 'medium', 'hard']),
            'parking_availability': random.choice(['good', 'limited', 'difficult']),
            'contact_phone': f'02{random.randint(1000000, 9999999)}'
        })
    return pd.DataFrame(customers)

def generate_deliveries(vehicles_df, drivers_df, customers_df, depots_df):
    """Generate historical delivery data with realistic patterns"""
    deliveries = []
    
    for i in range(NUM_DELIVERIES):
        # Random date within range
        days_diff = (END_DATE - START_DATE).days
        delivery_date = START_DATE + timedelta(days=int(np.random.randint(0, days_diff)))
        
        # Less deliveries on weekends
        if delivery_date.weekday() >= 5:
            if np.random.random() > 0.3:
                continue
        
        # Select random vehicle, driver, customer, depot
        vehicle = vehicles_df.sample(1).iloc[0]
        driver = drivers_df[drivers_df['depot_id'] == vehicle['depot_id']].sample(1).iloc[0]
        customer = customers_df.sample(1).iloc[0]
        depot = depots_df[depots_df['depot_id'] == vehicle['depot_id']].iloc[0]
        
        # Calculate distance (simplified Euclidean)
        distance_km = np.sqrt(
            (customer['latitude'] - depot['latitude'])**2 + 
            (customer['longitude'] - depot['longitude'])**2
        ) * 111  # Rough km conversion
        distance_km = max(distance_km, 2)  # Minimum 2km
        
        # Planned times
        start_time = datetime.strptime(driver['shift_start'], '%H:%M')
        planned_departure = delivery_date.replace(
            hour=start_time.hour, 
            minute=start_time.minute
        ) + timedelta(minutes=int(np.random.randint(0, 120)))
        
        # Travel time with traffic factor
        base_travel_minutes = distance_km * 3  # ~20 km/h in city
        traffic_factor = np.random.uniform(0.8, 1.5)  # Traffic variability
        if 7 <= planned_departure.hour <= 9 or 16 <= planned_departure.hour <= 19:
            traffic_factor *= 1.3  # Rush hour
        
        actual_travel_minutes = base_travel_minutes * traffic_factor
        
        # Service time
        planned_service_minutes = customer['avg_service_time_minutes']
        actual_service_minutes = int(planned_service_minutes) + int(np.random.randint(-5, 10))
        
        # Parking time
        parking_difficulty = {'good': 2, 'limited': 5, 'difficult': 10}
        parking_minutes = parking_difficulty[customer['parking_availability']] + int(np.random.randint(-2, 5))
        
        # Actual arrival
        actual_arrival = planned_departure + timedelta(
            minutes=int(depot['avg_loading_time_minutes']) + actual_travel_minutes
        )
        
        # Completion time
        completion_time = actual_arrival + timedelta(
            minutes=int(parking_minutes + actual_service_minutes)
        )
        
        # Determine if late
        if customer['time_window_end'] != 'any':
            deadline = delivery_date.replace(
                hour=int(customer['time_window_end'].split(':')[0]),
                minute=int(customer['time_window_end'].split(':')[1])
            )
            is_late = actual_arrival > deadline
            late_minutes = max(0, (actual_arrival - deadline).total_seconds() / 60)
        else:
            is_late = False
            late_minutes = 0
        
        # Status (95% successful)
        status = 'delivered' if np.random.random() < 0.95 else random.choice(['failed', 'cancelled'])
        
        deliveries.append({
            'delivery_id': f'DEL_{i+1:06d}',
            'order_number': f'ORD_{i+1:06d}',
            'delivery_date': delivery_date.date(),
            'vehicle_id': vehicle['vehicle_id'],
            'driver_id': driver['driver_id'],
            'customer_id': customer['customer_id'],
            'depot_id': depot['depot_id'],
            'distance_km': round(distance_km, 2),
            'weight_kg': np.random.randint(50, int(vehicle['capacity_kg'] * 0.8)),
            'planned_departure': planned_departure,
            'actual_departure': planned_departure + timedelta(minutes=int(np.random.randint(-10, 20))),
            'planned_arrival': planned_departure + timedelta(minutes=int(base_travel_minutes)),
            'actual_arrival': actual_arrival,
            'completion_time': completion_time,
            'loading_time_minutes': int(depot['avg_loading_time_minutes']) + int(np.random.randint(-5, 10)),
            'travel_time_minutes': round(actual_travel_minutes, 1),
            'parking_time_minutes': parking_minutes,
            'service_time_minutes': actual_service_minutes,
            'is_late': is_late,
            'late_minutes': round(late_minutes, 1),
            'status': status,
            'priority': random.choice(['normal', 'high', 'urgent']),
            'cost_thb': round(distance_km * vehicle['cost_per_km'], 2),
            'traffic_level': round(traffic_factor, 2),
            'weather': random.choice(['clear', 'rain', 'cloudy']),
            'day_of_week': delivery_date.strftime('%A'),
            'hour_of_day': planned_departure.hour
        })
    
    return pd.DataFrame(deliveries)

def generate_gps_tracking(deliveries_df):
    """Generate GPS tracking points for deliveries"""
    gps_data = []
    
    # Sample 1000 deliveries for GPS tracking
    sample_deliveries = deliveries_df[deliveries_df['status'] == 'delivered'].sample(
        min(1000, len(deliveries_df))
    )
    
    for _, delivery in sample_deliveries.iterrows():
        # Generate 10-50 GPS points per delivery
        num_points = np.random.randint(10, 50)
        
        start_time = delivery['actual_departure']
        end_time = delivery['completion_time']
        time_diff = (end_time - start_time).total_seconds()
        
        for j in range(num_points):
            # Interpolate position (simplified)
            progress = j / num_points
            timestamp = start_time + timedelta(seconds=time_diff * progress)
            
            # Add some GPS noise
            lat_noise = np.random.normal(0, 0.001)
            lng_noise = np.random.normal(0, 0.001)
            
            # Speed varies
            speed_kmh = np.random.uniform(0, 60) if progress < 0.9 else np.random.uniform(0, 10)
            
            gps_data.append({
                'tracking_id': f'GPS_{len(gps_data)+1:07d}',
                'delivery_id': delivery['delivery_id'],
                'vehicle_id': delivery['vehicle_id'],
                'timestamp': timestamp,
                'latitude': 13.75 + lat_noise,  # Simplified
                'longitude': 100.55 + lng_noise,
                'speed_kmh': round(speed_kmh, 1),
                'heading': np.random.randint(0, 360),
                'accuracy_meters': np.random.uniform(5, 20)
            })
    
    return pd.DataFrame(gps_data)

def generate_pod_records(deliveries_df):
    """Generate Proof of Delivery records"""
    pod_data = []
    
    delivered = deliveries_df[deliveries_df['status'] == 'delivered']
    
    for _, delivery in delivered.iterrows():
        # Some deliveries have suspicious POD (for fraud detection training)
        is_suspicious = np.random.random() < 0.05
        
        pod_data.append({
            'pod_id': f'POD_{len(pod_data)+1:06d}',
            'delivery_id': delivery['delivery_id'],
            'photo_count': 0 if is_suspicious else np.random.randint(1, 4),
            'has_signature': not is_suspicious or np.random.random() > 0.5,
            'signature_quality_score': 0.3 if is_suspicious else np.random.uniform(0.7, 1.0),
            'gps_accuracy_meters': 100 if is_suspicious else np.random.uniform(5, 30),
            'timestamp': delivery['completion_time'],
            'notes': '' if np.random.random() > 0.2 else random.choice([
                'Left at reception', 'Delivered to security', 'Customer not available - left with neighbor'
            ]),
            'is_flagged_suspicious': is_suspicious
        })
    
    return pd.DataFrame(pod_data)

def main():
    """Generate all datasets"""
    print("🚀 Generating AI-TMS Historical Data...")
    
    output_dir = Path(__file__).parent.parent / 'historical'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate master data
    print("📊 Generating master data...")
    depots_df = generate_depots()
    vehicles_df = generate_vehicles()
    drivers_df = generate_drivers()
    customers_df = generate_customers()
    
    # Generate transactional data
    print("🚚 Generating delivery data...")
    deliveries_df = generate_deliveries(vehicles_df, drivers_df, customers_df, depots_df)
    
    print("📍 Generating GPS tracking data...")
    gps_df = generate_gps_tracking(deliveries_df)
    
    print("📸 Generating POD records...")
    pod_df = generate_pod_records(deliveries_df)
    
    # Save to CSV
    print("💾 Saving datasets...")
    depots_df.to_csv(output_dir / 'depots.csv', index=False)
    vehicles_df.to_csv(output_dir / 'vehicles.csv', index=False)
    drivers_df.to_csv(output_dir / 'drivers.csv', index=False)
    customers_df.to_csv(output_dir / 'customers.csv', index=False)
    deliveries_df.to_csv(output_dir / 'deliveries.csv', index=False)
    gps_df.to_csv(output_dir / 'gps_tracking.csv', index=False)
    pod_df.to_csv(output_dir / 'pod_records.csv', index=False)
    
    # Generate summary statistics
    print("\n✅ Data Generation Complete!")
    print(f"\n📈 Summary:")
    print(f"  - Depots: {len(depots_df)}")
    print(f"  - Vehicles: {len(vehicles_df)}")
    print(f"  - Drivers: {len(drivers_df)}")
    print(f"  - Customers: {len(customers_df)}")
    print(f"  - Deliveries: {len(deliveries_df)}")
    print(f"  - GPS Points: {len(gps_df)}")
    print(f"  - POD Records: {len(pod_df)}")
    
    # Calculate KPIs
    on_time_rate = (1 - deliveries_df['is_late'].mean()) * 100
    success_rate = (deliveries_df['status'] == 'delivered').mean() * 100
    avg_distance = deliveries_df['distance_km'].mean()
    avg_cost = deliveries_df['cost_thb'].mean()
    
    print(f"\n📊 KPIs from Historical Data:")
    print(f"  - On-time Rate: {on_time_rate:.1f}%")
    print(f"  - Success Rate: {success_rate:.1f}%")
    print(f"  - Avg Distance: {avg_distance:.1f} km")
    print(f"  - Avg Cost: {avg_cost:.1f} THB")
    print(f"  - Date Range: {deliveries_df['delivery_date'].min()} to {deliveries_df['delivery_date'].max()}")
    
    print(f"\n📁 Data saved to: {output_dir}")

if __name__ == '__main__':
    main()
