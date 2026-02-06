-- AI-TMS Database Initialization Script
-- PostgreSQL with PostGIS extension

-- Enable PostGIS extension for geo-spatial data
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'planner', 'dispatcher', 'driver', 'customer');
CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE driver_status AS ENUM ('active', 'on_leave', 'inactive');
CREATE TYPE order_status AS ENUM ('pending', 'planned', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled');
CREATE TYPE delivery_status AS ENUM ('pending', 'enroute', 'arrived', 'delivered', 'failed');
CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_timestamp ON gps_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_vehicle ON gps_tracking(vehicle_id);

-- Spatial indexes for geo queries
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_depots_location ON depots USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_location ON gps_tracking USING GIST(location);

COMMENT ON DATABASE ai_tms IS 'AI-Powered Transportation Management System Database';
